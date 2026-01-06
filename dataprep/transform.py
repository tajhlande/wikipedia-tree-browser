"""Dimensionality reduction and clustering utilities.

This module implements the three major steps described in
`.roo/dimensionality_processing_plan.md`:

1. **PCA** - reduce the original 2048-dimensional embedding vectors to a
   configurable target dimension (default 100).
2. **K-Means** - cluster the PCA-reduced vectors.
3. **UMAP** - map each cluster to a 3-D space for visualisation.

All heavy-lifting is delegated to scikit-learn and umap-learn. The functions
operate directly on the SQLite database via the helper utilities defined in
``database.py``.
"""

from __future__ import annotations

import logging
import math
from typing import Iterable, Optional

import sqlite3
import numpy as np
from numpy.typing import NDArray

from classes import ClusterTreeNode
from database import (
    get_cluster_tree_nodes_needing_projection,
    update_cluster_tree_assignments,
    update_reduced_vectors_in_batch,
    update_three_d_vectors_in_batch,
    insert_cluster_tree_node,
    update_cluster_tree_child_count,
    get_cluster_tree_max_node_id,
    get_page_reduced_vectors,
    numpy_to_bytes,
    bytes_to_numpy,
    get_cluster_tree_nodes_missing_centroids
)
from progress_utils import ProgressTracker

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
numba_logger = logging.getLogger("numba.core")
numba_logger.setLevel(logging.WARNING)

# we are logging here because these import statements are sooooo slooooow
logger.info("Initializing scikit-learn...")
from sklearn.decomposition import IncrementalPCA  # noqa E402
from sklearn.cluster import MiniBatchKMeans  # noqa E402
from sklearn.metrics import silhouette_score  # noqa E402
from sklearn.decomposition import PCA  # noqa E402
import umap.umap_ as umap  # noqa E402

logger = logging.getLogger(__name__)


def _batch_iterator(
    sqlconn: sqlite3.Connection,
    namespace: str,
    columns: list[str],
    batch_size: int = 10_000,
) -> Iterable[list[dict]]:
    """Yield batches of rows without re-querying or using OFFSET."""
    sql = f"""
        SELECT page_id, {', '.join(columns)}
        FROM page_vector
        WHERE namespace = :namespace
        {''.join([f"AND {column} IS NOT NULL " for column in columns])}
        ORDER BY page_id ASC;
    """
    logger.debug("SQL query: %s", sql)
    cursor = sqlconn.execute(sql, {'namespace': namespace})

    while True:
        rows = cursor.fetchmany(batch_size)
        if not rows:
            break

        batch = [
            {"page_id": row["page_id"], **{col: row[col] for col in columns}}
            for row in rows
        ]
        yield batch


def run_pca(
    sqlconn: sqlite3.Connection,
    namespace: str,
    target_dim: int = 100,
    batch_size: int = 10_000,
    tracker: Optional[ProgressTracker] = None,
) -> tuple[int, int]:
    """
    Fit Incremental PCA on all ``embedding_vector`` blobs and store the result.

    The function streams data in batches to keep memory usage low. After fitting,
    it performs a second pass to transform each vector and stores the reduced
    representation in ``page_vector.reduced_vector``.

    Returns a tuple of the total batch count and the total vector count.
    """
    # logger.info("Starting Incremental PCA (target_dim=%s)", target_dim)

    # Ensure batch_size is at least target_dim for the first partial_fit call
    effective_batch_size = max(batch_size, target_dim)
    # logger.info("Using effective batch size: %s (requested: %s, target_dim: %s)",
    #             effective_batch_size, batch_size, target_dim)

    # First pass - fit
    ipca = IncrementalPCA(n_components=target_dim)
    batch_counter = 0
    total_vectors = 0

    logger.debug("First pass: stacking vectors in matrix")
    for batch in _batch_iterator(sqlconn, namespace, ["embedding_vector"], effective_batch_size):
        # Decode all embeddings into a single matrix efficiently
        batch_matrix = np.frombuffer(b"".join(row["embedding_vector"] for row in batch), dtype=np.float32)
        batch_matrix = batch_matrix.reshape(len(batch), 2048)

        ipca.partial_fit(batch_matrix)
        tracker.update(1) if tracker else None
        batch_counter += 1
        total_vectors += len(batch)

    logger.debug("Second pass: transforming and storing vectors in matrix")

    for batch in _batch_iterator(sqlconn, namespace, ["embedding_vector"], batch_size):
        # Decode the whole batch into one 2D array efficiently
        logger.debug("Creating batch matrix")
        batch_matrix = np.frombuffer(
            b"".join(row["embedding_vector"] for row in batch),
            dtype=np.float32,
        ).reshape(len(batch), -1)

        # Apply PCA transform once per batch (vectorized)
        logger.debug("Applying PCA transform to batch")
        reduced = ipca.transform(batch_matrix).astype(np.float32)

        # Convert all reduced vectors to bytes in one go
        logger.debug("Converting reduced vectors to bytes")
        reduced_bytes = [r.tobytes() for r in reduced]
        page_ids = [row["page_id"] for row in batch]

        # Combine for DB update
        logger.debug("Zipping list for database update")
        vectors_and_pages = list(zip(reduced_bytes, page_ids))
        logger.debug("Invoking update_reduced_vectors_in_batch")
        update_reduced_vectors_in_batch(namespace, vectors_and_pages, sqlconn)

        tracker.update(1) if tracker else None

    # logger.info("PCA completed and reduced vectors stored.")
    logger.debug("Done with PCA")
    return batch_counter, total_vectors


