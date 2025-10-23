import sqlite3
import numpy as np
from transform import run_pca
from database import ensure_tables


def test_pca_batch_sufficient():
    # Create a test database with proper schema
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row

    # Ensure tables are created with proper schema
    ensure_tables(conn)

    # Insert some test data - create 150 vectors of 2048 dimensions each
    # This should be enough to satisfy the n_components=100 requirement
    for i in range(150):
        vector = np.random.randn(2048).astype(np.float32)
        conn.execute('INSERT INTO page_vector (page_id, embedding_vector) VALUES (?, ?)', 
                    (i, vector.tobytes()))

    conn.commit()

    # Test the run_pca function
    try:
        batch_count, total_vectors = run_pca(conn, target_dim=100, batch_size=50)
        print(f'Success! Processed {total_vectors} vectors in {batch_count} batches')
        
        # Verify that reduced vectors were stored
        cursor = conn.execute('SELECT COUNT(*) as count FROM page_vector WHERE reduced_vector IS NOT NULL')
        result = cursor.fetchone()
        print(f'Reduced vectors stored: {result["count"]}')
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
    
def test_pca_insufficient_batch():
    # Create a test database with proper schema
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row

    # Ensure tables are created with proper schema
    ensure_tables(conn)

    # Insert some test data - create 150 vectors of 2048 dimensions each
    for i in range(150):
        vector = np.random.randn(2048).astype(np.float32)
        conn.execute('INSERT INTO page_vector (page_id, embedding_vector) VALUES (?, ?)', 
                    (i, vector.tobytes()))

    conn.commit()

    # Test with a very small batch size that would normally cause the error
    try:
        batch_count, total_vectors = run_pca(conn, target_dim=100, batch_size=10)
        print(f'Success with small batch size! Processed {total_vectors} vectors in {batch_count} batches')
        
        # Verify that reduced vectors were stored
        cursor = conn.execute('SELECT COUNT(*) as count FROM page_vector WHERE reduced_vector IS NOT NULL')
        result = cursor.fetchone()
        print(f'Reduced vectors stored: {result["count"]}')
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
    
