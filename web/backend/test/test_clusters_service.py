"""
Unit tests for cluster API endpoints in api/clusters.py
Testing the functions directly without FastAPI app context
"""

import pytest
from unittest.mock import Mock, patch
from typing import List

from fastapi.testclient import TestClient
from models.cluster import ClusterNodeResponse
from services.cluster_service import ClusterService
from services.service_setup import get_cluster_service

from app.main import app

client = TestClient(app)


class TestClusterAPIUnit:
    """Unit test suite for cluster API functions"""

    @pytest.fixture
    def mock_cluster_service(self) -> Mock:
        """Create a mock cluster service for testing"""
        mock_service = Mock(spec=ClusterService)
        return mock_service

    @pytest.fixture
    def sample_cluster_node(self) -> ClusterNodeResponse:
        """Create a sample cluster node for testing"""
        return ClusterNodeResponse(
            node_id=1,
            namespace="enwiki_namespace_0",
            parent_id=None,
            depth=0,
            doc_count=100,
            child_count=5,
            final_label="Root Topic",
        )

    @pytest.fixture
    def sample_child_nodes(self) -> List[ClusterNodeResponse]:
        """Create sample child nodes for testing"""
        return [
            ClusterNodeResponse(
                node_id=2,
            namespace="enwiki_namespace_0",
                parent_id=1,
                depth=1,
                doc_count=50,
                child_count=2,
                final_label="Child Topic 1",
            ),
            ClusterNodeResponse(
                node_id=3,
            namespace="enwiki_namespace_0",
                parent_id=1,
                depth=1,
                doc_count=30,
                child_count=1,
                final_label="Child Topic 2",
            ),
        ]

    @pytest.fixture
    def sample_sibling_nodes(self) -> List[ClusterNodeResponse]:
        """Create sample sibling nodes for testing"""
        return [
            ClusterNodeResponse(
                node_id=4,
            namespace="enwiki_namespace_0",
                parent_id=1,
                depth=1,
                doc_count=20,
                child_count=0,
                final_label="Sibling Topic 1",
            ),
            ClusterNodeResponse(
                node_id=5,
            namespace="enwiki_namespace_0",
                parent_id=1,
                depth=1,
                doc_count=25,
                child_count=0,
                final_label="Sibling Topic 2",
            ),
        ]

    @pytest.fixture
    def sample_parent_node(self) -> ClusterNodeResponse:
        """Create a sample parent node for testing"""
        return ClusterNodeResponse(
            node_id=0,
            namespace="enwiki_namespace_0",
            parent_id=None,
            depth=-1,
            doc_count=200,
            child_count=1,
            final_label="Parent Topic",
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_root_node_success(
        self, mock_service_provider, mock_cluster_service, sample_cluster_node
    ):
        """Test successful retrieval of root node"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_root_node.return_value = sample_cluster_node
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get("/api/clusters/namespace/enwiki_namespace_0/root_node")

        # Verify
        assert response.status_code == 200, "Status code was not 200"
        assert response.json() == {
            "node_id": 1,
            "namespace": "enwiki_namespace_0",
            "parent_id": None,
            "depth": 0,
            "doc_count": 100,
            "child_count": 5,
            "final_label": "Root Topic",
        }
        mock_cluster_service.get_root_node.assert_called_once_with("enwiki_namespace_0")

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_root_node_not_found(
        self, mock_service_provider, mock_cluster_service
    ):
        """Test retrieval of root node when not found"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_root_node.return_value = None
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get("/api/clusters/namespace/enwiki_namespace_0/root_node")

        # Verify
        assert response.status_code == 404, "Status code was not 404"
        assert "Root node not found" in response.json()["detail"]
        mock_cluster_service.get_root_node.assert_called_once_with("enwiki_namespace_0")

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_root_node_service_error(
        self, mock_service_provider, mock_cluster_service
    ):
        """Test retrieval of root node when service throws an exception"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_root_node.side_effect = Exception(
            "Database connection failed"
        )
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get("/api/clusters/namespace/enwiki_namespace_0/root_node")

        # Verify
        assert response.status_code == 500, "Status code was not 500"
        assert "Error retrieving root node" in response.json()["detail"]
        mock_cluster_service.get_root_node.assert_called_once_with("enwiki_namespace_0")

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_success(
        self, mock_service_provider, mock_cluster_service, sample_cluster_node
    ):
        """Test successful retrieval of cluster node"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node.return_value = sample_cluster_node
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get("/api/clusters/namespace/enwiki_namespace_0/node_id/1")

        # Verify
        assert response.status_code == 200, "Status code was not 200"
        assert response.json() == {
            "node_id": 1,
            "namespace": "enwiki_namespace_0",
            "parent_id": None,
            "depth": 0,
            "doc_count": 100,
            "child_count": 5,
            "final_label": "Root Topic",
        }
        mock_cluster_service.get_cluster_node.assert_called_once_with(
            "enwiki_namespace_0", 1
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_not_found(
        self, mock_service_provider, mock_cluster_service
    ):
        """Test retrieval of cluster node when not found"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node.return_value = None
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get("/api/clusters/namespace/enwiki_namespace_0/node_id/999")

        # Verify
        assert response.status_code == 404, "Status code was not 404"
        assert "Cluster node not found" in response.json()["detail"]
        mock_cluster_service.get_cluster_node.assert_called_once_with(
            "enwiki_namespace_0", 999
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_service_error(
        self, mock_service_provider, mock_cluster_service
    ):
        """Test retrieval of cluster node when service throws an exception"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node.side_effect = Exception("Query failed")
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get("/api/clusters/namespace/enwiki_namespace_0/node_id/1")

        # Verify
        assert response.status_code == 500, "Status code was not 500"
        assert "Error retrieving cluster node" in response.json()["detail"]
        mock_cluster_service.get_cluster_node.assert_called_once_with(
            "enwiki_namespace_0", 1
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_children_success(
        self, mock_service_provider, mock_cluster_service, sample_child_nodes
    ):
        """Test successful retrieval of cluster node children"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node_children.return_value = sample_child_nodes
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get(
            "/api/clusters/namespace/enwiki_namespace_0/node_id/1/children"
        )

        # Verify
        assert response.status_code == 200, "Status code was not 200"
        assert response.json() == [
            {
                "node_id": 2,
            "namespace": "enwiki_namespace_0",
                "parent_id": 1,
                "depth": 1,
                "doc_count": 50,
                "child_count": 2,
                "final_label": "Child Topic 1",
            },
            {
                "node_id": 3,
            "namespace": "enwiki_namespace_0",
                "parent_id": 1,
                "depth": 1,
                "doc_count": 30,
                "child_count": 1,
                "final_label": "Child Topic 2",
            },
        ]
        mock_cluster_service.get_cluster_node_children.assert_called_once_with(
            "enwiki_namespace_0", 1
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_children_service_error(
        self, mock_service_provider, mock_cluster_service
    ):
        """Test retrieval of cluster node children when service throws an exception"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node_children.side_effect = Exception(
            "Connection error"
        )
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get(
            "/api/clusters/namespace/enwiki_namespace_0/node_id/1/children"
        )

        # Verify
        assert response.status_code == 500, "Status code was not 500"
        assert "Error retrieving cluster children" in response.json()["detail"]
        mock_cluster_service.get_cluster_node_children.assert_called_once_with(
            "enwiki_namespace_0", 1
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_siblings_success(
        self, mock_service_provider, mock_cluster_service, sample_sibling_nodes
    ):
        """Test successful retrieval of cluster node siblings"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node_siblings.return_value = (
            sample_sibling_nodes
        )
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get(
            "/api/clusters/namespace/enwiki_namespace_0/node_id/6/siblings"
        )

        # Verify
        assert response.status_code == 200, "Status code was not 200"
        assert response.json() == [
            {
                "node_id": 4,
            "namespace": "enwiki_namespace_0",
                "parent_id": 1,
                "depth": 1,
                "doc_count": 20,
                "child_count": 0,
                "final_label": "Sibling Topic 1",
            },
            {
                "node_id": 5,
            "namespace": "enwiki_namespace_0",
                "parent_id": 1,
                "depth": 1,
                "doc_count": 25,
                "child_count": 0,
                "final_label": "Sibling Topic 2",
            },
        ]
        mock_cluster_service.get_cluster_node_siblings.assert_called_once_with(
            "enwiki_namespace_0", 6
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_siblings_service_error(
        self, mock_service_provider, mock_cluster_service
    ):
        """Test retrieval of cluster node siblings when service throws an exception"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node_siblings.side_effect = Exception(
            "Query timeout"
        )
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get(
            "/api/clusters/namespace/enwiki_namespace_0/node_id/6/siblings"
        )

        # Verify
        assert response.status_code == 500, "Status code was not 500"
        assert "Error retrieving cluster siblings" in response.json()["detail"]
        mock_cluster_service.get_cluster_node_siblings.assert_called_once_with(
            "enwiki_namespace_0", 6
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_parent_success(
        self, mock_service_provider, mock_cluster_service, sample_parent_node
    ):
        """Test successful retrieval of cluster node parent"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node_parent.return_value = sample_parent_node
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get(
            "/api/clusters/namespace/enwiki_namespace_0/node_id/1/parent"
        )

        # Verify
        assert response.status_code == 200, "Status code was not 200"
        assert response.json() == {
            "node_id": 0,
            "namespace": "enwiki_namespace_0",
            "parent_id": None,
            "depth": -1,
            "doc_count": 200,
            "child_count": 1,
            "final_label": "Parent Topic",
        }
        mock_cluster_service.get_cluster_node_parent.assert_called_once_with(
            "enwiki_namespace_0", 1
        )

    @patch("api.clusters.service_provider")
    @pytest.mark.asyncio
    async def test_get_cluster_node_parent_service_error(
        self, mock_service_provider, mock_cluster_service
    ):
        """Test retrieval of cluster node parent when service throws an exception"""
        # Setup
        mock_service_provider.return_value = mock_cluster_service
        mock_cluster_service.get_cluster_node_parent.side_effect = Exception(
            "Database error"
        )
        app.dependency_overrides[get_cluster_service] = lambda: mock_cluster_service

        # Test
        response = client.get(
            "/api/clusters/namespace/enwiki_namespace_0/node_id/1/parent"
        )

        # Verify
        assert response.status_code == 500, "Status code was not 500"
        assert "Error retrieving cluster parent" in response.json()["detail"]
        mock_cluster_service.get_cluster_node_parent.assert_called_once_with(
            "enwiki_namespace_0", 1
        )
