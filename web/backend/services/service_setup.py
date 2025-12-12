from functools import partial
import logging

from typing import Any
from services.database_service import DatabaseService
from services.service_model import ManagedService

logger = logging.getLogger(__name__)

# Set up dependencies for injection
global _service_catalog
_service_catalog: dict[str, ManagedService] = dict()


def init_services():
    """Initialize all the services here. This should be called upon system startup."""
    logger.info("Initializing services")
    _service_catalog["cluster_service"] = DatabaseService()
    logger.debug("Service initialization complete")


def shutdown_services():
    logger.info("Shutting down services")
    for service_name in _service_catalog:
        try:
            _service_catalog[service_name].shutdown()
        except Exception as e:
            logger.warning("Exception while shutting down %s: %s", service_name, e)
    logger.debug("Service shutdown complete")


def service_provider(service_name: str) -> Any:
    """
    Provide a given service instance by name.
    Raises a ValueError if the name doesn't reference a service.
    """
    # return the actual instance
    if service_name in _service_catalog:
        return _service_catalog[service_name]
    else:
        raise ValueError(f"No service named {service_name}")


get_cluster_service = partial(service_provider, "cluster_service")
