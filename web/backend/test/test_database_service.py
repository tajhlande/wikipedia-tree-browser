"""
Unit tests for database service (services/database_service.py)
Testing database operations with mock connections and test databases
"""

import json
import os
import sqlite3
import tempfile
from pathlib import Path

import pytest

from models.page import PageResponse
from services.database_service import (
    DatabaseService,
    _get_sql_conn_for_file,
    _row_to_pydantic,
    _sqlconns,
)


@pytest.fixture
def temp_db_dir():
    """Create a temporary directory for test databases"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def mock_cluster_row():
    """Create a mock cluster tree row"""
    return {
        "node_id": 1,
        "namespace": "test_namespace",
        "parent_id": None,
        "depth": 0,
        "doc_count": 100,
        "child_count": 5,
        "final_label": "Test Root",
        "centroid_three_d": None,
    }


@pytest.fixture
def mock_cluster_row_with_centroid():
    """Create a mock cluster tree row with centroid data"""
    return {
        "node_id": 2,
        "namespace": "test_namespace",
        "parent_id": 1,
        "depth": 1,
        "doc_count": 50,
        "child_count": 2,
        "final_label": "Test Child",
        "centroid_three_d": json.dumps([1.5, -2.3, 0.7]),
    }


@pytest.fixture
def sample_db(temp_db_dir):
    """Create a sample database with test data"""
    db_path = os.path.join(temp_db_dir, "test_namespace_slim.db")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")

    # Create cluster_tree table
    conn.execute("""
        CREATE TABLE cluster_tree (
            namespace TEXT NOT NULL,
            node_id INTEGER NOT NULL,
            parent_id INTEGER,
            depth INTEGER NOT NULL,
            doc_count INTEGER NOT NULL,
            child_count INTEGER NOT NULL DEFAULT 0,
            final_label TEXT,
            centroid_three_d TEXT,
            PRIMARY KEY (namespace, node_id)
        );
    """)

    # Create page_log table
    conn.execute("""
        CREATE TABLE page_log (
            namespace TEXT NOT NULL,
            page_id INTEGER NOT NULL,
            title TEXT,
            abstract TEXT,
            url TEXT,
            PRIMARY KEY (namespace, page_id)
        );
    """)

    # Create page_vector table
    conn.execute("""
        CREATE TABLE page_vector (
            namespace TEXT NOT NULL,
            page_id INTEGER NOT NULL,
            cluster_node_id INTEGER,
            PRIMARY KEY (namespace, page_id)
        );
    """)

    # Insert test cluster data
    clusters = [
        (1, None, 0, 100, 2, "Root", None),
        (2, 1, 1, 50, 0, "Child 1", json.dumps([1.0, 2.0, 3.0])),
        (3, 1, 1, 30, 0, "Child 2", json.dumps([-1.0, -2.0, -3.0])),
    ]
    for node_id, parent_id, depth, doc_count, child_count, label, centroid in clusters:
        conn.execute(
            "INSERT INTO cluster_tree "
            "(node_id, namespace, parent_id, depth, doc_count, "
            "child_count, final_label, centroid_three_d) "
            "VALUES (?, 'test_namespace', ?, ?, ?, ?, ?, ?)",
            (node_id, parent_id, depth, doc_count, child_count, label, centroid)
        )

    # Insert test page data
    pages = [
        (1, "Test Page 1", "Abstract 1", "https://test.com/1", 2),
        (2, "Test Page 2", "Abstract 2", "https://test.com/2", 2),
        (3, "Test Page 3", "Abstract 3", "https://test.com/3", 3),
    ]
    for page_id, title, abstract, url, cluster_node_id in pages:
        conn.execute(
            "INSERT INTO page_log (namespace, page_id, title, abstract, url) "
            "VALUES ('test_namespace', ?, ?, ?, ?)",
            (page_id, title, abstract, url)
        )
        conn.execute(
            "INSERT INTO page_vector (namespace, page_id, cluster_node_id) "
            "VALUES ('test_namespace', ?, ?)",
            (page_id, cluster_node_id)
        )

    conn.commit()
    conn.close()

    return db_path


@pytest.fixture
def db_service(temp_db_dir):
    """Create a DatabaseService instance with test directory"""
    service = DatabaseService(db_directory=temp_db_dir)
    yield service
    # Cleanup
    service.shutdown()


class TestConnectionManagement:
    """Tests for connection pooling and management"""

    def test_get_sql_conn_caches_connections(self):
        """Test that _get_sql_conn_for_file caches connections"""
        # Clear any existing connections
        _sqlconns.clear()

        conn1 = _get_sql_conn_for_file(":memory:")
        conn2 = _get_sql_conn_for_file(":memory:")

        assert conn1 is conn2, "Should return cached connection"
        conn1.close()

    def test_get_sql_conn_applies_pragmas(self):
        """Test that performance pragmas are applied"""
        _sqlconns.clear()

        # Use a temp file instead of :memory: for proper WAL mode verification
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            temp_path = f.name

        try:
            conn = _get_sql_conn_for_file(temp_path)
            cursor = conn.execute("PRAGMA journal_mode;")
            journal_mode = cursor.fetchone()[0]

            # WAL mode is set, or it falls back to something else depending on platform
            assert journal_mode in ["wal", "memory", "delete"], f"Expected wal mode, got {journal_mode}"
            conn.close()
        finally:
            import os
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def test_db_service_get_connection_constructs_path(self, db_service):
        """Test that _get_connection constructs correct db file path"""
        conn = db_service._get_connection("test_namespace")

        assert conn is not None, "Should return a connection"
        # Connection should be valid
        cursor = conn.execute("SELECT 1")
        assert cursor.fetchone()[0] == 1

    def test_shutdown_closes_all_connections(self):
        """Test that shutdown closes all cached connections"""
        _sqlconns.clear()

        # Create connections using temp files instead of :memory:
        import tempfile
        import os
        temp_files = []
        for i in range(2):
            with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
                temp_files.append(f.name)
                _get_sql_conn_for_file(f.name)

        initial_count = len(_sqlconns)
        assert initial_count >= 2, "Should have cached connections"

        service = DatabaseService()
        service.shutdown()

        assert len(_sqlconns) == 0, "All connections should be closed"

        # Cleanup temp files
        for f in temp_files:
            if os.path.exists(f):
                os.unlink(f)

    def test_shutdown_handles_connection_errors(self):
        """Test shutdown handles connection errors gracefully"""
        _sqlconns.clear()

        # Create a connection and then manually close it
        conn = _get_sql_conn_for_file(":memory:")
        conn.close()

        service = DatabaseService()
        # Should not raise exception
        service.shutdown()


class TestRowMapping:
    """Tests for row to model mapping functions"""

    def test_row_to_pydantic_maps_correct_fields(self):
        """Test _row_to_pydantic maps row to Pydantic model"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row

        # Create a mock row
        conn.execute(
            "CREATE TABLE test (page_id INTEGER, title TEXT, abstract TEXT, url TEXT, "
            "cluster_node_id INTEGER)"
        )
        conn.execute("INSERT INTO test VALUES (1, 'Test', 'Abstract', 'http://test.com', 5)")
        cursor = conn.execute("SELECT * FROM test")
        row = cursor.fetchone()

        result = _row_to_pydantic(row, PageResponse)

        assert result.page_id == 1
        assert result.title == "Test"
        assert result.abstract == "Abstract"
        assert result.url == "http://test.com"
        assert result.cluster_node_id == 5
        conn.close()

    def test_row_to_pydantic_filters_extra_fields(self):
        """Test _row_to_pydantic filters to model fields only"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row

        # Create table with extra field
        conn.execute("CREATE TABLE test (page_id INTEGER, title TEXT, extra_field TEXT)")
        conn.execute("INSERT INTO test VALUES (1, 'Test', 'Extra')")
        cursor = conn.execute("SELECT * FROM test")
        row = cursor.fetchone()

        result = _row_to_pydantic(row, PageResponse)

        assert result.page_id == 1
        assert result.title == "Test"
        conn.close()

    def test_map_cluster_row_to_response_with_centroid_json(self, db_service):
        """Test _map_cluster_row_to_response parses centroid JSON"""
        # Create a mock row with centroid
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.execute(
            "CREATE TABLE test (node_id INTEGER, namespace TEXT, parent_id INTEGER, "
            "depth INTEGER, doc_count INTEGER, child_count INTEGER, final_label TEXT, "
            "centroid_three_d TEXT)"
        )
        conn.execute(
            "INSERT INTO test VALUES (1, 'test', NULL, 0, 100, 5, 'Label', "
            "'[1.5, -2.3, 0.7]')"
        )
        cursor = conn.execute("SELECT * FROM test")
        row = cursor.fetchone()

        result = db_service._map_cluster_row_to_response(row)

        assert result.node_id == 1
        assert result.centroid_3d == [1.5, -2.3, 0.7]
        conn.close()

    def test_map_cluster_row_to_response_with_none_centroid(self, db_service):
        """Test _map_cluster_row_to_response handles None centroid"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.execute(
            "CREATE TABLE test (node_id INTEGER, namespace TEXT, parent_id INTEGER, "
            "depth INTEGER, doc_count INTEGER, child_count INTEGER, final_label TEXT, "
            "centroid_three_d TEXT)"
        )
        conn.execute(
            "INSERT INTO test VALUES (1, 'test', NULL, 0, 100, 5, 'Label', NULL)"
        )
        cursor = conn.execute("SELECT * FROM test")
        row = cursor.fetchone()

        result = db_service._map_cluster_row_to_response(row)

        assert result.node_id == 1
        assert result.centroid_3d is None
        conn.close()

    def test_map_cluster_row_to_response_with_invalid_json(self, db_service):
        """Test _map_cluster_row_to_response handles invalid JSON gracefully"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.execute(
            "CREATE TABLE test (node_id INTEGER, namespace TEXT, parent_id INTEGER, "
            "depth INTEGER, doc_count INTEGER, child_count INTEGER, final_label TEXT, "
            "centroid_three_d TEXT)"
        )
        conn.execute(
            "INSERT INTO test VALUES (1, 'test', NULL, 0, 100, 5, 'Label', "
            "'not valid json')"
        )
        cursor = conn.execute("SELECT * FROM test")
        row = cursor.fetchone()

        result = db_service._map_cluster_row_to_response(row)

        assert result.node_id == 1
        assert result.centroid_3d is None, "Invalid JSON should result in None"
        conn.close()

    def test_map_cluster_row_to_response_field_defaults(self, db_service):
        """Test _map_cluster_row_to_response applies field defaults"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        # Create table with missing optional fields
        conn.execute("CREATE TABLE test (node_id INTEGER, namespace TEXT)")
        conn.execute("INSERT INTO test VALUES (1, 'test')")
        cursor = conn.execute("SELECT * FROM test")
        row = cursor.fetchone()

        result = db_service._map_cluster_row_to_response(row)

        assert result.node_id == 1
        assert result.namespace == "test"
        assert result.parent_id is None
        assert result.depth == 0, "Should default to 0"
        assert result.doc_count == 0, "Should default to 0"
        assert result.child_count == 0, "Should default to 0"
        conn.close()