def run_pca_per_cluster(
    sqlconn: sqlite3.Connection,
    namespace: str,
    n_components: int = 3,
    batch_size: int = 15000,
    limit: Optional[int] = None,
    tracker: Optional[ProgressTracker] = None,
) -> int:
    """Apply PCA within each cluster tree node and store 3-D vectors.

    ``limit`` caps the number of cluster nodes processed (useful for quick tests).
    Returns the number of cluster nodes actually processed.
    """
    # logger.info(
    #     "Running PCA per cluster node (n_components=%s, limit=%s)", n_components, limit
    # )
    # Determine distinct cluster tree nodes that need projection
    # logger.info("Fetching page vectors needing projection")
    reduced_page_vectors = get_cluster_tree_nodes_needing_projection(sqlconn, namespace, limit)

    total_vectors = len(reduced_page_vectors)

    # logger.info("Grouping page vectors by clusters")
    cluster_map: dict[int, list[tuple[int, Optional[NDArray]]]] = dict()
    for page_vector in reduced_page_vectors:
        if page_vector[0] not in cluster_map:
            cluster_map[page_vector[0]] = []
        cluster_map[page_vector[0]].append((page_vector[1], page_vector[2]))

    tracker.set_total(total_vectors) if tracker else None

    # Accumulate updates across all clusters for better batch performance
    all_updates = []
    processed = 0

    for _, batch in cluster_map.items():

        page_ids = [r[0] for r in batch]
        # vectors = np.vstack(
        #     [np.frombuffer(r[1], dtype=np.float32) for r in page_id_and_reduced_vectors]
        # )
        vectors = np.vstack([vec for _, vec in batch if vec is not None])

        # Apply PCA to reduce to target dimensionality
        # Handle the case where we have fewer features than target dimensions
        if vectors.shape[1] < n_components:
            # If we have fewer features than target dimensions, pad with zeros
            three_space_vectors = np.zeros((len(page_ids), n_components), dtype=np.float32)
            # Copy the available features
            three_space_vectors[:, :vectors.shape[1]] = vectors[:, :n_components]
        else:
            # Use PCA for small clusters
            try:
                # t0 = time.perf_counter()
                pca = PCA(n_components=n_components)
                # t1 = time.perf_counter()
                three_space_vectors = pca.fit_transform(vectors)
                # t2 = time.perf_counter()
                # logger.info(f"PCA time: {t2 - t0:.4f}s for {len(vectors)} vectors
                # (Object create: {t1 - t0:.4f}, fit_transform: {t2-t1:.4f})")
            except ValueError:  # as e:
                # Fallback to zero-padding if PCA fails (shouldn't happen, but be safe)
                # logger.warning(f"PCA failed for cluster with {len(page_ids)} pages: {e}. Using zero-padding.")
                three_space_vectors = np.zeros((len(page_ids), n_components), dtype=np.float32)
                three_space_vectors[:, :vectors.shape[1]] = vectors[:, :n_components]

        # t0 = time.perf_counter()
        three_space_vectors = three_space_vectors.astype(np.float32)
        # t1 = time.perf_counter()
        # logger.info(f"vector astype float32 time: {t1 - t0:.4f}s")

        # Accumulate updates for batch processing
        # t0 = time.perf_counter()
        updates = [(pid, vec) for pid, vec in zip(page_ids, three_space_vectors)]
        all_updates.extend(updates)
        # t1 = time.perf_counter()
        # logger.info(f"updates repacking time: {t1 - t0:.4f}s")

        while len(all_updates) >= batch_size:
            db_batch = all_updates[:batch_size]
            # logger.debug("Writing batch of %d to database", len(batch))
            update_three_d_vectors_in_batch(namespace, db_batch, sqlconn)
            all_updates = all_updates[len(db_batch):]

        # Update progress tracker
        tracker.update(len(batch)) if tracker else None
        processed += 1

    # Store all 3-D vectors in batch for better performance
    if all_updates:
        while len(all_updates) > 0:
            db_batch = all_updates[:batch_size]
            # logger.debug("Writing batch of %d to database", len(batch))
            update_three_d_vectors_in_batch(namespace, db_batch, sqlconn)
            all_updates = all_updates[len(db_batch):]

    # Update centroid in cluster_tree.
    # centroid = three_space_vectors.mean(axis=0).tolist()

    sqlconn.commit()
    # logger.info("PCA mapping completed for %s cluster nodes.", processed)
    return processed


