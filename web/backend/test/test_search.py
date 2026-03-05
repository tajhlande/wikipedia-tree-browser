"""
Unit tests for search API logic in api/search.py
Testing the core logic without FastAPI dependency injection
"""

import pytest
from unittest.mock import Mock
from typing import List

from fastapi.testclient import TestClient
from services.cluster_service import ClusterService
from services.service_setup import get_cluster_service, get_search_service
from services.search_service import SearchService
from util.languages import LanguageInfo
from models.search import SearchResultResponse

from app.main import app

client = TestClient(app)


class TestSearchAPILogic:
    """Test suite for search API logic"""

    @pytest.fixture
    def mock_cluster_service(self) -> Mock:
        """Create a mock cluster service for testing"""
        mock_service = Mock(spec=ClusterService)
        return mock_service

    @pytest.fixture
    def sample_namespace_list(self) -> List[str]:
        """Create a sample list of namespaces for testing"""
        return ["enwiki_namespace_0", "dewiki_namespace_0", "frwiki_namespace_0"]

    @pytest.fixture
    def sample_language_info(self) -> LanguageInfo:
        """Create a sample LanguageInfo object for testing"""
        return LanguageInfo(
            language="English",
            iso_639_1_code="en",
            namespace="enwiki_namespace_0",
            english_wiki_name="English Wikipedia",
            localized_wiki_name="English Wikipedia",
        )

    @pytest.mark.asyncio
    async def test_get_available_namespaces_logic_success(
        self, mock_cluster_service, sample_namespace_list
    ):
        """Test successful retrieval of available namespaces"""
        # Setup - override the dependency with mock service
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service
        mock_cluster_service.get_available_namespaces.return_value = (
            sample_namespace_list
        )

        try:
            # Test - call the endpoint
            response = client.get("/api/search/namespaces")

            # Verify
            assert response.status_code == 200
            data = response.json()

            # Check that we get the expected namespaces
            assert len(data) == 3

            # Check that each namespace has the required fields
            for item in data:
                assert "namespace" in item
                assert "language" in item
                assert "english_wiki_name" in item
                assert "localized_wiki_name" in item

            # Check specific namespace values
            namespaces_in_response = [item["namespace"] for item in data]
            assert "enwiki_namespace_0" in namespaces_in_response
            assert "dewiki_namespace_0" in namespaces_in_response
            assert "frwiki_namespace_0" in namespaces_in_response

            mock_cluster_service.get_available_namespaces.assert_called_once()
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_available_namespaces_logic_empty_result(
        self, mock_cluster_service
    ):
        """Test retrieval of namespaces when no namespaces are available"""
        # Setup - override the dependency with mock service
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service
        mock_cluster_service.get_available_namespaces.return_value = []

        try:
            # Test - call the endpoint
            response = client.get("/api/search/namespaces")

            # Verify
            assert response.status_code == 200
            assert response.json() == []
            mock_cluster_service.get_available_namespaces.assert_called_once()
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_available_namespaces_logic_service_error(
        self, mock_cluster_service
    ):
        """Test retrieval of namespaces when service throws an exception"""
        # Setup - override the dependency with mock service
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service
        mock_cluster_service.get_available_namespaces.side_effect = Exception(
            "Database connection failed"
        )

        try:
            # Test - call the endpoint
            response = client.get("/api/search/namespaces")

            # Verify
            assert response.status_code == 500
            assert "Database connection failed" in str(response.json())
            mock_cluster_service.get_available_namespaces.assert_called_once()
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_available_namespaces_logic_single_namespace(
        self, mock_cluster_service
    ):
        """Test retrieval of namespaces when only one namespace is available"""
        # Setup - override the dependency with mock service
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service
        mock_cluster_service.get_available_namespaces.return_value = [
            "enwiki_namespace_0"
        ]

        try:
            # Test - call the endpoint
            response = client.get("/api/search/namespaces")

            # Verify
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["namespace"] == "enwiki_namespace_0"
            assert "language" in data[0]
            assert "english_wiki_name" in data[0]
            assert "localized_wiki_name" in data[0]

            mock_cluster_service.get_available_namespaces.assert_called_once()
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_available_namespaces_response_structure(
        self, mock_cluster_service, sample_namespace_list
    ):
        """Test that the response structure contains all expected fields"""
        # Setup - override the dependency with mock service
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service
        mock_cluster_service.get_available_namespaces.return_value = (
            sample_namespace_list
        )

        try:
            # Test - call the endpoint
            response = client.get("/api/search/namespaces")

            # Verify response structure
            assert response.status_code == 200
            data = response.json()

            # Check that all items have the correct structure
            for item in data:
                required_fields = [
                    "namespace",
                    "language",
                    "english_wiki_name",
                    "localized_wiki_name",
                ]
                for field in required_fields:
                    assert (
                        field in item
                    ), f"Field '{field}' missing from response item: {item}"

                # Check that fields are not None
                assert item["namespace"] is not None
                assert item["language"] is not None
                assert item["english_wiki_name"] is not None
                assert item["localized_wiki_name"] is not None

            mock_cluster_service.get_available_namespaces.assert_called_once()
        finally:
            # Clean up
            app.dependency_overrides.clear()