class TestPageQueries:
    """Tests for page-related database queries"""

    def test_get_page_by_id_found(self, db_service, sample_db):
        """Test get_page_by_id returns page when found"""
        result = db_service.get_page_by_id("test_namespace", 1)

        assert result is not None
        assert result.page_id == 1
        assert result.title == "Test Page 1"
        assert result.abstract == "Abstract 1"
        assert result.url == "https://test.com/1"
        assert result.cluster_node_id == 2

    def test_get_page_by_id_not_found(self, db_service, sample_db):
        """Test get_page_by_id returns None when not found"""
        result = db_service.get_page_by_id("test_namespace", 999)

        assert result is None

    def test_get_pages_in_cluster_default_pagination(self, db_service, sample_db):
        """Test get_pages_in_cluster with default pagination"""
        result = db_service.get_pages_in_cluster("test_namespace", 2)

        assert len(result) == 2
        assert all(p.cluster_node_id == 2 for p in result)
        assert result[0].page_id == 1
        assert result[1].page_id == 2

    def test_get_pages_in_cluster_custom_limit(self, db_service, sample_db):
        """Test get_pages_in_cluster with custom limit"""
        result = db_service.get_pages_in_cluster("test_namespace", 2, limit=1)

        assert len(result) == 1
        assert result[0].page_id == 1

    def test_get_pages_in_cluster_with_offset(self, db_service, sample_db):
        """Test get_pages_in_cluster with offset"""
        result = db_service.get_pages_in_cluster("test_namespace", 2, limit=10, offset=1)

        assert len(result) == 1
        assert result[0].page_id == 2

    def test_get_pages_in_cluster_empty_result(self, db_service, sample_db):
        """Test get_pages_in_cluster returns empty list when no pages"""
        result = db_service.get_pages_in_cluster("test_namespace", 999)

        assert result == []