# def run_umap_per_cluster(
#     sqlconn: sqlite3.Connection,
#     namespace: str,
#     n_components: int = 3,
#     batch_size: int = 1000,
#     limit: Optional[int] = None,
#     tracker: Optional[ProgressTracker] = None,
# ) -> int:
#     """Apply UMAP within each cluster tree node and store 3-D vectors using thread pool.

#     ``limit`` caps the number of cluster nodes processed (useful for quick tests).
#     Returns the number of cluster nodes actually processed.
#     """
#     # logger.info(
#     #     "Running UMAP per cluster node (n_components=%s, limit=%s)", n_components, limit
#     # )
#     # Determine distinct cluster tree nodes that need projection
#     node_ids_and_sizes = get_cluster_tree_nodes_needing_projection(sqlconn, namespace, limit)

#     total_vectors = sum([node[1] for node in node_ids_and_sizes])
#     tracker.set_total(total_vectors) if tracker else None

#     # Accumulate updates across all clusters for better batch performance
#     all_updates = []
#     processed = 0

#     for node_id, node_size in node_ids_and_sizes:
#         # Gather all reduced vectors for this cluster node.
#         page_id_and_reduced_vectors = get_reduced_vectors_for_cluster_node(sqlconn, namespace, node_id)

#         page_ids = [r[0] for r in page_id_and_reduced_vectors]
#         vectors = np.vstack(
#             [np.frombuffer(r[1], dtype=np.float32) for r in page_id_and_reduced_vectors]
#         )

#         # Optimized UMAP processing based on cluster size
#         if len(page_ids) <= 5:
#             # For very small clusters (2-5 points), use a simple approach
#             # Handle the case where we have fewer features than target dimensions
#             if vectors.shape[1] < n_components:
#                 # If we have fewer features than target dimensions, pad with zeros
#                 three_space_vectors = np.zeros((len(page_ids), n_components), dtype=np.float32)
#                 # Copy the available features
#                 three_space_vectors[:, :vectors.shape[1]] = vectors[:, :n_components]
#             else:
#                 # Otherwise use PCA - it's much faster than UMAP for tiny clusters
#                 try:
#                     pca = PCA(n_components=n_components, random_state=42)
#                     three_space_vectors = pca.fit_transform(vectors)
#                 except ValueError as e:
#                     # Fallback to zero-padding if PCA fails (shouldn't happen, but be safe)
#                     logger.warning(f"PCA failed for cluster with {len(page_ids)} pages: {e}. Using zero-padding.")
#                     three_space_vectors = np.zeros((len(page_ids), n_components), dtype=np.float32)
#                     three_space_vectors[:, :vectors.shape[1]] = vectors[:, :n_components]
#         else:
#             # For larger clusters, use UMAP with optimized parameters
#             three_space_vectors = _optimized_umap_projection(vectors, n_components, len(page_ids))

