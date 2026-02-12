#!/usr/bin/env python3
"""
Migration script to create a slim, optimized database from a full Wikipedia embeddings database.

This script:
1. Creates a new database with only the tables and columns used by the API
2. Creates optimized indexes for the access patterns
3. Copies data from the original database to the new slim database

Usage:
    python migrate_to_slim.py <path_to_input_db>

The output file will be named {input_filename_without_extension}_slim.db
"""

import argparse
import logging
import sqlite3
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def get_output_path(input_path: Path) -> Path:
    """Generate the output path for the slim database."""
    return input_path.parent / f"{input_path.stem}_slim.db"


def create_slim_schema(conn: sqlite3.Connection) -> None:
    """Create the optimized schema for the slim database."""
    cursor = conn.cursor()

    # Drop tables if they exist (for idempotency)
    cursor.execute("DROP TABLE IF EXISTS page_vector;")
    cursor.execute("DROP TABLE IF EXISTS page_log;")
    cursor.execute("DROP TABLE IF EXISTS cluster_tree;")

    # Create page_log table - only columns used by the API
    cursor.execute(
        """
        CREATE TABLE page_log (
            namespace TEXT NOT NULL,
            page_id INTEGER NOT NULL,
            title TEXT,
            abstract TEXT,
            url TEXT,
            PRIMARY KEY (namespace, page_id)
        );
    """
    )

    # Create page_vector table - only columns used by the API
    cursor.execute(
        """
        CREATE TABLE page_vector (
            namespace TEXT NOT NULL,
            page_id INTEGER NOT NULL,
            cluster_node_id INTEGER,
            PRIMARY KEY (namespace, page_id)
        );
    """
    )

    # Create cluster_tree table - all columns used by the API
    cursor.execute(
        """
        CREATE TABLE cluster_tree (
            namespace TEXT NOT NULL,
            node_id INTEGER NOT NULL,
            parent_id INTEGER,
            depth INTEGER NOT NULL,
            doc_count INTEGER NOT NULL,
            child_count INTEGER NOT NULL DEFAULT 0,
            final_label TEXT,
            centroid_three_d TEXT,
            PRIMARY KEY (namespace, node_id),
            FOREIGN KEY (parent_id) REFERENCES cluster_tree(node_id)
        );
    """
    )

    # Create indexes for optimized queries
    # Index for get_pages_in_cluster: WHERE namespace = ? AND cluster_node_id = ?
    cursor.execute(
        """
        CREATE INDEX idx_page_vector_ns_cluster_node
        ON page_vector(namespace, cluster_node_id);
    """
    )

    # Index for get_cluster_node_children: WHERE namespace = ? AND parent_id = ?
    cursor.execute(
        """
        CREATE INDEX idx_cluster_tree_ns_parent
        ON cluster_tree(namespace, parent_id);
    """
    )

    # Index for get_root_node: WHERE namespace = ? AND parent_id IS NULL
    # This helps find root nodes quickly
    cursor.execute(
        """
        CREATE INDEX idx_cluster_tree_parent_null
        ON cluster_tree(namespace) WHERE parent_id IS NULL;
    """
    )

    conn.commit()
    logger.info("Created slim database schema with optimized indexes")