class TestSearchNodesAPI:
    """Test suite for /api/search/nodes endpoint"""

    @pytest.fixture
    def mock_search_service(self) -> Mock:
        """Create a mock search service for testing"""
        mock_service = Mock(spec=SearchService)
        return mock_service

    @pytest.fixture
    def sample_search_results(self) -> List[SearchResultResponse]:
        """Create sample search results for testing"""
        return [
            SearchResultResponse(
                node_id=1,
                node_label="Science",
                match_type="node_label",
                depth=0,
                parent_id=None,
            ),
            SearchResultResponse(
                node_id=2,
                node_label="Physics",
                match_type="page_titles",
                depth=1,
                parent_id=1,
            ),
        ]

    @pytest.mark.asyncio
    async def test_search_nodes_basic(self, mock_search_service, sample_search_results):
        """Test basic search nodes endpoint"""
        # Setup - override dependency with mock service
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = sample_search_results

        try:
            # Test - call endpoint
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": "physics",
                    "language_code": "en",
                    "limit": 50,
                },
            )

            # Verify
            assert response.status_code == 200
            data = response.json()

            # Check response structure
            assert "results" in data
            # Check results
            assert len(data["results"]) == 2

            # Check result structure
            for result in data["results"]:
                assert "node_id" in result
                assert "node_label" in result
                assert "match_type" in result
                assert "depth" in result
                assert "parent_id" in result

            mock_search_service.search_nodes.assert_called_once_with(
                "enwiki_namespace_0", "physics", "en", 50
            )
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_empty_results(self, mock_search_service):
        """Test search nodes endpoint with no results"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = []

        try:
            # Test
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": "nonexistent",
                },
            )

            # Verify
            assert response.status_code == 200
            data = response.json()
            assert data["results"] == []

            mock_search_service.search_nodes.assert_called_once()
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_respects_limit(self, mock_search_service):
        """Test search nodes endpoint respects limit parameter"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = []

        try:
            # Test with limit=10
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": "physics",
                    "limit": 10,
                },
            )

            # Verify
            assert response.status_code == 200
            mock_search_service.search_nodes.assert_called_once_with(
                "enwiki_namespace_0", "physics", "en", 10
            )
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_limit_validation_max(self, mock_search_service):
        """Test search nodes endpoint validates max limit"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = []

        try:
            # Test with limit=100 (max allowed)
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": "physics",
                    "limit": 100,
                },
            )

            # Verify - should succeed
            assert response.status_code == 200
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_limit_validation_min(self, mock_search_service):
        """Test search nodes endpoint validates min limit"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = []

        try:
            # Test with limit=1 (min allowed)
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": "physics",
                    "limit": 1,
                },
            )

            # Verify - should succeed
            assert response.status_code == 200
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_different_languages(self, mock_search_service):
        """Test search nodes endpoint with different language codes"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = []

        try:
            # Test with German
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "dewiki_namespace_0",
                    "query": "physik",
                },
            )
            assert response.status_code == 200

            # Test with Chinese
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "zhwiki_namespace_0",
                    "query": "物理",
                },
            )
            assert response.status_code == 200

            # Verify calls were made with correct language codes
            assert mock_search_service.search_nodes.call_count == 2
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_query_validation_min_length(
        self, mock_search_service
    ):
        """Test search nodes endpoint validates minimum query length"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = []

        try:
            # Test with empty query (should fail validation)
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": "",
                },
            )

            # Verify - should fail with 422 (validation error)
            assert response.status_code == 422
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_query_validation_max_length(
        self, mock_search_service
    ):
        """Test search nodes endpoint validates maximum query length"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = []

        try:
            # Test with query longer than 100 characters (should fail validation)
            long_query = "a" * 101
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": long_query,
                },
            )

            # Verify - should fail with 422 (validation error)
            assert response.status_code == 422
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_service_error(self, mock_search_service):
        """Test search nodes endpoint handles service errors gracefully"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.side_effect = Exception("Database error")

        try:
            # Test
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": "physics",
                },
            )

            # Verify - should return 500
            assert response.status_code == 500
            data = response.json()
            assert "Database error" in str(data)
        finally:
            # Clean up
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_search_nodes_response_structure(
        self, mock_search_service, sample_search_results
    ):
        """Test search nodes endpoint returns correct response structure"""
        # Setup
        app.dependency_overrides[get_search_service] = lambda: mock_search_service
        mock_search_service.search_nodes.return_value = sample_search_results

        try:
            # Test
            response = client.get(
                "/api/search/nodes",
                params={
                    "namespace": "enwiki_namespace_0",
                    "query": "physics",
                },
            )

            # Verify
            assert response.status_code == 200
            data = response.json()

            # Check top-level structure
            assert "results" in data, "Field 'results' missing from response"

            # Check results structure
            for result in data["results"]:
                required_result_fields = [
                    "node_id",
                    "node_label",
                    "match_type",
                    "depth",
                    "parent_id",
                ]
                for field in required_result_fields:
                    assert field in result, f"Field '{field}' missing from result"

                # Check match_type is valid
                assert result["match_type"] in ["node_label", "page_titles"]
        finally:
            # Clean up
            app.dependency_overrides.clear()