#         three_space_vectors = three_space_vectors.astype(np.float32)

#         # Accumulate updates for batch processing
#         updates = [(pid, vec) for pid, vec in zip(page_ids, three_space_vectors)]
#         all_updates.extend(updates)

#         while len(all_updates) >= batch_size:
#             batch = all_updates[:batch_size]
#             # logger.debug("Writing batch of %d to database", len(batch))
#             update_three_d_vectors_in_batch(namespace, batch, sqlconn)
#             all_updates = all_updates[len(batch):]

#         # Update progress tracker
#         tracker.update(node_size) if tracker else None
#         processed += 1

#     # Store all 3-D vectors in batch for better performance
#     if all_updates:
#         while len(all_updates) > 0:
#             batch = all_updates[:batch_size]
#             # logger.debug("Writing batch of %d to database", len(batch))
#             update_three_d_vectors_in_batch(namespace, batch, sqlconn)
#             all_updates = all_updates[len(batch):]

#     # Update centroid in cluster_tree.
#     # centroid = three_space_vectors.mean(axis=0).tolist()

#     sqlconn.commit()
#     # logger.info("UMAP mapping completed for %s cluster nodes.", processed)
#     return processed


def _optimized_umap_projection(vectors: NDArray, n_components: int = 3, cluster_size: int = 50) -> NDArray:
    """Optimized UMAP projection with parameters tuned for speed and quality."""
    # Calculate optimal n_neighbors based on cluster size
    # Use a formula that balances local structure preservation with computational efficiency
    if cluster_size <= 10:
        n_neighbors = max(2, cluster_size - 1)  # Very small clusters
    elif cluster_size <= 50:
        n_neighbors = min(10, cluster_size - 1)  # Small to medium clusters
    else:
        n_neighbors = min(30, cluster_size - 1)  # Large clusters

    # Use faster UMAP parameters for better performance
    # - n_jobs=1: Single thread is faster for typical cluster sizes due to overhead
    # - verbose=False: Suppress output
    # - init='random': Faster than 'spectral' for our use case
    # - min_dist=0.0: Original value that works well
    reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=n_neighbors,
        random_state=42,
        min_dist=0.0,
        metric='cosine',
        init='spectral',
        verbose=False,
        low_memory=True,
        n_jobs=1  # Single thread avoids parallel overhead
    )

    return reducer.fit_transform(vectors)  # type: ignore


def _simple_geometric_projection(vectors: NDArray, n_components: int = 3) -> NDArray:
    """Simple geometric projection for very small clusters (2-3 points).

    This is much faster than UMAP and gives reasonable results for tiny clusters.
    """
    if vectors.shape[0] == 2:
        # For 2 points, just place them on a line in 3D space
        result = np.zeros((2, n_components), dtype=np.float32)
        result[0, 0] = -1.0  # First point at (-1, 0, 0)
        result[1, 0] = 1.0   # Second point at (1, 0, 0)
        return result
    elif vectors.shape[0] == 3:
        # For 3 points, create a simple triangle in 3D space
        result = np.zeros((3, n_components), dtype=np.float32)
        result[0, 0] = -1.0  # First point
        result[1, 0] = 1.0   # Second point
        result[2, 1] = 1.0   # Third point (different axis)
        return result
    else:
        # Shouldn't happen, but fallback to PCA if it does
        logger.warning("Falling back to PCA")
        from sklearn.decomposition import PCA
        pca = PCA(n_components=n_components)
        return pca.fit_transform(vectors)


def fast_silhouette_score(X, labels, metric='cosine', sample_size=10000):
    if len(X) > sample_size:
        idx = np.random.choice(len(X), sample_size, replace=False)
        X_sample = X[idx]
        labels_sample = np.array(labels)[idx]
    else:
        X_sample = X
        labels_sample = labels
    return silhouette_score(X_sample, labels_sample, metric=metric)


