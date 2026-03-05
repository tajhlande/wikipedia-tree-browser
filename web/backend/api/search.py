"""
Search functionality API endpoints for Wikipedia Embeddings
"""

from typing import Annotated
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from services.cluster_service import ClusterService
from services.service_setup import get_cluster_service, get_search_service
from services.search_service import SearchService
from models.search import SearchNodeResponse

from util.languages import get_language_info_for_namespace
from util.cache import async_cache

router = APIRouter()

logger = logging.getLogger(__name__)


@router.get("/nodes", response_model=SearchNodeResponse)
@async_cache(key_prefix="search_nodes", ttl=300)
async def search_nodes(
    namespace: Annotated[str, Query(description="Wikipedia namespace")],
    query: Annotated[str, Query(min_length=1, max_length=100, description="Search query")],
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum results")] = 50,
    search_service: SearchService = Depends(get_search_service),
):
    """
    Search cluster nodes by label or linked page titles using FTS5.

    Supports:
    - Word search: 'physics'
    - Prefix search: 'phys*'
    - Phrase search: '"quantum physics"'
    - Boolean: 'physics AND quantum', 'physics OR chemistry'

    Results ranked by BM25 relevance.
    """
    try:
        language_code = get_language_info_for_namespace(namespace=namespace) . iso_639_1_code
        results = search_service.search_nodes(namespace, query, language_code, limit)
        return {
            "results": results,
        }
    except Exception as e:
        logger.exception("Error searching nodes")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@router.get("/namespaces")
@async_cache(key_prefix="available_namespaces")
async def get_available_namespaces(
    cluster_service: ClusterService = Depends(get_cluster_service),
):
    """Get list of available namespaces"""
    try:
        logger.debug("Called /namespaces")
        namespaces = cluster_service.get_available_namespaces()
        namespace_info_list = []
        for namespace in namespaces:
            language_info = get_language_info_for_namespace(namespace)
            namespace_info_list.append(
                {
                    "namespace": namespace,
                    "language": language_info.language,
                    "english_wiki_name": language_info.english_wiki_name,
                    "localized_wiki_name": language_info.localized_wiki_name,
                }
            )

        logger.debug("Returning %s", str(namespace_info_list))
        return namespace_info_list
    except Exception as e:
        logger.exception("Exception while retrieving namespaces")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving namespaces: {str(e)}"
        )
