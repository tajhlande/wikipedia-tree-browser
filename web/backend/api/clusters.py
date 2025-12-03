"""
Cluster tree API endpoints for Wikipedia Embeddings
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Path
from typing import Annotated, List

from web.backend.models.cluster import ClusterNodeResponse
from web.backend.services.cluster_service import ClusterService
from web.backend.services.service_setup import service_provider

router = APIRouter()


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


@router.get("/namespace/{namespace}/root_node", response_model=ClusterNodeResponse)
async def get_root_node(
    namespace: Annotated[str, Path(title="Wikipedia namespace")],
    cluster_service: ClusterService = Depends(lambda: service_provider("cluster_service")),
):
    """Get details for a specific cluster node"""
    logger.debug("get_root_node()")
    try:
        node = cluster_service.get_root_node(namespace)
        if not node:
            raise HTTPException(status_code=404, detail=f"Root node not found for namespace '{namespace}'")

        return node
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unable to find root node")
        raise HTTPException(status_code=500, detail=f"Error retrieving root node: {str(e)}")


@router.get("/namespace/{namespace}/node_id/{node_id}", response_model=ClusterNodeResponse)
async def get_cluster_node(
    namespace: Annotated[str, Path(title="Wikipedia namespace")],
    node_id: Annotated[int, Path(title="Cluster node ID")],
    cluster_service: ClusterService = Depends(lambda: service_provider("cluster_service")),
):
    """Get details for a specific cluster node"""
    logger.debug("get_cluster_node()")
    try:
        node = cluster_service.get_cluster_node(namespace, node_id)
        if not node:
            raise HTTPException(status_code=404, detail="Cluster node not found")

        return node
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unable to find node")
        raise HTTPException(status_code=500, detail=f"Error retrieving cluster node: {str(e)}")


@router.get("/namespace/{namespace}/node_id/{node_id}/children", response_model=List[ClusterNodeResponse])
async def get_cluster_node_children(
    namespace: Annotated[str, Path(title="Wikipedia namespace")],
    node_id: Annotated[int, Path(title="Cluster node ID")],
    cluster_service: ClusterService = Depends(lambda: service_provider("cluster_service")),
):
    """Get child nodes of a specific cluster node"""
    logger.debug("get_cluster_node_children()")
    try:
        children = cluster_service.get_cluster_node_children(namespace, node_id)
        return children
    except Exception as e:
        logger.exception("Unable to find children")
        raise HTTPException(status_code=500, detail=f"Error retrieving cluster children: {str(e)}")


@router.get("/namespace/{namespace}/node_id/{node_id}/siblings", response_model=List[ClusterNodeResponse])
async def get_cluster_node_siblings(
    namespace: Annotated[str, Path(title="Wikipedia namespace")],
    node_id: Annotated[int, Path(title="Cluster node ID")],
    cluster_service: ClusterService = Depends(lambda: service_provider("cluster_service")),
):
    """Get child nodes of a specific cluster node"""
    logger.debug("get_cluster_node_siblings()")
    try:
        children = cluster_service.get_cluster_node_siblings(namespace, node_id)
        return children
    except Exception as e:
        logger.exception("Unable to find siblings")
        raise HTTPException(status_code=500, detail=f"Error retrieving cluster children: {str(e)}")


@router.get("/namespace/{namespace}/node_id/{node_id}/parent")
async def get_cluster_node_parent(
    namespace: Annotated[str, Path(title="Wikipedia namespace")],
    node_id: Annotated[int, Path(title="Cluster node ID")],
    cluster_service: ClusterService = Depends(lambda: service_provider("cluster_service")),
):
    """Get parent node of a specific cluster node"""
    logger.debug("get_cluster_node_parent()")
    try:
        parent = cluster_service.get_cluster_node_parent(namespace, node_id)
        return parent
    except Exception as e:
        logger.exception("Unable to find parent")
        raise HTTPException(status_code=500, detail=f"Error retrieving cluster parent: {str(e)}")