def run_recursive_clustering(
    sqlconn: sqlite3.Connection,
    namespace: str,
    leaf_target: int = 50,
    max_k: int = 50,
    max_depth: int = 10,
    min_silhouette_threshold: float = 0.1,
    batch_size: int = 10_000,
    tracker: Optional[ProgressTracker] = None,
) -> int:
    """Run recursive clustering algorithm to build a tree of clusters.

    Args:
        sqlconn: SQLite database connection
        namespace: Namespace to process
        leaf_target: Target number of documents per leaf cluster
        max_k: Maximum number of clusters to create at each level
        max_depth: Maximum depth for recursion
        min_silhouette_threshold: Minimum silhouette score to continue clustering
        batch_size: Batch size for processing
        tracker: Optional progress tracker

    Returns:
        Total number of nodes created in the cluster tree
    """
    logger.debug("Starting recursive clustering with leaf_target=%s, max_k=%s, max_depth=%s",
                 leaf_target, max_k, max_depth)

    # Get total document count for the namespace
    pages_and_vectors = list(get_page_reduced_vectors(sqlconn=sqlconn, namespace=namespace))
    doc_count = len(pages_and_vectors)
    if doc_count == 0:
        logger.warning("No reduced vectors for clustering found")
        return 0

    if doc_count < max_k:
        logger.warning(f"Only found {len(pages_and_vectors)} reduced vectors, below max_k: {max_k}")
        return 0
    page_ids = [item[0] for item in pages_and_vectors]
    page_vectors = np.array([item[1] for item in pages_and_vectors])

    # Start with root node containing all documents
    root_node_id = get_cluster_tree_max_node_id(sqlconn) + 1
    logger.debug("Creating root node with ID %s", root_node_id)

    # Insert root node
    node = ClusterTreeNode(
        namespace=namespace,
        node_id=root_node_id,
        depth=0,
        doc_count=doc_count
    )
    inserted_node_id = insert_cluster_tree_node(sqlconn=sqlconn, node=node)
    logger.debug("Inserted node ID: %d", inserted_node_id)
    assert root_node_id == inserted_node_id

    # Start recursive clustering from root
    nodes_processed = _recursive_cluster_node(
        sqlconn=sqlconn,
        namespace=namespace,
        page_ids=page_ids,
        page_vectors=page_vectors,
        node_id=root_node_id,
        parent_id=None,
        depth=0,
        doc_count=doc_count,
        leaf_target=leaf_target,
        max_k=max_k,
        max_depth=max_depth,
        min_silhouette_threshold=min_silhouette_threshold,
        batch_size=batch_size,
        tracker=tracker
    )

    logger.debug("Recursive clustering completed. Total nodes processed: %s", nodes_processed)
    return nodes_processed