def copy_data(source_conn: sqlite3.Connection, dest_conn: sqlite3.Connection) -> None:
    """Copy data from source database to destination database."""
    source_cursor = source_conn.cursor()
    dest_cursor = dest_conn.cursor()

    # Copy page_log
    logger.info("Copying page_log...")
    source_cursor.execute(
        """
        SELECT namespace, page_id, title, abstract, url
        FROM page_log
    """
    )
    page_log_rows = source_cursor.fetchall()
    if page_log_rows:
        dest_cursor.executemany(
            """
            INSERT INTO page_log (namespace, page_id, title, abstract, url)
            VALUES (?, ?, ?, ?, ?)
        """,
            page_log_rows,
        )
    logger.info("Copied %d page_log rows", len(page_log_rows))

    # Copy page_vector
    logger.info("Copying page_vector...")
    source_cursor.execute(
        """
        SELECT namespace, page_id, cluster_node_id
        FROM page_vector
    """
    )
    page_vector_rows = source_cursor.fetchall()
    if page_vector_rows:
        dest_cursor.executemany(
            """
            INSERT INTO page_vector (namespace, page_id, cluster_node_id)
            VALUES (?, ?, ?)
        """,
            page_vector_rows,
        )
    logger.info("Copied %d page_vector rows", len(page_vector_rows))

    # Copy cluster_tree
    logger.info("Copying cluster_tree...")
    source_cursor.execute(
        """
        SELECT namespace, node_id, parent_id, depth, doc_count, child_count,
               final_label, centroid_three_d
        FROM cluster_tree
    """
    )
    cluster_tree_rows = source_cursor.fetchall()
    if cluster_tree_rows:
        dest_cursor.executemany(
            """
            INSERT INTO cluster_tree (
                namespace, node_id, parent_id, depth, doc_count, child_count,
                final_label, centroid_three_d
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            cluster_tree_rows,
        )
    logger.info("Copied %d cluster_tree rows", len(cluster_tree_rows))

    dest_conn.commit()


def verify_copy(source_conn: sqlite3.Connection, dest_conn: sqlite3.Connection) -> bool:
    """Verify that all rows were copied correctly."""
    source_cursor = source_conn.cursor()
    dest_cursor = dest_conn.cursor()

    tables = ["page_log", "page_vector", "cluster_tree"]
    all_ok = True

    for table in tables:
        source_cursor.execute(f"SELECT COUNT(*) FROM {table}")
        source_count = source_cursor.fetchone()[0]

        dest_cursor.execute(f"SELECT COUNT(*) FROM {table}")
        dest_count = dest_cursor.fetchone()[0]

        if source_count == dest_count:
            logger.info("Verified %s: %d rows", table, dest_count)
        else:
            logger.error(
                "Mismatch in %s: source=%d, dest=%d", table, source_count, dest_count
            )
            all_ok = False

    return all_ok


def main() -> int:
    """Main entry point for the migration script."""
    parser = argparse.ArgumentParser(
        description="Create a slim, optimized database from a full Wikipedia embeddings database"
    )
    parser.add_argument(
        "input_db",
        type=Path,
        help="Path to the input database file (e.g., enwiki_namespace_0.db)",
    )

    # Show usage and exit without error if no arguments provided
    if len(sys.argv) == 1:
        parser.print_help()
        return 0

    args = parser.parse_args()

    input_path: Path = args.input_db

    # Validate input file exists
    if not input_path.exists():
        logger.error("Input database file does not exist: %s", input_path)
        return 1

    # Generate output path
    output_path = get_output_path(input_path)
    logger.info("Migrating database: %s -> %s", input_path, output_path)

    # Remove output file if it exists
    if output_path.exists():
        logger.warning("Output file already exists, removing: %s", output_path)
        output_path.unlink()

    try:
        # Connect to source database
        logger.info("Opening source database: %s", input_path)
        source_conn = sqlite3.connect(str(input_path))
        source_conn.row_factory = sqlite3.Row

        # Verify source database has required tables
        source_cursor = source_conn.cursor()
        source_cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row[0] for row in source_cursor.fetchall()]
        logger.info("Source database tables: %s", tables)

        required_tables = {"page_log", "page_vector", "cluster_tree"}
        missing_tables = required_tables - set(tables)
        if missing_tables:
            logger.error("Source database missing required tables: %s", missing_tables)
            source_conn.close()
            return 1

        # Connect to destination database
        logger.info("Creating destination database: %s", output_path)
        dest_conn = sqlite3.connect(str(output_path))

        # Enable WAL mode and performance optimizations
        dest_conn.execute("PRAGMA journal_mode=WAL;")
        dest_conn.execute("PRAGMA synchronous=NORMAL;")
        dest_conn.execute("PRAGMA temp_store=MEMORY;")

        # Create schema
        create_slim_schema(dest_conn)

        # Copy data
        copy_data(source_conn, dest_conn)

        # Verify copy
        if not verify_copy(source_conn, dest_conn):
            logger.error("Verification failed, some rows were not copied correctly")
            source_conn.close()
            dest_conn.close()
            return 1

        # Optimize and analyze for query planning
        dest_conn.execute("ANALYZE;")
        dest_conn.execute("PRAGMA optimize;")

        # Close connections
        source_conn.close()
        dest_conn.close()

        # Get file sizes for reporting
        input_size = input_path.stat().st_size
        output_size = output_path.stat().st_size
        reduction_percent = (1 - output_size / input_size) * 100

        logger.info("Migration completed successfully!")
        logger.info("Input size:  %.2f MB", input_size / (1024 * 1024))
        logger.info("Output size: %.2f MB", output_size / (1024 * 1024))
        logger.info("Size reduction: %.1f%%", reduction_percent)

        return 0

    except sqlite3.Error as e:
        logger.error("Database error: %s", e)
        return 1
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
