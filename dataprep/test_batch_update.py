#!/usr/bin/env python3
"""Test the batch update functionality."""

import sqlite3
import numpy as np
import tempfile
import os
from database import (
    ensure_tables,
    insert_cluster_tree_node,
    update_cluster_tree_assignments,
    update_three_d_vectors_in_batch
)
from classes import ClusterTreeNode


def test_batch_update():
    """Test the batch update functionality."""
    print("Testing batch update functionality...")
    
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
        
        # Insert some test data
        page_ids = []
        for i in range(10):
            conn.execute(
                "INSERT INTO page_log (namespace, page_id, chunk_name) VALUES (?, ?, ?)",
                (namespace, i, chunk_name)
            )
            conn.execute(
                "INSERT INTO page_vector (namespace, page_id) VALUES (?, ?)",
                (namespace, i)
            )
            page_ids.append(i)
        
        # Create a cluster tree node
        node = ClusterTreeNode(
            namespace=namespace,
            node_id=1,
            depth=0,
            doc_count=10
        )
        insert_cluster_tree_node(conn, node)
        
        # Assign pages to the cluster node
        update_cluster_tree_assignments(conn, namespace, node.node_id, page_ids)
        
        conn.commit()
        
        # Test the batch update function
        print("Testing batch update...")
        
        # Create test vectors
        updates = []
        for i in range(10):
            vector = np.random.randn(3).astype(np.float32)  # 3D vector
            updates.append((i, vector))
        
        # Test with different batch sizes
        for batch_size in [5, 10, 15]:
            print(f"Testing with batch_size={batch_size}")
            update_three_d_vectors_in_batch(namespace, updates, conn, batch_size=batch_size)
            
            # Verify results
            cursor = conn.execute(
                "SELECT COUNT(*) as count FROM page_vector WHERE three_d_vector IS NOT NULL"
            )
            result = cursor.fetchone()
            print(f"3D vectors stored: {result['count']}")
            
            # Reset for next test
            conn.execute(
                "UPDATE page_vector SET three_d_vector = NULL WHERE namespace = ?",
                (namespace,)
            )
            conn.commit()
        
        conn.close()
        
        print("✓ Batch update test passed!")
        
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
    test_batch_update()