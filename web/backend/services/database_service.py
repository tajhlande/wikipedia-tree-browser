"""
Database service wrapper for Wikipedia Embeddings API
Provides a clean interface between FastAPI endpoints and existing database.py functions
"""

import logging
import json
import os
import sqlite3
from dataclasses import fields
from pathlib import Path
from typing import Optional, Type, TypeVar, override

from pydantic import BaseModel

from models.cluster import ClusterNodeResponse
from models.page import PageResponse
from services.cluster_service import ClusterService

# needs from api/clusters.py
# node = db_service.get_root_node(namespace)
# node = db_service.get_cluster_node(namespace, node_id)
# children = db_service.get_cluster_node_children(namespace, node_id)
# children = db_service.get_cluster_node_siblings(namespace, node_id)
# parent = db_service.get_cluster_node_parent(namespace, node_id)

# logging setup
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Import dataclasses

_sqlconns = {}


def _get_sql_conn_for_file(db_file: str = "chunk_log.db") -> sqlite3.Connection:
    # if we already created a connection, just return that
    if _sqlconns.get(db_file):
        return _sqlconns[db_file]

    # otherwise, make a new connection
    logger.info("Establishing SQLite connection to %s", db_file)
    sqlconn = sqlite3.connect(db_file)
    sqlconn.row_factory = sqlite3.Row  # This enables dict-like access to rows

    # Performance pragmas
    try:
        sqlconn.execute("PRAGMA journal_mode=WAL;")
        sqlconn.execute("PRAGMA synchronous=NORMAL;")
        sqlconn.execute("PRAGMA temp_store = MEMORY;")
        sqlconn.execute("PRAGMA cache_size = -500000;")  # ~20MB cache (adjust as needed)
        sqlconn.execute("PRAGMA mmap_size = 8000000000;")  # ~8GB or larger than db
        sqlconn.execute("PRAGMA temp_store = MEMORY;")  # avoids disk I/O for: Sorts, GROUP BY, temp indices
        sqlconn.execute("PRAGMA locking_mode = EXCLUSIVE;")  # only use if only one process accesses the db
        sqlconn.execute("PRAGMA threads = 4;")  # use multiple threads
        sqlconn.execute("PRAGMA query_only = ON;")  # read only access
    except sqlite3.Error:
        pass

    # cache the connection for reuse later
    _sqlconns[db_file] = sqlconn
    return sqlconn


T = TypeVar("T")


def _row_to_dataclass(row: sqlite3.Row, cls: Type[T]) -> T:
    """Map a Row (dict-like) to the given dataclass."""
    # Build a dict of column_name → value
    col_dict = {k: row[k] for k in row.keys()}
    # Extract only the fields that the dataclass actually defines
    field_names = {f.name for f in fields(cls) if not f.name.startswith("_")}  # type: ignore
    logger.debug("Mapped dataclass fields for class %s", cls.__name__)
    for name in field_names:
        logger.debug("   Field name: %s", name)
    relevant = {k: v for k, v in col_dict.items() if k in field_names}
    return cls(**relevant)  # type: ignore[arg-type]


T = TypeVar("T", bound=BaseModel)


def _row_to_pydantic(row: sqlite3.Row, cls: Type[T]) -> T:
    """Map a sqlite3.Row to a Pydantic BaseModel."""
    col_dict = {k: row[k] for k in row.keys()}

    # Pydantic v2: model_fields contains all field definitions
    field_names = set(cls.model_fields.keys())

    # Keep only fields defined on the model
    relevant = {k: v for k, v in col_dict.items() if k in field_names}

    return cls(**relevant)