def _recursive_cluster_node(
    sqlconn: sqlite3.Connection,
    namespace: str,
    page_ids: list[int],
    page_vectors: NDArray,
    node_id: int,
    parent_id: Optional[int],
    depth: int,
    doc_count: int,
    leaf_target: int,
    max_k: int,
    max_depth: int,
    min_silhouette_threshold: float,
    batch_size: int,
    tracker: Optional[ProgressTracker] = None,
) -> int:
    """Recursively cluster a single node.

    Args:
        sqlconn: SQLite database connection
        namespace: Namespace to process
        node_id: Current node ID
        parent_id: Parent node ID
        depth: Current depth in the tree
        doc_count: Number of documents in this node
        leaf_target: Target number of documents per leaf cluster
        max_k: Maximum number of clusters to create at each level
        max_depth: Maximum depth for recursion
        min_silhouette_threshold: Minimum silhouette score to continue clustering
        batch_size: Batch size for processing
        tracker: Optional progress tracker

    Returns:
        Number of nodes processed (including this one)
    """
    logger.debug("Processing node %s at depth %s with %s documents", node_id, depth, doc_count)

    # Check stopping conditions
    if (doc_count <= leaf_target or
            depth >= max_depth):
        logger.debug("Node %s is a leaf (doc_count=%s, depth=%s)", node_id, doc_count, depth)
        return 1

    logger.debug("Processing %s vectors for node %s", len(page_vectors), node_id)

    # Calculate k for this node
    k = min(max_k, math.ceil(doc_count / leaf_target))
    logger.debug("Node %s: k=%s (doc_count=%s, leaf_target=%s, max_k=%s)",
                 node_id, k, doc_count, leaf_target, max_k)

    if k <= 1:
        logger.debug("Node %s cannot be split further (k=%s)", node_id, k)
        return 1

    # Perform clustering
    logger.debug("Calculating mini batch k-means for node %d", node_id)
    kmeans = MiniBatchKMeans(n_clusters=k,
                             random_state=42,
                             batch_size=batch_size,
                             max_iter=50,
                             n_init=1,
                             reassignment_ratio=0.01)
    cluster_labels = kmeans.fit_predict(page_vectors)

    # Calculate silhouette score to evaluate clustering quality
    try:
        logger.debug("Calculating silhouette score for node %d", node_id)
        silhouette_avg = fast_silhouette_score(page_vectors, cluster_labels, metric='cosine')
        logger.debug("Node %s silhouette score: %s", node_id, silhouette_avg)

        # Update node centroid
        logger.debug("Updating centroid for node %d", node_id)
        centroid = kmeans.cluster_centers_.mean(axis=0)
        centroid_blob = numpy_to_bytes(centroid)
        sqlconn.execute(
            "UPDATE cluster_tree SET centroid = ? WHERE node_id = ?",
            (centroid_blob, node_id)
        )

        if silhouette_avg < min_silhouette_threshold:
            logger.debug("Node %s has poor clustering quality (silhouette=%s < %s), stopping recursion",
                         node_id, silhouette_avg, min_silhouette_threshold)
            return 1
    except Exception as e:
        logger.warning("Could not calculate silhouette score for node %s: %s", node_id, e)
        silhouette_avg = 0.0

    # Process each child cluster
    child_nodes_processed = 0
    descendant_nodes_processed = 0

    for cluster_id in range(k):
        # Get documents belonging to this cluster
        cluster_mask = cluster_labels == cluster_id
        cluster_page_ids = [page_ids[i] for i in range(len(page_ids)) if cluster_mask[i]]
        cluster_vectors = page_vectors[cluster_mask]

        cluster_size = len(cluster_page_ids)

        logger.debug("Subcluster %d:%d has %s documents", node_id, cluster_id, cluster_size)

        if cluster_size == 0:
            continue

        # Create child node
        child_node_id = get_cluster_tree_max_node_id(sqlconn) + 1

        # Insert child node
        child_node = ClusterTreeNode(
            namespace=namespace,
            node_id=child_node_id,
            parent_id=node_id,
            depth=depth + 1,
            doc_count=cluster_size,
            sample_doc_ids=cluster_page_ids[:10]  # Sample first 10 doc IDs
        )
        inserted_node_id = insert_cluster_tree_node(sqlconn=sqlconn, node=child_node)
        child_nodes_processed += 1
        descendant_nodes_processed += 1
        logger.debug("Max node + 1: %d, inserted node id: %d", child_node_id, inserted_node_id)
        assert child_node_id == inserted_node_id

        # Recursively process child node
        recursive_descendant_nodes_processed = _recursive_cluster_node(
            sqlconn=sqlconn,
            namespace=namespace,
            page_ids=cluster_page_ids,
            page_vectors=cluster_vectors,
            node_id=child_node_id,
            parent_id=node_id,
            depth=depth + 1,
            doc_count=cluster_size,
            leaf_target=leaf_target,
            max_k=max_k,
            max_depth=max_depth,
            min_silhouette_threshold=min_silhouette_threshold,
            batch_size=batch_size,
            tracker=tracker
        )
        descendant_nodes_processed += recursive_descendant_nodes_processed

        # if child was a leaf, assign the pages to it
        if recursive_descendant_nodes_processed == 1:
            logger.debug("Processing node %d as a leaf node, adding %d pages", child_node.node_id,
                         len(cluster_page_ids))
            update_cluster_tree_assignments(sqlconn, namespace, child_node.node_id, cluster_page_ids)

    # Update child count for parent node
    update_cluster_tree_child_count(namespace, node_id, child_nodes_processed, sqlconn)

    # Update progress tracker
    if tracker:
        tracker.update(1)

    # Return total nodes processed (1 for this node + all child nodes)
    return descendant_nodes_processed


