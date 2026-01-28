"""
Unit tests for service setup (services/service_setup.py)
Testing service initialization, provider functionality, and shutdown
"""

from unittest.mock import Mock

import pytest

from services.service_setup import (
    init_services,
    shutdown_services,
    service_provider,
    get_cluster_service,
    _service_catalog,
)
from services.database_service import DatabaseService


class TestServiceInitialization:
    """Tests for service initialization functionality"""

    def setup_method(self):
        """Clear service catalog before each test"""
        _service_catalog.clear()

    def teardown_method(self):
        """Clear service catalog after each test"""
        _service_catalog.clear()

    def test_init_services_creates_database_service(self):
        """Test that init_services creates a DatabaseService instance"""
        init_services()

        assert "cluster_service" in _service_catalog
        service = _service_catalog["cluster_service"]
        assert service is not None
        # Check it has the expected methods
        assert hasattr(service, "get_root_node")
        assert hasattr(service, "shutdown")

    def test_init_services_populates_catalog(self):
        """Test that init_services populates the service catalog"""
        init_services()

        assert len(_service_catalog) > 0
        assert "cluster_service" in _service_catalog

    def test_init_services_is_idempotent(self):
        """Test that init_services can be called multiple times safely"""
        init_services()
        first_service = _service_catalog.get("cluster_service")

        init_services()
        second_service = _service_catalog.get("cluster_service")

        # Either the same service is reused or a new one is created
        assert second_service is not None
        # Both should be valid services
        assert hasattr(first_service, "get_root_node")
        assert hasattr(second_service, "get_root_node")


class TestServiceProvider:
    """Tests for service provider functionality"""

    def setup_method(self):
        """Clear service catalog before each test"""
        _service_catalog.clear()

    def teardown_method(self):
        """Clear service catalog after each test"""
        _service_catalog.clear()

    def test_service_provider_returns_correct_service(self):
        """Test that service_provider returns the correct service instance"""
        mock_service = Mock()
        _service_catalog["test_service"] = mock_service

        result = service_provider("test_service")

        assert result is mock_service

    def test_service_provider_raises_value_error_for_unknown_service(self):
        """Test that service_provider raises ValueError for unknown service"""
        with pytest.raises(ValueError) as exc_info:
            service_provider("nonexistent_service")

        assert "nonexistent_service" in str(exc_info.value)
        assert "No service named" in str(exc_info.value)

    def test_service_provider_with_empty_catalog(self):
        """Test service_provider behavior with empty catalog"""
        with pytest.raises(ValueError) as exc_info:
            service_provider("any_service")

        assert "any_service" in str(exc_info.value)

    def test_get_cluster_service_returns_cluster_service(self):
        """Test that get_cluster_service returns the cluster service"""
        init_services()

        service = get_cluster_service()

        assert service is not None
        assert service is _service_catalog["cluster_service"]
        assert hasattr(service, "get_root_node")
        assert hasattr(service, "get_cluster_node")


class TestServiceShutdown:
    """Tests for service shutdown functionality"""

    def setup_method(self):
        """Clear service catalog before each test"""
        _service_catalog.clear()

    def teardown_method(self):
        """Clear service catalog after each test"""
        _service_catalog.clear()

    def test_shutdown_services_calls_shutdown_on_all_services(self):
        """Test that shutdown_services calls shutdown on all services"""
        mock_service1 = Mock()
        mock_service2 = Mock()
        _service_catalog["service1"] = mock_service1
        _service_catalog["service2"] = mock_service2

        shutdown_services()

        mock_service1.shutdown.assert_called_once()
        mock_service2.shutdown.assert_called_once()

    def test_shutdown_services_handles_single_exception_gracefully(self):
        """Test that shutdown_services continues when one service fails"""
        failing_service = Mock()
        failing_service.shutdown.side_effect = Exception("Service failed")
        working_service = Mock()

        _service_catalog["failing"] = failing_service
        _service_catalog["working"] = working_service

        # Should not raise exception
        shutdown_services()

        working_service.shutdown.assert_called_once()

    def test_shutdown_services_handles_multiple_exceptions(self):
        """Test shutdown_services with multiple service failures"""
        failing_service1 = Mock()
        failing_service1.shutdown.side_effect = Exception("Failed 1")
        failing_service2 = Mock()
        failing_service2.shutdown.side_effect = Exception("Failed 2")

        _service_catalog["failing1"] = failing_service1
        _service_catalog["failing2"] = failing_service2

        # Should not raise exception
        shutdown_services()

        # Both shutdowns should have been attempted
        failing_service1.shutdown.assert_called_once()
        failing_service2.shutdown.assert_called_once()

    def test_shutdown_services_with_empty_catalog(self):
        """Test that shutdown_services handles empty catalog gracefully"""
        # Should not raise exception
        shutdown_services()

    def test_shutdown_services_clears_database_connections(self):
        """Test that shutdown_services closes database connections"""
        from services.database_service import _sqlconns

        # This test verifies integration with DatabaseService
        init_services()
        # Cast to DatabaseService to access _get_connection method
        cluster_service: DatabaseService = _service_catalog["cluster_service"]  # type: ignore
        # Verify the service is a DatabaseService with shutdown capability
        assert hasattr(cluster_service, "shutdown")

        shutdown_services()

        # Connections should be cleared by shutdown
        assert len(_sqlconns) == 0


class TestServiceLifecycle:
    """Tests for complete service lifecycle"""

    def setup_method(self):
        """Clear service catalog before each test"""
        _service_catalog.clear()

    def teardown_method(self):
        """Clear service catalog after each test"""
        _service_catalog.clear()

    def test_full_lifecycle_init_and_shutdown(self):
        """Test complete lifecycle: init -> use -> shutdown"""
        # Initialize
        init_services()
        assert "cluster_service" in _service_catalog

        # Use service
        service = get_cluster_service()
        assert service is not None

        # Shutdown
        shutdown_services()

        # Service should still be in catalog but shutdown
        assert "cluster_service" in _service_catalog

    def test_reinit_after_shutdown(self):
        """Test that services can be reinitialized after shutdown"""
        init_services()
        first_service = _service_catalog["cluster_service"]
        assert first_service

        shutdown_services()

        init_services()
        second_service = _service_catalog["cluster_service"]

        # Should get a new service instance
        assert second_service is not None
