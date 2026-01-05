#!/usr/bin/env python3
"""
Test script to verify batch processing in compute_missing_centroids.
"""

import sqlite3
import tempfile
import os
import numpy as np
from classes import ClusterTreeNode
from database import (
    ensure_tables,
    get_cluster_tree_nodes_missing_centroids,
    insert_cluster_tree_node
)
from transform import compute_missing_centroids


def create_large_test_database():
    """Create a test database with many nodes to test batch processing."""
    # Create a temporary database
    temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
    temp_db.close()

    conn = sqlite3.connect(temp_db.name)

    # Create the necessary tables
    ensure_tables(conn)

    # Insert some test data
    namespace = "test_namespace"

    # Create root node with centroid
    root_node = ClusterTreeNode(
        namespace=namespace,
        node_id=1,
        depth=0,
        parent_id=None,
        child_count=200,
        doc_count=1000,
        centroid=np.array([1.0, 2.0, 3.0])
    )
    insert_cluster_tree_node(conn, root_node)

    # Create 200 leaf nodes missing centroids
    for i in range(2, 202):  # node_ids 2-201
        leaf_node = ClusterTreeNode(
            namespace=namespace,
            node_id=i,
            depth=1,
            parent_id=1,
            child_count=0,
            doc_count=5
        )
        insert_cluster_tree_node(conn, leaf_node)

    # Create page_vector entries for the leaf nodes
    conn.execute("""
        CREATE TABLE IF NOT EXISTS page_vector (
            namespace TEXT NOT NULL,
            page_id INTEGER NOT NULL,
            embedding_vector BLOB,
            reduced_vector BLOB,
            cluster_id INTEGER,
            cluster_node_id INTEGER,
            three_d_vector TEXT,
            PRIMARY KEY (namespace, page_id)
        )
    """)

    # Add some test pages for each leaf node
    page_id_counter = 1000
    for node_id in range(2, 202):  # node_ids 2-201
        for j in range(3):  # 3 test pages per node
            page_id = page_id_counter
            page_id_counter += 1
            # Create a simple reduced vector (100 dimensions of random data)
            reduced_vector = np.random.rand(100).astype(np.float32)
            conn.execute(
                "INSERT INTO page_vector (namespace, page_id, reduced_vector, cluster_node_id) VALUES (?, ?, ?, ?)",
                (namespace, page_id, reduced_vector.tobytes(), node_id)
            )

    conn.commit()

    return conn, temp_db.name, namespace


def test_batch_processing():
    """Test that batch processing works correctly with many nodes."""
    print("Testing batch processing with 200 nodes...")

    conn, db_path, namespace = create_large_test_database()

    try:
        # Verify we have the expected number of nodes missing centroids
        nodes_missing = get_cluster_tree_nodes_missing_centroids(conn, namespace)
        print(f"Found {len(nodes_missing)} nodes missing centroids")

        if len(nodes_missing) != 200:
            print(f"✗ Expected 200 nodes, found {len(nodes_missing)}")
            return

        # Test the batch processing
        print("Computing centroids with batch processing...")
        centroids_computed = compute_missing_centroids(conn, namespace)
        print(f"✓ Computed {centroids_computed} centroids")

        # Verify that all centroids were computed
        nodes_still_missing = get_cluster_tree_nodes_missing_centroids(conn, namespace)
        print(f"✓ Nodes still missing centroids: {len(nodes_still_missing)}")

        if len(nodes_still_missing) == 0:
            print("✓ All centroids computed successfully")
        else:
            print(f"✗ Expected 0 nodes missing centroids, found {len(nodes_still_missing)}")

        # Verify a few random nodes have centroids
        test_node_ids = [2, 50, 100, 150, 200]
        for node_id in test_node_ids:
            cursor = conn.execute(
                'SELECT centroid FROM cluster_tree WHERE namespace = ? AND node_id = ?',
                (namespace, node_id)
            )
            result = cursor.fetchone()
            if result[0] is not None:
                print(f"✓ Node {node_id} has a centroid")
            else:
                print(f"✗ Node {node_id} still missing centroid")

        print("Batch processing test completed successfully!")

    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        os.unlink(db_path)


if __name__ == "__main__":
    print("Running batch processing test...")
    test_batch_processing()
    print("\nBatch processing test completed!")