def compute_missing_centroids(
    sqlconn: sqlite3.Connection,
    namespace: str,
    tracker: Optional[ProgressTracker] = None,
) -> int:
    """
    Find all cluster_tree nodes missing centroids and compute them as the mean of reduced vectors.

    This function tests the assumption that nodes missing centroids are leaf nodes (nodes with no children).
    If this assumption is violated, the function will fail.

    Args:
        sqlconn: SQLite database connection
        namespace: Namespace to process
        tracker: Optional progress tracker

    Returns:
        Number of centroids computed
    """
    logger.info("Starting computation of missing centroids for namespace %s", namespace)

    # Get all cluster tree nodes missing centroids
    nodes_missing_centroids = get_cluster_tree_nodes_missing_centroids(sqlconn, namespace)

    if not nodes_missing_centroids:
        logger.info("No cluster tree nodes missing centroids found in namespace %s", namespace)
        return 0
    if tracker:
        tracker.set_total(len(nodes_missing_centroids))

    logger.info("Found %d cluster tree nodes missing centroids in namespace %s",
                len(nodes_missing_centroids), namespace)

    # Get all cluster tree nodes to determine which ones have children
    # We need to check if our assumption holds: nodes missing centroids should be leaf nodes
    all_nodes_sql = """
        SELECT node_id, parent_id, child_count
        FROM cluster_tree
        WHERE namespace = ?
    """
    cursor = sqlconn.execute(all_nodes_sql, (namespace,))
    all_nodes = cursor.fetchall()

    # Create a set of node_ids that have children (non-leaf nodes)
    nodes_with_children = set()
    for node in all_nodes:
        if node[2] > 0:  # child_count > 0
            nodes_with_children.add(node[0])

    # Test our assumption: nodes missing centroids should be leaf nodes
    for node in nodes_missing_centroids:
        if node.node_id in nodes_with_children:
            error_msg = (f"Assumption violated: Node {node.node_id} is missing a centroid but has children. "
                         f"This function only works for leaf nodes (nodes with no children).")
            logger.error(error_msg)
            raise ValueError(error_msg)

    logger.info("Assumption validated: All nodes missing centroids are leaf nodes")

    # OPTIMIZED: Load ALL page vectors for ALL missing centroid nodes in a single query
    logger.debug("Loading all page vectors for nodes missing centroids")
    all_vectors_sql = """
        SELECT pv.page_id, pv.reduced_vector, pv.cluster_node_id
        FROM page_vector pv
        JOIN cluster_tree ct ON pv.namespace = ct.namespace AND pv.cluster_node_id = ct.node_id
        WHERE pv.namespace = ? AND ct.centroid IS NULL AND pv.reduced_vector IS NOT NULL
    """
    cursor = sqlconn.execute(all_vectors_sql, (namespace,))

    # Group vectors by node_id
    from collections import defaultdict
    node_vectors = defaultdict(list)
    node_page_counts = defaultdict(int)

    for page_id, vector_blob, node_id in cursor.fetchall():
        vector = bytes_to_numpy(vector_blob)
        node_vectors[node_id].append(vector)
        node_page_counts[node_id] += 1

    logger.debug("Loaded vectors for %d nodes", len(node_vectors))

    # Compute centroids for all nodes at once
    centroid_updates = []
    centroids_computed = 0

    # Create a set of node_ids that we actually found vectors for
    nodes_with_vectors = set(node_vectors.keys())

    for node in nodes_missing_centroids:
        if node.node_id in nodes_with_vectors:
            vectors = node_vectors[node.node_id]
            if vectors:  # Should always be true, but be safe
                # Compute centroid as the mean of all vectors
                centroid = np.array(vectors).mean(axis=0)
                centroid_blob = numpy_to_bytes(centroid)
                centroid_updates.append((centroid_blob, namespace, node.node_id))
                # logger.debug("Computed centroid for node %d with %d pages",
                #            node.node_id, node_page_counts[node.node_id])
                centroids_computed += 1
            else:
                logger.warning("Node %d has no pages with reduced vectors", node.node_id)
        else:
            logger.warning("Node %d has no pages with reduced vectors", node.node_id)

        # Update progress tracker
        if tracker:
            tracker.update(1)

    # Execute all updates in a single batch
    logger.debug("Batch updating centroids for %d nodes", len(centroid_updates))
    if centroid_updates:
        cursor = sqlconn.cursor()
        cursor.executemany(
            "UPDATE cluster_tree SET centroid = ? WHERE namespace = ? AND node_id = ?",
            centroid_updates
        )
        logger.debug("Executed batch update for %d nodes", len(centroid_updates))

    sqlconn.commit()

    logger.info("Completed computation of %d missing centroids for namespace %s",
                centroids_computed, namespace)

    return centroids_computed
