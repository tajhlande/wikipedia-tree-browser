#!/usr/bin/env python3
"""
Test script for the compute_missing_centroids functionality.
This script tests the assumption validation and basic functionality.
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


def create_test_database():
    """Create a temporary test database with sample data."""
    # Create a temporary database
    temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
    temp_db.close()

    conn = sqlite3.connect(temp_db.name)

    # Create the necessary tables
    ensure_tables(conn)

    # Insert some test data
    namespace = "test_namespace"

    # Create some cluster tree nodes
    # Node 1: Root node (no parent, has children, has centroid)
    root_node = ClusterTreeNode(
        namespace=namespace,
        node_id=1,
        depth=0,
        parent_id=None,
        child_count=2,
        doc_count=100,
        centroid=np.array([1.0, 2.0, 3.0])  # Root node should have centroid
    )
    insert_cluster_tree_node(conn, root_node)

    # Node 2: Child of root, leaf node (no children, missing centroid)
    leaf_node_1 = ClusterTreeNode(
        namespace=namespace,
        node_id=2,
        depth=1,
        parent_id=1,
        child_count=0,
        doc_count=50
    )
    insert_cluster_tree_node(conn, leaf_node_1)

    # Node 3: Child of root, leaf node (no children, missing centroid)
    leaf_node_2 = ClusterTreeNode(
        namespace=namespace,
        node_id=3,
        depth=1,
        parent_id=1,
        child_count=0,
        doc_count=30
    )
    insert_cluster_tree_node(conn, leaf_node_2)

    # Node 4: Non-leaf node with children (should NOT be missing centroid for our test)
    non_leaf_node = ClusterTreeNode(
        namespace=namespace,
        node_id=4,
        depth=1,
        parent_id=1,
        child_count=1,
        doc_count=20,
        centroid=np.array([1.0, 2.0, 3.0])  # Has centroid
    )
    insert_cluster_tree_node(conn, non_leaf_node)

    # Node 5: Child of node 4, leaf node (no children, missing centroid)
    leaf_node_3 = ClusterTreeNode(
        namespace=namespace,
        node_id=5,
        depth=2,
        parent_id=4,
        child_count=0,
        doc_count=10
    )
    insert_cluster_tree_node(conn, leaf_node_3)

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

    # Add some test pages for leaf_node_1 (node_id=2)
    for i in range(5):  # 5 test pages
        page_id = 1000 + i
        # Create a simple reduced vector (100 dimensions of random data)
        reduced_vector = np.random.rand(100).astype(np.float32)
        conn.execute(
            "INSERT INTO page_vector (namespace, page_id, reduced_vector, cluster_node_id) VALUES (?, ?, ?, ?)",
            (namespace, page_id, reduced_vector.tobytes(), 2)
        )

    # Add some test pages for leaf_node_2 (node_id=3)
    for i in range(3):  # 3 test pages
        page_id = 2000 + i
        reduced_vector = np.random.rand(100).astype(np.float32)
        conn.execute(
            "INSERT INTO page_vector (namespace, page_id, reduced_vector, cluster_node_id) VALUES (?, ?, ?, ?)",
            (namespace, page_id, reduced_vector.tobytes(), 3)
        )

    # Add some test pages for leaf_node_3 (node_id=5)
    for i in range(2):  # 2 test pages
        page_id = 3000 + i
        reduced_vector = np.random.rand(100).astype(np.float32)
        conn.execute(
            "INSERT INTO page_vector (namespace, page_id, reduced_vector, cluster_node_id) VALUES (?, ?, ?, ?)",
            (namespace, page_id, reduced_vector.tobytes(), 5)
        )

    conn.commit()

    return conn, temp_db.name, namespace


def test_assumption_validation():
    """Test that the assumption validation works correctly."""
    print("Testing assumption validation...")

    conn, db_path, namespace = create_test_database()

    try:
        # Test 1: Normal case - all missing centroid nodes should be leaf nodes
        nodes_missing = get_cluster_tree_nodes_missing_centroids(conn, namespace)
        print(f"Found {len(nodes_missing)} nodes missing centroids")

        # Get all nodes to check children
        cursor = conn.execute('SELECT node_id, child_count FROM cluster_tree WHERE namespace = ?', (namespace,))
        all_nodes = cursor.fetchall()
        nodes_with_children = set(node[0] for node in all_nodes if node[1] > 0)

        # Check if any missing centroid nodes have children
        violated_assumption = False
        for node in nodes_missing:
            if node.node_id in nodes_with_children:
                print(f"ASSUMPTION VIOLATED: Node {node.node_id} has children but is missing centroid")
                violated_assumption = True

        if not violated_assumption:
            print("✓ Assumption holds: All nodes missing centroids are leaf nodes")

        # Test 2: Try to compute centroids
        print("\nTesting centroid computation...")
        centroids_computed = compute_missing_centroids(conn, namespace)
        print(f"✓ Computed {centroids_computed} centroids")

        # Verify that centroids were actually computed
        nodes_still_missing = get_cluster_tree_nodes_missing_centroids(conn, namespace)
        print(f"✓ Nodes still missing centroids: {len(nodes_still_missing)}")

        # Test 3: Verify we can get the computed centroids
        for node in nodes_missing[:2]:  # Test first 2 nodes
            cursor = conn.execute(
                'SELECT centroid FROM cluster_tree WHERE namespace = ? AND node_id = ?',
                (namespace, node.node_id)
            )
            result = cursor.fetchone()
            if result[0] is not None:
                print(f"✓ Node {node.node_id} now has a centroid")
            else:
                print(f"✗ Node {node.node_id} still missing centroid")

        print("\nAll tests passed!")

    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        os.unlink(db_path)


def test_error_case():
    """Test the error case where a non-leaf node is missing a centroid."""
    print("\nTesting error case (non-leaf node missing centroid)...")

    conn, db_path, namespace = create_test_database()

    try:
        # Manually create a non-leaf node that's missing a centroid (violate the assumption)
        conn.execute(
            "UPDATE cluster_tree SET centroid = NULL, child_count = 1 WHERE namespace = ? AND node_id = 4",
            (namespace,)
        )
        conn.commit()

        # This should raise an exception
        try:
            compute_missing_centroids(conn, namespace)
            print("✗ Expected exception was not raised!")
        except ValueError as e:
            if "Assumption violated" in str(e):
                print("✓ Correctly detected assumption violation")
            else:
                print(f"✗ Wrong exception: {e}")

    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        os.unlink(db_path)


if __name__ == "__main__":
    print("Running tests for compute_missing_centroids functionality...")
    test_assumption_validation()
    test_error_case()
    print("\nAll tests completed!")
