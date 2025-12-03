from abc import abstractmethod
from typing import Optional

from web.backend.models.cluster import ClusterNodeResponse
from web.backend.models.page import PageResponse
from web.backend.services.service_model import ManagedService


class ClusterService(ManagedService):

    # ====================================================================================================
    # Page-related methods

    @abstractmethod
    def get_page_by_id(self, namespace: str, page_id: int) -> Optional[PageResponse]:
        pass

    @abstractmethod
    def get_pages_in_cluster(self, namespace: str, cluster_node_id: int, limit: int = 50, offset: int = 0
                             ) -> list[PageResponse]:
        pass

    # ====================================================================================================
    # Cluster-related methods

    @abstractmethod
    def get_root_node(self, namespace: str) -> Optional[ClusterNodeResponse]:
        pass

    @abstractmethod
    def get_cluster_node(self, namespace: str, node_id: int) -> Optional[ClusterNodeResponse]:
        pass

    @abstractmethod
    def get_cluster_node_children(self, namespace, node_id: int) -> list[ClusterNodeResponse]:
        pass

    @abstractmethod
    def get_cluster_node_siblings(self, namespace, node_id: int) -> list[ClusterNodeResponse]:
        pass

    @abstractmethod
    def get_cluster_node_parent(self, namespace, node_id: int) -> Optional[ClusterNodeResponse]:
        pass

    # ====================================================================================================
    # Other methods

    @abstractmethod
    def get_available_namespaces(self) -> list[str]:
        pass
