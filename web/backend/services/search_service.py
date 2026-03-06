"""
Search service for FTS5-based full-text search across cluster nodes and pages
"""

import logging

from services.service_model import ManagedService
from services.database_service import DatabaseService
from models.search import SearchResultResponse

logger = logging.getLogger(__name__)

# Language-specific FTS5 configurations
FTS5_LANGUAGE_CONFIG = {
    'en': {'use_stemming': True},      # English with Porter stemming
    'de': {'use_stemming': False},     # German
    'fr': {'use_stemming': False},     # French
    'es': {'use_stemming': False},     # Spanish
    'pt': {'use_stemming': False},     # Portuguese
    'it': {'use_stemming': False},     # Italian
    'ru': {'use_stemming': False},     # Russian
    'zh': {'use_stemming': False},     # Chinese (character-level)
    'ja': {'use_stemming': False},     # Japanese (character-level)
    'ko': {'use_stemming': False},     # Korean (character-level)
    'ar': {'use_stemming': False},     # Arabic
    'arz': {'use_stemming': False},    # Egyptian Arabic
    'th': {'use_stemming': False},     # Thai
    'vi': {'use_stemming': False},     # Vietnamese
}


class SearchService(ManagedService):
    """Service for FTS5-based search across cluster nodes and pages."""

    def __init__(self, database_service: DatabaseService):
        """Initialize SearchService with DatabaseService dependency."""
        self.db_service = database_service
        logger.info("SearchService initialized")

    def _prepare_fts5_query(self, query: str, language_code: str) -> str:
        """Prepare FTS5 query based on language configuration."""
        # Escape FTS5 special characters
        escaped = query.replace('"', '""')

        config = FTS5_LANGUAGE_CONFIG.get(language_code, {'use_stemming': False})

        # Phrase search (quoted) - return as-is
        if query.startswith('"') and query.endswith('"'):
            return escaped

        # Add prefix wildcard for non-English or non-stemming languages
        if not config['use_stemming']:
            return f'{escaped}*'

        # English with stemming - return as-is
        return escaped

    def search_nodes(
        self,
        namespace: str,
        query: str,
        language_code: str,
        limit: int = 50
    ) -> list[SearchResultResponse]:
        """Search cluster nodes using FTS5 full-text search."""
        sqlconn = self.db_service._get_connection(namespace)
        fts_query = self._prepare_fts5_query(query, language_code)

        # Flattened query - bm25() must be called in the outermost query context
        sql = """
        SELECT
            ct.node_id,
            ct.final_label,
            'page_titles' as match_type,
            ct.depth,
            ct.parent_id,
            bm25(cluster_tree_fts) as relevance_score
        FROM cluster_tree_fts
        INNER JOIN cluster_tree ct ON ct.namespace = cluster_tree_fts.namespace
                                   AND ct.node_id = cluster_tree_fts.node_id
        WHERE cluster_tree_fts MATCH :fts_query
          AND cluster_tree_fts.namespace = :namespace
        ORDER BY bm25(cluster_tree_fts) ASC
        LIMIT :limit;
        """
        logger.debug(f"Executing FTS5 search query: {sql}")
        logger.debug(f"Query parameters: namespace={namespace}, fts_query={fts_query}, limit={limit}")

        try:
            cursor = sqlconn.execute(sql, {"namespace": namespace, "fts_query": fts_query, "limit": limit})
            rows = cursor.fetchall()
            return [
                SearchResultResponse(
                    node_id=row[0], node_label=row[1],
                    match_type=row[2], depth=row[3], parent_id=row[4]
                )
                for row in rows
            ]
        except Exception as e:
            logger.error(f"FTS5 search error for namespace {namespace}: {e}")
            return []  # Return empty on error (FTS5 tables missing, query syntax error, etc.)

    def shutdown(self) -> None:
        """Shutdown the service."""
        logger.info("SearchService shutdown")
