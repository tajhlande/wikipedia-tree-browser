"""
Unit tests for search API logic in api/search.py
Testing the core logic without FastAPI dependency injection
"""

import pytest
from unittest.mock import Mock
from typing import List

from fastapi.testclient import TestClient
from services.cluster_service import ClusterService
from services.service_setup import get_cluster_service
from util.languages import LanguageInfo

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
