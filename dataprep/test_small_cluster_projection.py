#!/usr/bin/env python3
"""Test the projection functionality with small clusters."""

import sqlite3
import numpy as np
import tempfile
import os
from transform import run_umap_per_cluster
from database import (
    ensure_tables,
    insert_cluster_tree_node,
    update_cluster_tree_assignments
)
from classes import ClusterTreeNode


def test_small_cluster_projection():
    """Test the projection functionality with small clusters."""
    print("Testing small cluster projection...")
    
    # Create a temporary database file
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_file:
        db_path = tmp_file.name
    
    try:
        # Create a test database with proper schema
        conn = sqlite3.connect(db_path)
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
        
        # Test with different cluster sizes
        test_sizes = [3, 5, 10, 20, 50]
        
        for i, cluster_size in enumerate(test_sizes):
            print(f"\n--- Testing cluster size: {cluster_size} ---")
            
            # Insert test data for this cluster
            page_ids = []
            for j in range(cluster_size):
                vector = np.random.randn(100).astype(np.float32)  # 100-dimensional reduced vector
                page_id = i * 1000 + j  # Unique page ID
                conn.execute(
                    "INSERT INTO page_log (namespace, page_id, chunk_name) VALUES (?, ?, ?)",
                    (namespace, page_id, chunk_name)
                )
                conn.execute(
                    "INSERT INTO page_vector (namespace, page_id, reduced_vector) VALUES (?, ?, ?)",
                    (namespace, page_id, vector.tobytes()),
                )
                page_ids.append(page_id)
            
            # Create a cluster tree node
            node = ClusterTreeNode(
                namespace=namespace,
                node_id=i + 1,  # Unique node ID
                depth=0,
                doc_count=cluster_size
            )
            insert_cluster_tree_node(conn, node)
            
            # Assign pages to the cluster node
            update_cluster_tree_assignments(conn, namespace, node.node_id, page_ids)
        
        conn.commit()
        
        # Test the run_umap_per_cluster function
        print(f"\n=== Testing run_umap_per_cluster with multiple cluster sizes ===")
        processed_count = run_umap_per_cluster(
            conn, namespace, n_components=3, limit=None  # Process all clusters
        )
        print(f'Processed count: {processed_count}')
        
        # Check results
        cursor = conn.execute(
            "SELECT COUNT(*) as count FROM page_vector WHERE three_d_vector IS NOT NULL"
        )
        result = cursor.fetchone()
        expected_total = sum(test_sizes)
        print(f'3D vectors stored: {result["count"]} (expected: {expected_total})')
        
        # Verify that all pages got 3D vectors
        assert result["count"] == expected_total, f"Expected {expected_total} 3D vectors, got {result['count']}"
        
        conn.close()
        
        print("✓ Small cluster projection test passed!")
        
    except Exception as e:
        print(f'✗ Error: {e}')
        import traceback
        traceback.print_exc()
        raise
    finally:
        # Clean up the temporary database file
        if os.path.exists(db_path):
            os.unlink(db_path)


if __name__ == "__main__":
    test_small_cluster_projection()