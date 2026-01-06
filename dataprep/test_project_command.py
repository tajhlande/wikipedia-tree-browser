#!/usr/bin/env python3
"""Test the ProjectCommand functionality."""

import sqlite3
import numpy as np
import tempfile
import os
from command import ProjectCommand, Result
from database import ensure_tables, insert_cluster_tree_node, update_cluster_tree_assignments
from classes import ClusterTreeNode


def test_project_command():
    """Test the ProjectCommand with cluster tree nodes."""
    print("Testing ProjectCommand...")
    
    # Create a temporary directory for the database
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            namespace = "test_namespace"
            db_path = os.path.join(temp_dir, f"{namespace}.db")
            
            # Create a test database with proper schema
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            
            # Ensure tables are created with proper schema
            ensure_tables(conn)
            
            chunk_name = "test_chunk"
            
            # Insert chunk info
            conn.execute(
                "INSERT INTO chunk_log (chunk_name, namespace) VALUES (?, ?)",
                (chunk_name, namespace),
            )
            
            # Insert some test data - create 50 vectors of 100 dimensions each (reduced vectors)
            page_ids = []
            for i in range(50):
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
                doc_count=50
            )
            insert_cluster_tree_node(conn, node)
            
            # Assign pages to the cluster node
            update_cluster_tree_assignments(conn, namespace, node.node_id, page_ids)
            
            # Debug: Check what's in the database before running the command
            cursor = conn.execute(
                "SELECT COUNT(*) as count FROM page_vector WHERE three_d_vector IS NULL AND cluster_node_id IS NOT NULL"
            )
            result = cursor.fetchone()
            print(f'Pages needing projection: {result["count"]}')
            
            cursor = conn.execute(
                "SELECT COUNT(*) as count FROM page_vector"
            )
            result = cursor.fetchone()
            print(f'Total pages: {result["count"]}')
            
            cursor = conn.execute(
                "SELECT COUNT(*) as count FROM page_vector WHERE cluster_node_id IS NOT NULL"
            )
            result = cursor.fetchone()
            print(f'Pages with cluster_node_id: {result["count"]}')
            
            conn.commit()
            conn.close()
            
            # Test the ProjectCommand
            command = ProjectCommand()
            
            # Create environment variables
            env_vars = {
                'DATA_STORAGE_DIRNAME': temp_dir
            }
            
            # Test with limit
            args = {
                'namespace': namespace,
                'limit': 1
            }
            
            result, message = command.execute(args, env_vars)
            
            print(f"Result: {result}")
            print(f"Message: {message}")
            
            # Verify the command succeeded
            assert result == Result.SUCCESS, f"Expected SUCCESS, got {result}"
            assert "1 cluster node" in message, f"Expected '1 cluster node' in message, got: {message}"
            
            # Verify that 3D vectors were stored
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT COUNT(*) as count FROM page_vector WHERE three_d_vector IS NOT NULL"
            )
            result = cursor.fetchone()
            print(f'3D vectors stored: {result["count"]}')
            
            # Verify that all pages got 3D vectors
            assert result["count"] == 50, f"Expected 50 3D vectors, got {result['count']}"
            
            conn.close()
            
            print("✓ ProjectCommand test passed!")
            
    except Exception as e:
        print(f'✗ Error: {e}')
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    test_project_command()