"""
Unit tests for page API logic in web/backend/api/pages.py
Testing the core logic without FastAPI dependency injection
"""

import pytest
from unittest.mock import Mock
from typing import List

from fastapi.testclient import TestClient
from web.backend.models.page import PageResponse, PageDetailResponse
from web.backend.services.cluster_service import ClusterService

from web.backend.services.service_setup import get_cluster_service
from web.backend.main import app

client = TestClient(app)


class TestPageAPILogic:
    """Test suite for page API logic"""

    @pytest.fixture
    def mock_cluster_service(self) -> Mock:
        """Create a mock cluster service for testing"""
        mock_service = Mock(spec=ClusterService)
        return mock_service

    @pytest.fixture
    def sample_page_response(self) -> PageResponse:
        """Create a sample page response for testing"""
        return PageResponse(
            page_id=123,
            title="Test Page",
            abstract="This is a test page abstract",
            url="https://example.com/test_page",
            cluster_node_id=1
        )

    @pytest.fixture
    def sample_page_detail_response(self) -> PageDetailResponse:
        """Create a sample page detail response for testing"""
        return PageDetailResponse(
            page_id=123,
            title="Test Page",
            abstract="This is a test page abstract",
            url="https://example.com/test_page",
            cluster_node_id=1,
            three_d_vector=[0.1, 0.2, 0.3]
        )

    @pytest.fixture
    def sample_pages_list(self) -> List[PageResponse]:
        """Create a sample list of pages for testing"""
        return [
            PageResponse(
                page_id=123,
                title="Test Page 1",
                abstract="Abstract for page 1",
                url="https://example.com/page1",
                cluster_node_id=1
            ),
            PageResponse(
                page_id=456,
                title="Test Page 2",
                abstract="Abstract for page 2",
                url="https://example.com/page2",
                cluster_node_id=1
            ),
            PageResponse(
                page_id=789,
                title="Test Page 3",
                abstract="Abstract for page 3",
                url="https://example.com/page3",
                cluster_node_id=1
            )
        ]

    def test_get_pages_in_cluster_logic_success(self, mock_cluster_service, sample_pages_list):
        """Test successful retrieval of pages in cluster"""
        # Setup
        mock_cluster_service.get_pages_in_cluster.return_value = sample_pages_list
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the endpoint
        response = client.get("/api/pages/namespace/enwiki_namespace_0/node_id/1")

        # Verify
        assert response.status_code == 200
        assert response.json() == [
            {
                "page_id": 123,
                "title": "Test Page 1",
                "abstract": "Abstract for page 1",
                "url": "https://example.com/page1",
                "cluster_node_id": 1,
            },
            {
                "page_id": 456,
                "title": "Test Page 2",
                "abstract": "Abstract for page 2",
                "url": "https://example.com/page2",
                "cluster_node_id": 1,
            },
            {
                "page_id": 789,
                "title": "Test Page 3",
                "abstract": "Abstract for page 3",
                "url": "https://example.com/page3",
                "cluster_node_id": 1,
            },
        ]

        mock_cluster_service.get_pages_in_cluster.assert_called_once_with("enwiki_namespace_0", 1, 50, 0)

    def test_get_pages_in_cluster_logic_with_custom_params(self, mock_cluster_service, sample_pages_list):
        """Test retrieval of pages in cluster with custom limit and offset"""
        # Setup
        mock_cluster_service.get_pages_in_cluster.return_value = sample_pages_list[:2]  # Return first 2 pages
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the service method directly with custom params
        response = client.get("/api/pages/namespace/enwiki_namespace_0/node_id/1?limit=10&offset=5")

        # Verify
        assert response.status_code == 200, "Status code was not 200"
        print(f"Response.json:\n{response.json()}")
        assert response.json() == [
            {
                "page_id": 123,
                "title": "Test Page 1",
                "abstract": "Abstract for page 1",
                "url": "https://example.com/page1",
                "cluster_node_id": 1,
            },
            {
                "page_id": 456,
                "title": "Test Page 2",
                "abstract": "Abstract for page 2",
                "url": "https://example.com/page2",
                "cluster_node_id": 1,
            },
        ], "Page response did not match"

        mock_cluster_service.get_pages_in_cluster.assert_called_once_with("enwiki_namespace_0", 1, 10, 5)

    def test_get_pages_in_cluster_logic_service_error(self, mock_cluster_service):
        """Test retrieval of pages in cluster when service throws an exception"""
        # Setup
        mock_cluster_service.get_pages_in_cluster.reset
        mock_cluster_service.get_pages_in_cluster.side_effect = Exception("Database connection failed")
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the service method directly
        response = client.get("/api/pages/namespace/enwiki_namespace_0/node_id/1")

        # Verify
        assert response.status_code == 500, "Response status code should have been 500"
        assert "Database connection failed" in str(response.json()), "Database connection failure message not in body"
        mock_cluster_service.get_pages_in_cluster.assert_called_once_with("enwiki_namespace_0", 1, 50, 0)

    def test_get_pages_in_cluster_logic_empty_result(self, mock_cluster_service):
        """Test retrieval of pages in cluster when no pages are found"""
        # Setup
        mock_cluster_service.get_pages_in_cluster.return_value = []
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the service method directly
        response = client.get("/api/pages/namespace/enwiki_namespace_0/node_id/999")

        # Verify
        assert response.status_code == 200, "Response status code should have been 200"
        assert response.json() == [], "Response body did not match expected"
        mock_cluster_service.get_pages_in_cluster.assert_called_once_with("enwiki_namespace_0", 999, 50, 0)

    def test_get_pages_in_cluster_logic_large_limit(self, mock_cluster_service, sample_pages_list):
        """Test retrieval of pages in cluster with large limit"""
        # Setup
        mock_cluster_service.get_pages_in_cluster.return_value = sample_pages_list
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the service method directly with large limit
        response = client.get("/api/pages/namespace/enwiki_namespace_0/node_id/1?limit=1000&offset=0")

        # Verify
        assert response.status_code == 200, "Response status code should have been 200"
        assert response.json() == [
            {
                "page_id": 123,
                "title": "Test Page 1",
                "abstract": "Abstract for page 1",
                "url": "https://example.com/page1",
                "cluster_node_id": 1,
            },
            {
                "page_id": 456,
                "title": "Test Page 2",
                "abstract": "Abstract for page 2",
                "url": "https://example.com/page2",
                "cluster_node_id": 1,
            },
            {
                "page_id": 789,
                "title": "Test Page 3",
                "abstract": "Abstract for page 3",
                "url": "https://example.com/page3",
                "cluster_node_id": 1,
            },
        ], "Response body did not match expected"
        mock_cluster_service.get_pages_in_cluster.assert_called_once_with("enwiki_namespace_0", 1, 1000, 0)

    def test_get_page_by_id_logic_success(self, mock_cluster_service, sample_page_detail_response):
        """Test successful retrieval of page details"""
        # Setup
        mock_cluster_service.get_page_by_id.return_value = sample_page_detail_response
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the service method directly
        response = client.get("/api/pages/namespace/enwiki_namespace_0/page_id/123")

        # Verify
        assert response.status_code == 200, "Response status code should be 200"
        assert response.json() == {
            "page_id": 123,
            "title": "Test Page",
            "abstract": "This is a test page abstract",
            "url": "https://example.com/test_page",
            "cluster_node_id": 1,
            "three_d_vector": [0.1, 0.2, 0.3],
        }, "Response body did not match expected"
        mock_cluster_service.get_page_by_id.assert_called_once_with("enwiki_namespace_0", 123)

    def test_get_page_by_id_logic_not_found(self, mock_cluster_service):
        """Test retrieval of page details when page not found"""
        # Setup
        mock_cluster_service.get_page_by_id.return_value = None
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the service method directly
        response = client.get("/api/pages/namespace/enwiki_namespace_0/page_id/999")

        # Verify
        assert response.status_code == 404, "Response status code should be 404"
        mock_cluster_service.get_page_by_id.assert_called_once_with("enwiki_namespace_0", 999)

    def test_get_page_by_id_logic_service_error(self, mock_cluster_service):
        """Test retrieval of page details when service throws an exception"""
        # Setup
        mock_cluster_service.get_page_by_id.side_effect = Exception("Query failed")
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the service method directly
        response = client.get("/api/pages/namespace/enwiki_namespace_0/page_id/123")

        # Verify
        assert response.status_code == 500, "Response status code should be 500"
        assert "Query failed" in str(response.json()), "Response body did not contain 'Query failed' explanation"
        mock_cluster_service.get_page_by_id.assert_called_once_with("enwiki_namespace_0", 123)

    def test_get_page_by_id_logic_empty_abstract(self, mock_cluster_service):
        """Test retrieval of page details when abstract is None"""
        # Setup
        page_detail = PageDetailResponse(
            page_id=123,
            title="Test Page",
            abstract=None,
            url="https://example.com/test_page",
            cluster_node_id=1,
            three_d_vector=[0.1, 0.2, 0.3]
        )
        mock_cluster_service.get_page_by_id.return_value = page_detail
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test - call the service method directly
        response = client.get("/api/pages/namespace/enwiki_namespace_0/page_id/123")

        # Verify
        assert response.status_code == 200, "Response status code should be 200"
        assert response.json() == {
            "page_id": 123,
            "title": "Test Page",
            "abstract": None,
            "url": "https://example.com/test_page",
            "cluster_node_id": 1,
            "three_d_vector": [0.1, 0.2, 0.3],
        }
        mock_cluster_service.get_page_by_id.assert_called_once_with("enwiki_namespace_0", 123)