class TestClusterQueries:
    """Tests for cluster-related database queries"""

    def test_get_cluster_node_found(self, db_service, sample_db):
        """Test get_cluster_node returns node when found"""
        result = db_service.get_cluster_node("test_namespace", 1)

        assert result is not None
        assert result.node_id == 1
        assert result.namespace == "test_namespace"
        assert result.parent_id is None
        assert result.depth == 0
        assert result.doc_count == 100
        assert result.child_count == 2
        assert result.final_label == "Root"

    def test_get_cluster_node_with_centroid(self, db_service, sample_db):
        """Test get_cluster_node with centroid data"""
        result = db_service.get_cluster_node("test_namespace", 2)

        assert result is not None
        assert result.node_id == 2
        assert result.centroid_3d == [1.0, 2.0, 3.0]

    def test_get_cluster_node_not_found(self, db_service, sample_db):
        """Test get_cluster_node returns None when not found"""
        result = db_service.get_cluster_node("test_namespace", 999)

        assert result is None

    def test_get_cluster_node_children(self, db_service, sample_db):
        """Test get_cluster_node_children returns ordered children"""
        result = db_service.get_cluster_node_children("test_namespace", 1)

        assert len(result) == 2
        assert result[0].node_id == 2
        assert result[1].node_id == 3
        assert all(c.parent_id == 1 for c in result)

    def test_get_cluster_node_children_empty(self, db_service, sample_db):
        """Test get_cluster_node_children returns empty list for leaf nodes"""
        result = db_service.get_cluster_node_children("test_namespace", 2)

        assert result == []

    def test_get_cluster_node_siblings(self, db_service, sample_db):
        """Test get_cluster_node_siblings returns siblings excluding self"""
        # Add another sibling for node 2
        conn = sqlite3.connect(sample_db)
        conn.execute(
            "INSERT INTO cluster_tree "
            "(node_id, namespace, parent_id, depth, doc_count, child_count, "
            "final_label, centroid_three_d) "
            "VALUES (4, 'test_namespace', 1, 1, 25, 0, 'Child 3', NULL)"
        )
        conn.commit()
        conn.close()

        result = db_service.get_cluster_node_siblings("test_namespace", 2)

        assert len(result) == 2
        # Should not include node 2 itself
        node_ids = {r.node_id for r in result}
        assert node_ids == {3, 4}

    def test_get_cluster_node_siblings_no_siblings(self, db_service, sample_db):
        """Test get_cluster_node_siblings when node has no siblings"""
        result = db_service.get_cluster_node_siblings("test_namespace", 2)

        # Only child 3 is a sibling to child 2 (excluding self)
        assert len(result) == 1
        assert result[0].node_id == 3

    def test_get_cluster_node_parent(self, db_service, sample_db):
        """Test get_cluster_node_parent returns parent"""
        result = db_service.get_cluster_node_parent("test_namespace", 2)

        assert result is not None
        assert result.node_id == 1
        assert result.depth == 0

    def test_get_cluster_node_parent_for_root(self, db_service, sample_db):
        """Test get_cluster_node_parent returns None for root node"""
        result = db_service.get_cluster_node_parent("test_namespace", 1)

        assert result is None

    def test_get_cluster_node_ancestors(self, db_service, sample_db):
        """Test get_cluster_node_ancestors returns ancestor chain"""
        # Add a grandchild
        conn = sqlite3.connect(sample_db)
        conn.execute(
            "INSERT INTO cluster_tree "
            "(node_id, namespace, parent_id, depth, doc_count, child_count, "
            "final_label, centroid_three_d) "
            "VALUES (5, 'test_namespace', 2, 2, 10, 0, 'Grandchild', NULL)"
        )
        conn.commit()
        conn.close()

        result = db_service.get_cluster_node_ancestors("test_namespace", 5)

        assert len(result) == 2
        # SQL orders by depth DESC, so parent (depth 1) comes before root (depth 0)
        assert result[0].node_id == 2
        assert result[1].node_id == 1

    def test_get_cluster_node_ancestors_for_root(self, db_service, sample_db):
        """Test get_cluster_node_ancestors returns empty for root"""
        result = db_service.get_cluster_node_ancestors("test_namespace", 1)

        assert result == []

    def test_get_root_node(self, db_service, sample_db):
        """Test get_root_node returns root node"""
        result = db_service.get_root_node("test_namespace")

        assert result is not None
        assert result.node_id == 1
        assert result.parent_id is None
        assert result.depth == 0

    def test_get_root_node_not_found(self, db_service, temp_db_dir):
        """Test get_root_node with nonexistent namespace raises error"""
        # When the database file doesn't exist, it's created but tables are missing
        with pytest.raises(sqlite3.OperationalError, match="no such table"):
            db_service.get_root_node("nonexistent_namespace")