class DatabaseService(ClusterService):
    """Service class for database operations"""

    def __init__(self, db_directory: str = "../../data"):
        self.db_directory = db_directory
        self.logger = logging.getLogger(self.__class__.__name__)

    def _get_connection(self, namespace: str) -> sqlite3.Connection:
        """Get database connection for a namespace"""

        db_file_path = os.path.join(self.db_directory, f"{namespace}_slim.db")
        logger.debug("Namespace: %s, db file: %s", namespace, db_file_path)
        return _get_sql_conn_for_file(db_file_path)

    @override
    def shutdown(self) -> None:
        logger.debug("Closing SQL onnections")
        for db_name in _sqlconns:
            _sqlconns[db_name].close()
        _sqlconns.clear()

    # ====================================================================================================
    # Page-related methods
    def get_page_by_id(self, namespace: str, page_id: int) -> Optional[PageResponse]:
        """Get a page by ID"""
        sqlconn = self._get_connection(namespace)
        select_sql = """
            SELECT pl.page_id, pl.title, pl.abstract, pl.url, pv.cluster_node_id
            FROM page_log pl
            INNER JOIN page_vector pv on pl.namespace = pv.namespace and pl.page_id = pv.page_id
            WHERE pl.namespace = ? AND pl.page_id = ?
            LIMIT 1
            """
        cursor = sqlconn.execute(
            select_sql,
            (
                namespace,
                page_id,
            ),
        )
        row = cursor.fetchone()
        if row:
            return _row_to_pydantic(row, PageResponse)
        else:
            # logger.warning("No page found in namespace %s with page_id %d", namespace, page_id)
            return None

    def get_pages_in_cluster(
        self, namespace: str, cluster_node_id: int, limit: int = 50, offset: int = 0
    ) -> list[PageResponse]:
        """Get pages in a specific cluster node with pagination"""
        sqlconn = self._get_connection(namespace)
        select_sql = """
            SELECT pl.page_id, pl.title, pl.abstract, pl.url, pv.cluster_node_id
            FROM page_log pl
            INNER JOIN page_vector pv on pl.namespace = pv.namespace and pl.page_id = pv.page_id
            WHERE pl.namespace = ? AND pv.cluster_node_id = ?
            LIMIT ? OFFSET ?
        """
        cursor = sqlconn.execute(
            select_sql,
            (
                namespace,
                cluster_node_id,
                limit,
                offset,
            ),
        )
        rows = cursor.fetchall()
        return [_row_to_pydantic(row, PageResponse) for row in rows]

    # def search_clusters_by_title(self, namespace: str, title: str, limit: int = 10) -> List[Page]:
    #     """Search pages by title (simple implementation)"""
    #     conn = self._get_connection(namespace)

    #     sql = """
    #         SELECT pl.namespace, pl.page_id, pl.title, pl.chunk_name, pl.url, pl.extracted_at, pl.abstract
    #         FROM page_log pl
    #         WHERE pl.namespace = ? AND pl.title LIKE ?
    #         ORDER BY pl.title ASC
    #         LIMIT ?
    #     """

    # def search_pages(self, namespace: str, query: str, search_type: str = "title",
    #                   limit: int = 20, offset: int = 0) -> list[Page]:
    #     pass
    #     """Search pages by title, abstract, or both"""
    #     conn = self._get_connection(namespace)

    #     if search_type == "title":
    #         sql = """
    #             SELECT pl.namespace, pl.page_id, pl.title, pl.chunk_name, pl.url, pl.extracted_at, pl.abstract
    #             FROM page_log pl
    #             WHERE pl.namespace = ? AND pl.title LIKE ?
    #             ORDER BY pl.title ASC
    #             LIMIT ? OFFSET ?
    #         """
    #         params = (namespace, f"%{query}%", limit, offset)
    #     elif search_type == "abstract":
    #         sql = """
    #             SELECT pl.namespace, pl.page_id, pl.title, pl.chunk_name, pl.url, pl.extracted_at, pl.abstract
    #             FROM page_log pl
    #             WHERE pl.namespace = ? AND pl.abstract LIKE ?
    #             ORDER BY pl.title ASC
    #             LIMIT ? OFFSET ?
    #         """
    #         params = (namespace, f"%{query}%", limit, offset)
    #     else:  # both
    #         sql = """
    #             SELECT pl.namespace, pl.page_id, pl.title, pl.chunk_name, pl.url, pl.extracted_at, pl.abstract
    #             FROM page_log pl
    #             WHERE pl.namespace = ? AND (pl.title LIKE ? OR pl.abstract LIKE ?)
    #             ORDER BY pl.title ASC
    #             LIMIT ? OFFSET ?
    #         """
    #         params = (namespace, f"%{query}%", f"%{query}%", limit, offset)

    #     cursor = conn.execute(sql, params)
    #     rows = cursor.fetchall()

    #     pages = []
    #     return pages

    # ====================================================================================================
    # Cluster-related methods

    def get_cluster_node(
        self, namespace: str, node_id: int
    ) -> Optional[ClusterNodeResponse]:
        """Get a specific cluster node"""
        sqlconn = self._get_connection(namespace)
        select_sql = """
            SELECT node_id, namespace, parent_id, depth, doc_count, child_count, final_label, centroid_three_d
            FROM cluster_tree
            WHERE namespace = ? AND node_id = ?
        """
        params = (
            namespace,
            node_id,
        )
        logger.info("Running sql: %s\nwith params %s", select_sql, params)

        cursor = sqlconn.execute(select_sql, params)
        row = cursor.fetchone()
        if not row:
            return None
        return self._map_cluster_row_to_response(row, namespace)

    def get_cluster_node_children(
        self, namespace: str, node_id: int
    ) -> list[ClusterNodeResponse]:
        """Get child nodes of a specific cluster node"""
        sqlconn = self._get_connection(namespace)
        select_sql = """
            SELECT node_id, namespace, parent_id, depth, doc_count, child_count, final_label, centroid_three_d
            FROM cluster_tree
            WHERE namespace = ? AND parent_id = ?
            ORDER BY node_id ASC
        """
        cursor = sqlconn.execute(
            select_sql,
            (
                namespace,
                node_id,
            ),
        )
        rows = cursor.fetchall()
        return [self._map_cluster_row_to_response(row, namespace) for row in rows]

    def get_cluster_node_siblings(
        self, namespace, node_id: int
    ) -> list[ClusterNodeResponse]:
        """Get sibling nodes of a specific cluster node"""
        sqlconn = self._get_connection(namespace)
        select_sql = """
            SELECT p.node_id, p.namespace, p.parent_id, p.depth, p.doc_count, p.child_count,
                   p.final_label, p.centroid_three_d
            FROM cluster_tree AS p
            JOIN cluster_tree AS n ON n.namespace = p.namespace AND n.node_id = ?
            WHERE p.namespace = ?
                AND p.parent_id = n.parent_id
                AND p.node_id <> n.node_id
            ORDER BY p.node_id ASC;
        """
        cursor = sqlconn.execute(
            select_sql,
            (
                node_id,
                namespace,
            ),
        )
        rows = cursor.fetchall()
        return [self._map_cluster_row_to_response(row, namespace) for row in rows]

    def get_cluster_node_parent(
        self, namespace, node_id: int
    ) -> Optional[ClusterNodeResponse]:
        """Get parent node of a specific cluster node"""
        sqlconn = self._get_connection(namespace)
        select_sql = """
            SELECT p.node_id, p.namespace, p.parent_id, p.depth, p.doc_count, p.child_count,
                   p.final_label, p.centroid_three_d
            FROM cluster_tree AS p
            JOIN cluster_tree AS n ON n.namespace = p.namespace AND n.node_id = ?
            WHERE p.namespace = ?
                AND p.node_id = n.parent_id
            ORDER BY p.node_id ASC;
        """
        cursor = sqlconn.execute(
            select_sql,
            (
                node_id,
                namespace,
            ),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return self._map_cluster_row_to_response(row, namespace)

    def get_cluster_node_ancestors(
        self, namespace, node_id: int
    ) -> list[ClusterNodeResponse]:
        """Get parent node of a specific cluster node"""
        sqlconn = self._get_connection(namespace)
        select_sql = """
            WITH RECURSIVE ancestor_tree AS (
                SELECT node_id, namespace, parent_id, depth, doc_count, child_count, final_label, centroid_three_d
                FROM cluster_tree
                WHERE namespace = :namespace AND node_id = :node_id

                UNION ALL

                -- Recursive case: find parent of current node
                SELECT p.node_id, p.namespace, p.parent_id, p.depth, p.doc_count, p.child_count,
                    p.final_label, p.centroid_three_d
                FROM cluster_tree AS p
                JOIN ancestor_tree AS a ON a.parent_id = p.node_id AND a.namespace = p.namespace
                WHERE p.namespace = :namespace
            )
            SELECT node_id, namespace, parent_id, depth, doc_count, child_count, final_label, centroid_three_d
            FROM ancestor_tree
            WHERE node_id != :node_id  -- Exclude the original node
            ORDER BY depth DESC;  -- Order from root (highest depth) to direct parent (lowest depth)
        """
        cursor = sqlconn.execute(
            select_sql,
            {
                "node_id": node_id,
                "namespace": namespace,
            },
        )
        rows = cursor.fetchall()
        if not rows:
            return []
        return [self._map_cluster_row_to_response(row, namespace) for row in rows]

    def _map_cluster_row_to_response(
            self,
            row: sqlite3.Row,
            namespace: Optional[str] = None) -> ClusterNodeResponse:
        """Map database row to ClusterNodeResponse with proper field mapping and defaults"""
        # Convert row to dict for easier manipulation
        row_dict = {k: row[k] for k in row.keys()}

        # Handle centroid_three_d - it might be JSON string or None
        if 'centroid_three_d' in row_dict and row_dict['centroid_three_d']:
            try:
                centroid = json.loads(row_dict['centroid_three_d'])
                if isinstance(centroid, list) and len(centroid) == 3:
                    row_dict['centroid_3d'] = centroid
            except (json.JSONDecodeError, ValueError):
                # If JSON parsing fails, set to None
                row_dict['centroid_3d'] = None
        else:
            row_dict['centroid_3d'] = None

        # Ensure all required fields are present with defaults
        required_fields = {
            'node_id': row_dict.get('node_id'),
            'namespace': row_dict.get('namespace') or namespace,
            'parent_id': row_dict.get('parent_id'),
            'depth': row_dict.get('depth', 0),
            'doc_count': row_dict.get('doc_count', 0),
            'child_count': row_dict.get('child_count', 0),
            'final_label': row_dict.get('final_label') or row_dict.get('first_label'),
            'centroid_3d': row_dict.get('centroid_3d')
        }

        return ClusterNodeResponse(**required_fields)

    def get_root_node(self, namespace: str) -> Optional[ClusterNodeResponse]:
        """Get the root node for a namespace"""
        sqlconn = self._get_connection(namespace)
        select_sql = """
            SELECT node_id, namespace, parent_id, depth, doc_count, child_count, final_label, centroid_three_d
            FROM cluster_tree
            WHERE namespace = ? AND parent_id IS NULL
        """
        cursor = sqlconn.execute(select_sql, (namespace,))
        row = cursor.fetchone()
        if not row:
            return None
        return self._map_cluster_row_to_response(row, namespace)

    # # Search methods
    # def search_clusters(self, namespace: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
    #     """Search clusters by their labels"""
    #     conn = self._get_connection(namespace)

    #     sql = """
    #         SELECT node_id, parent_id, depth, doc_count, child_count, first_label, final_label
    #         FROM cluster_tree
    #         WHERE namespace = ? AND (first_label LIKE ? OR final_label LIKE ?)
    #         ORDER BY doc_count DESC
    #         LIMIT ?
    #     """

    #     cursor = conn.execute(sql, (namespace, f"%{query}%", f"%{query}%", limit))
    #     rows = cursor.fetchall()

    #     clusters = []
    #     for row in rows:
    #         clusters.append({
    #             'node_id': row[0],
    #             'parent_id': row[1],
    #             'depth': row[2],
    #             'doc_count': row[3],
    #             'child_count': row[4],
    #             'first_label': row[5],
    #             'final_label': row[6]
    #         })

    #     return clusters

    # ====================================================================================================
    # Other methods

    def get_available_namespaces(self) -> list[str]:
        """Get list of available namespaces by checking for database files"""
        namespaces = []

        # Check for database files in the configured data directory
        db_files = list(Path(self.db_directory).glob("*_slim.db"))
        for db_file in db_files:
            # Extract namespace from filename (e.g., "enwiki_namespace_0_slim.db" -> "enwiki_namespace_0")
            stem = db_file.stem
            # Remove the "_slim" suffix if present
            namespace = stem[:-5] if stem.endswith("_slim") else stem
            namespaces.append(namespace)

        return sorted(namespaces)

    # def get_search_suggestions(self, namespace: str, partial_query: str, limit: int = 5) -> List[str]:
    #     """Get search suggestions based on partial query"""
    #     conn = self._get_connection(namespace)

    #     sql = """
    #         SELECT DISTINCT title
    #         FROM page_log
    #         WHERE namespace = ? AND title LIKE ?
    #         ORDER BY title ASC
    #         LIMIT ?
    #     """

    #     cursor = conn.execute(sql, (namespace, f"{partial_query}%", limit))
    #     rows = cursor.fetchall()

    #     return [row[0] for row in rows]
