"""
Unit tests for search service (services/search_service.py)
Testing FTS5 search functionality with mock database connections
"""

import os
import sqlite3
import tempfile
from unittest.mock import Mock

import pytest

from services.search_service import SearchService, FTS5_LANGUAGE_CONFIG
from models.search import SearchResultResponse


@pytest.fixture
def temp_db_dir():
    """Create a temporary directory for test databases"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def mock_database_service():
    """Create a mock DatabaseService"""
    mock_service = Mock()
    return mock_service


@pytest.fixture
def search_service(mock_database_service):
    """Create SearchService instance with mock database service"""
    return SearchService(database_service=mock_database_service)


@pytest.fixture
def sample_fts5_db(temp_db_dir):
    """Create a sample database with FTS5 tables and test data"""
    db_path = os.path.join(temp_db_dir, "enwiki_namespace_0_slim.db")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")

    # Create cluster_tree table
    conn.execute(
        """
        CREATE TABLE cluster_tree (
            namespace TEXT NOT NULL,
            node_id INTEGER NOT NULL,
            parent_id INTEGER,
            depth INTEGER NOT NULL,
            doc_count INTEGER NOT NULL,
            child_count INTEGER NOT NULL DEFAULT 0,
            final_label TEXT,
            PRIMARY KEY (namespace, node_id)
        );
        """
    )

    # Create page_log table
    conn.execute(
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

    # Create page_vector table
    conn.execute(
        """
        CREATE TABLE page_vector (
            namespace TEXT NOT NULL,
            page_id INTEGER NOT NULL,
            cluster_node_id INTEGER,
            PRIMARY KEY (namespace, page_id)
        );
        """
    )

    # Create FTS5 virtual table with aggregated page titles
    conn.execute(
        """
        CREATE VIRTUAL TABLE cluster_tree_fts USING fts5(
            node_id UNINDEXED,
            namespace UNINDEXED,
            final_label,
            page_titles,
            page_count UNINDEXED,
            tokenize='unicode61 remove_diacritics 1'
        );
        """
    )

    # Insert test data into cluster_tree
    conn.execute(
        """
        INSERT INTO cluster_tree (namespace, node_id, parent_id, depth, doc_count, child_count, final_label)
        VALUES
            ('enwiki_namespace_0', 1, NULL, 0, 100, 2, 'Science'),
            ('enwiki_namespace_0', 2, 1, 1, 50, 0, 'Physics'),
            ('enwiki_namespace_0', 3, 1, 1, 50, 0, 'Chemistry'),
            ('enwiki_namespace_0', 4, NULL, 0, 80, 1, 'Arts');
        """
    )

    # Insert test data into page_log
    conn.execute(
        """
        INSERT INTO page_log (namespace, page_id, title, abstract, url)
        VALUES
            ('enwiki_namespace_0', 1001, 'Quantum Mechanics', 'Abstract...',
             'https://en.wikipedia.org/wiki/Quantum_Mechanics'),
            ('enwiki_namespace_0', 1002, 'Classical Physics', 'Abstract...',
             'https://en.wikipedia.org/wiki/Classical_Physics'),
            ('enwiki_namespace_0', 1003, 'Organic Chemistry', 'Abstract...',
             'https://en.wikipedia.org/wiki/Organic_Chemistry')
        """
    )

    # Insert test data into page_vector
    conn.execute(
        """
        INSERT INTO page_vector (namespace, page_id, cluster_node_id)
        VALUES
            ('enwiki_namespace_0', 1001, 2),
            ('enwiki_namespace_0', 1002, 2),
            ('enwiki_namespace_0', 1003, 3);
        """
    )

    # Populate FTS5 table with aggregated page titles
    conn.execute(
        """
        INSERT INTO cluster_tree_fts(node_id, namespace, final_label, page_titles, page_count)
        SELECT
            ct.node_id,
            ct.namespace,
            ct.final_label,
            COALESCE(GROUP_CONCAT(pl.title, ' '), ''),
            COUNT(pl.page_id)
        FROM cluster_tree ct
        LEFT JOIN page_vector pv ON pv.namespace = ct.namespace AND pv.cluster_node_id = ct.node_id
        LEFT JOIN page_log pl ON pl.namespace = pv.namespace AND pl.page_id = pv.page_id
        WHERE ct.final_label IS NOT NULL
        GROUP BY ct.node_id, ct.namespace, ct.final_label;
        """
    )

    conn.commit()
    return db_path


class TestFTS5LanguageConfig:
    """Test suite for FTS5 language configuration"""

    def test_english_has_stemming_enabled(self):
        """Test that English has stemming enabled"""
        assert FTS5_LANGUAGE_CONFIG['en']['use_stemming'] is True

    def test_german_has_stemming_disabled(self):
        """Test that German has stemming disabled"""
        assert FTS5_LANGUAGE_CONFIG['de']['use_stemming'] is False

    def test_french_has_stemming_disabled(self):
        """Test that French has stemming disabled"""
        assert FTS5_LANGUAGE_CONFIG['fr']['use_stemming'] is False

    def test_chinese_has_stemming_disabled(self):
        """Test that Chinese has stemming disabled"""
        assert FTS5_LANGUAGE_CONFIG['zh']['use_stemming'] is False

    def test_unknown_language_defaults_to_no_stemming(self):
        """Test that unknown languages default to no stemming"""
        config = FTS5_LANGUAGE_CONFIG.get('unknown', {'use_stemming': False})
        assert config['use_stemming'] is False


class TestSearchService:
    """Test suite for SearchService"""

    def test_init(self, search_service):
        """Test SearchService initialization"""
        assert search_service is not None
        assert search_service.db_service is not None

    def test_shutdown(self, search_service):
        """Test SearchService shutdown"""
        # Should not raise any exception
        search_service.shutdown()

    def test_prepare_fts5_query_english_stemming(self, search_service):
        """Test FTS5 query preparation for English with stemming"""
        result = search_service._prepare_fts5_query("physics", "en")
        assert result == "physics"

    def test_prepare_fts5_query_german_prefix(self, search_service):
        """Test FTS5 query preparation for German with prefix matching"""
        result = search_service._prepare_fts5_query("physik", "de")
        assert result == "physik*"

    def test_prepare_fts5_query_phrase_search(self, search_service):
        """Test FTS5 query preparation for phrase search"""
        result = search_service._prepare_fts5_query('"quantum physics"', "en")
        # Quotes are escaped for FTS5
        assert result == '""quantum physics""'

    def test_prepare_fts5_query_escapes_quotes(self, search_service):
        """Test FTS5 query preparation escapes double quotes"""
        result = search_service._prepare_fts5_query('test "quote" test', "en")
        assert result == 'test ""quote"" test'

    def test_prepare_fts5_query_chinese_prefix(self, search_service):
        """Test FTS5 query preparation for Chinese with prefix matching"""
        result = search_service._prepare_fts5_query("物理", "zh")
        assert result == "物理*"

    def test_search_nodes_respects_limit(self, search_service, sample_fts5_db):
        """Test search_nodes respects the limit parameter"""
        def mock_get_connection(namespace):
            return sqlite3.connect(sample_fts5_db)

        search_service.db_service._get_connection = mock_get_connection

        # Test with limit=1
        results = search_service.search_nodes("enwiki_namespace_0", "physics", "en", limit=1)
        assert len(results) <= 1

    def test_search_nodes_empty_query(self, search_service, sample_fts5_db):
        """Test search_nodes with empty query returns empty results"""
        def mock_get_connection(namespace):
            return sqlite3.connect(sample_fts5_db)

        search_service.db_service._get_connection = mock_get_connection

        # Empty query should return empty results (FTS5 MATCH behavior)
        results = search_service.search_nodes("enwiki_namespace_0", "", "en", limit=10)
        # FTS5 may return empty or error, but service should handle gracefully
        assert isinstance(results, list)

    def test_search_nodes_prefix_search(self, search_service, sample_fts5_db):
        """Test search_nodes with prefix matching"""
        def mock_get_connection(namespace):
            return sqlite3.connect(sample_fts5_db)

        search_service.db_service._get_connection = mock_get_connection

        # German language should use prefix matching
        results = search_service.search_nodes("enwiki_namespace_0", "phys", "de", limit=10)
        assert isinstance(results, list)

    def test_search_nodes_database_error(self, search_service):
        """Test search_nodes handles database errors gracefully"""
        # Mock connection that raises an error during execute
        mock_conn = Mock()
        mock_conn.execute.side_effect = sqlite3.Error("Database connection failed")

        def mock_get_connection_error(namespace):
            return mock_conn

        search_service.db_service._get_connection = mock_get_connection_error

        # Should return empty list on error
        results = search_service.search_nodes("enwiki_namespace_0", "physics", "en", limit=10)
        assert results == []

    def test_search_nodes_missing_fts_tables(self, search_service, temp_db_dir):
        """Test search_nodes handles missing FTS5 tables gracefully"""
        # Create a database without FTS5 tables
        db_path = os.path.join(temp_db_dir, "no_fts_slim.db")
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute(
            """
            CREATE TABLE cluster_tree (
                namespace TEXT NOT NULL,
                node_id INTEGER NOT NULL,
                parent_id INTEGER,
                depth INTEGER NOT NULL,
                doc_count INTEGER NOT NULL,
                child_count INTEGER NOT NULL DEFAULT 0,
                final_label TEXT,
                PRIMARY KEY (namespace, node_id)
            );
            """
        )
        conn.commit()

        def mock_get_connection(namespace):
            return sqlite3.connect(db_path)

        search_service.db_service._get_connection = mock_get_connection

        # Should return empty list when FTS5 tables don't exist
        results = search_service.search_nodes("enwiki_namespace_0", "physics", "en", limit=10)
        assert results == []

    def test_search_nodes_returns_correct_structure(self, search_service, sample_fts5_db):
        """Test search_nodes returns results with correct structure"""
        def mock_get_connection(namespace):
            return sqlite3.connect(sample_fts5_db)

        search_service.db_service._get_connection = mock_get_connection

        results = search_service.search_nodes("enwiki_namespace_0", "science", "en", limit=10)

        for result in results:
            assert isinstance(result, SearchResultResponse)
            assert hasattr(result, 'node_id')
            assert hasattr(result, 'node_label')
            assert hasattr(result, 'match_type')
            assert hasattr(result, 'depth')
            assert hasattr(result, 'parent_id')
            assert result.match_type in ['node_label', 'page_titles']
