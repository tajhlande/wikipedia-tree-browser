#!/usr/bin/env python3
"""Test the new cluster tree projection functionality."""

import sqlite3
import numpy as np
from transform import run_umap_per_cluster
from database import (
    ensure_tables,
    insert_cluster_tree_node,
    update_cluster_tree_assignments
)
from classes import ClusterTreeNode


def test_cluster_tree_projection():
    """Test the new cluster tree projection functionality."""
    print("Testing cluster tree projection...")
    
    # Create a test database with proper schema
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    
    # Ensure tables are created with proper schema
    ensure_tables(conn)
    
    namespace = "test_namespace"
    chunk_name = "test_chunk"
    
    # Insert chunk info
    conn.execute(
        "INSERT INTO chunk_log (chunk_name, namespace) VALUES (?, ?)",
        (chunk_name, namespace),
    )
    
    # Insert some test data - create 100 vectors of 100 dimensions each (reduced vectors)
    page_ids = []
    for i in range(100):
        vector = np.random.randn(100).astype(np.float32)  # 100-dimensional reduced vector
        conn.execute(
            "INSERT INTO page_log (namespace, page_id, chunk_name) VALUES (?, ?, ?)",
            (namespace, i, chunk_name)
        )
        conn.execute(
            "INSERT INTO page_vector (namespace, page_id, reduced_vector) VALUES (?, ?, ?)",
            (namespace, i, vector.tobytes()),
        )
        page_ids.append(i)
    
    # Create a cluster tree node
    node = ClusterTreeNode(
        namespace=namespace,
        node_id=1,
        depth=0,
        doc_count=100
    )
    insert_cluster_tree_node(conn, node)
    
    # Assign pages to the cluster node
    update_cluster_tree_assignments(conn, namespace, node.node_id, page_ids)
    
    conn.commit()
    
    # Test the run_umap_per_cluster function with cluster tree nodes
    try:
        processed_count = run_umap_per_cluster(
            conn, namespace, n_components=3, limit=1
        )
        print(f"Success! Processed {processed_count} cluster nodes")
        
        # Verify that 3D vectors were stored
        cursor = conn.execute(
            "SELECT COUNT(*) as count FROM page_vector WHERE three_d_vector IS NOT NULL"
        )
        result = cursor.fetchone()
        print(f'3D vectors stored: {result["count"]}')
        
        # Verify that all pages got 3D vectors
        assert result["count"] == 100, f"Expected 100 3D vectors, got {result['count']}"
        
        print("✓ Cluster tree projection test passed!")
        
    except Exception as e:
        print(f'✗ Error: {e}')
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    test_cluster_tree_projection()