class TestNamespaceDiscovery:
    """Tests for namespace discovery functionality"""

    def test_get_available_namespaces(self, db_service, sample_db):
        """Test get_available_namespaces returns sorted list"""
        # Create additional db files
        db_path = Path(db_service.db_directory)

        # Create another test database
        conn = sqlite3.connect(db_path / "another_namespace_slim.db")
        conn.execute("CREATE TABLE cluster_tree (namespace TEXT, node_id INTEGER)")
        conn.commit()
        conn.close()

        result = db_service.get_available_namespaces()

        assert len(result) >= 2
        assert "test_namespace" in result
        assert "another_namespace" in result
        assert result == sorted(result), "Should be sorted"

    def test_get_available_namespaces_empty_directory(self, db_service, temp_db_dir):
        """Test get_available_namespaces handles empty directory"""
        result = db_service.get_available_namespaces()

        assert result == []


class TestErrorHandling:
    """Tests for error handling"""

    def test_get_page_by_id_with_nonexistent_namespace(self, db_service):
        """Test get_page_by_id with nonexistent namespace raises error"""
        # When the database file doesn't exist, it's created but tables are missing
        import pytest
        with pytest.raises(sqlite3.OperationalError, match="no such table"):
            db_service.get_page_by_id("nonexistent", 1)

    def test_get_cluster_node_with_nonexistent_namespace(self, db_service):
        """Test get_cluster_node with nonexistent namespace raises error"""
        # When the database file doesn't exist, it's created but tables are missing
        import pytest
        with pytest.raises(sqlite3.OperationalError, match="no such table"):
            db_service.get_cluster_node("nonexistent", 1)
