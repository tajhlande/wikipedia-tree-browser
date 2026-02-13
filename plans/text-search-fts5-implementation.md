# Text Search with FTS5 Implementation Plan
## Wikipedia Embeddings Tree Browser

**Created**: 2026-02-13
**Feature**: Add FTS5-powered text search to node view

---

## 1. Overview

Add a search bar to the node view that allows users to search across cluster node labels (`final_label`) and page titles using SQLite FTS5 (Full-Text Search). Results are ranked by relevance using BM25 scoring.

### Key Requirements
- Search bar positioned next to locale selector in header
- Search triggered by Enter key or search button click
- Maximum 50 results retrieved, 10 visible with scrolling
- Results show node label + matching page title (if applicable)
- Selecting result navigates to and highlights node in tree
- Rounded edges, search icon from solid-icons, localized placeholder
- Language-aware tokenization based on namespace

### Advanced Features (FTS5)
- **Phrase search**: `"quantum physics"` - exact phrase matching
- **Boolean operators**: `physics AND quantum`, `physics OR chemistry`, `physics NOT quantum`
- **Prefix matching**: `phys*` - autocomplete behavior
- **Relevance ranking**: BM25 scoring ranks by quality
- **Stemming**: English benefits from Porter stemming

---

## 2. Database Schema

### FTS5 Virtual Tables (Created During Migration)

```sql
-- Cluster node labels FTS5 table
CREATE VIRTUAL TABLE cluster_tree_fts USING fts5(
    node_id UNINDEXED,    -- Needed for JOIN back to cluster_tree
    namespace UNINDEXED,  -- Needed for JOIN back to cluster_tree
    final_label,          -- Indexed for full-text search
    tokenize='unicode61 remove_diacritics 1'
);

-- Page titles FTS5 table
CREATE VIRTUAL TABLE page_log_fts USING fts5(
    page_id UNINDEXED,    -- Needed for JOIN back to page_log
    namespace UNINDEXED,  -- Needed for JOIN back to page_log
    title,                -- Indexed for full-text search
    tokenize='unicode61 remove_diacritics 1'
);
```

**Storage Optimization**: By excluding `depth` and `parent_id` from FTS5 tables (retrieved via JOIN), FTS5 overhead is reduced from ~30-50% to ~20-35% of database size.

**Note**: FTS5 tables are created during migration in `migrate_to_slim.py`. Databases are read-only at runtime. If FTS5 tables don't exist, search will fail with SQLite errors (intentional).

---

## 3. Backend API Design

### 3.1 Endpoint

**Route**: `GET /api/search/nodes`

**Parameters**:
- `namespace` (required): Wikipedia namespace (e.g., "enwiki_namespace_0")
- `query` (required): Search text (min 1 char, max 100)
- `language_code` (required): Language code (e.g., "en", "de", "zh")
- `limit` (optional): Max results, default=50, max=100

**Response**:
```json
{
  "results": [
    {
      "node_id": 42,
      "namespace": "enwiki_namespace_0",
      "node_label": "Arts and Entertainment",
      "match_type": "node_label",
      "matched_page_title": null,
      "depth": 2,
      "parent_id": 1
    },
    {
      "node_id": 123,
      "namespace": "enwiki_namespace_0",
      "node_label": "Science",
      "match_type": "page_title",
      "matched_page_title": "Physics",
      "depth": 3,
      "parent_id": 42
    }
  ],
  "total_count": 47,
  "query": "phys",
  "language_code": "en"
}
```

### 3.2 Language Configuration

```python
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
```

### 3.3 FTS5 Query

```sql
-- Search node labels
SELECT DISTINCT
    ct.node_id, ct.namespace, ct.final_label, 'node_label' as match_type,
    NULL as matched_page_title, ct.depth, ct.parent_id,
    bm25(fts) as relevance_score
FROM cluster_tree_fts fts
INNER JOIN cluster_tree ct ON ct.namespace = fts.namespace AND ct.node_id = fts.node_id
WHERE fts.final_label MATCH :fts_query AND ct.namespace = :namespace

UNION ALL

-- Search page titles
SELECT DISTINCT
    ct.node_id, ct.namespace, ct.final_label, 'page_title' as match_type,
    pl.title as matched_page_title, ct.depth, ct.parent_id,
    bm25(page_fts) as relevance_score
FROM page_log_fts page_fts
INNER JOIN page_log pl ON pl.namespace = page_fts.namespace AND pl.page_id = page_fts.page_id
INNER JOIN page_vector pv ON pv.namespace = pl.namespace AND pv.page_id = pl.page_id
INNER JOIN cluster_tree ct ON ct.namespace = pv.namespace AND ct.node_id = pv.cluster_node_id
WHERE page_fts.title MATCH :fts_query AND pl.namespace = :namespace

ORDER BY relevance_score ASC  -- Lower = more relevant
LIMIT :limit;
```

---

## 4. Frontend Design

### 4.1 Component: SearchBar.tsx

**State**:
```typescript
const [searchQuery, setSearchQuery] = createSignal<string>('');
const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
const [isSearching, setIsSearching] = createSignal<boolean>(false);
const [showResults, setShowResults] = createSignal<boolean>(false);
const [selectedIndex, setSelectedIndex] = createSignal<number>(-1);
const [totalResults, setTotalResults] = createSignal<number>(0);
```

**Key Handlers**:
- `handleSearch()` - Execute search via API
- `handleKeyDown()` - Enter, Escape, Arrow keys
- `handleResultSelect()` - Navigate to node

**Helper**:
```typescript
const getLanguageCodeFromNamespace = (ns: string): string => {
  const match = ns.match(/^([a-z]+)wiki/);
  return match ? match[1] : 'en';
};
```

### 4.2 UI Layout

```tsx
<div class="flex items-center gap-2">
  <div class="relative flex-1 max-w-md">
    {/* Rounded search input */}
    <input
      type="text"
      placeholder={t("search.placeholder")}
      class="w-full px-4 py-2 pr-10 rounded-full border ..."
      value={searchQuery()}
      onInput={(e) => setSearchQuery(e.currentTarget.value)}
      onKeyDown={handleKeyDown}
    />

    {/* Search button with icon */}
    <button class="absolute right-2 top-1/2 ..." onClick={handleSearch}>
      <BsSearch class="w-5 h-5" />
    </button>
  </div>
</div>

{/* Results dropdown */}
<Show when={showResults() && searchResults().length > 0}>
  <div class="absolute top-full mt-2 bg-white rounded-lg shadow-lg ...">
    {/* Results list (max 10 visible) */}
    <For each={searchResults().slice(0, 10)}>
      {(result) => (
        <button onClick={() => handleResultSelect(result)}>
          <div>{result.node_label}</div>
          <Show when={result.matched_page_title}>
            <div class="text-sm">({result.matched_page_title})</div>
          </Show>
        </button>
      )}
    </For>
  </div>
</Show>
```

### 4.3 Localization Strings

**en.ts**:
```typescript
search: {
  placeholder: "Search...",
  resultsHeader: "Showing {{showing}} of {{total}} results",
  moreResults: "{{count}} more results available",
  noResults: "No results found",
  searching: "Searching...",
  error: "Search failed. Please try again."
}
```

**de.ts**, **fr.ts**: Similar translations

---

## 5. Implementation Plan

### Phase 1: Migration Script (`migrate_to_slim.py`)

**Files**: `migrate_to_slim.py`

#### 5.1.1 Update `create_slim_schema()`

Add FTS5 table creation:

```python
def create_slim_schema(conn: sqlite3.Connection) -> None:
    """Create the optimized schema for the slim database."""
    cursor = conn.cursor()

    # Drop tables if they exist (for idempotency)
    cursor.execute("DROP TABLE IF EXISTS page_vector;")
    cursor.execute("DROP TABLE IF EXISTS page_log;")
    cursor.execute("DROP TABLE IF EXISTS cluster_tree;")
    cursor.execute("DROP TABLE IF EXISTS cluster_tree_fts;")  # NEW
    cursor.execute("DROP TABLE IF EXISTS page_log_fts;")      # NEW

    # ... existing table creation code ...

    # NEW: Create FTS5 virtual tables
    logger.info("Creating FTS5 virtual tables...")

    cursor.execute("""
        CREATE VIRTUAL TABLE cluster_tree_fts USING fts5(
            node_id UNINDEXED,
            namespace UNINDEXED,
            final_label,
            tokenize='unicode61 remove_diacritics 1'
        );
    """)

    cursor.execute("""
        CREATE VIRTUAL TABLE page_log_fts USING fts5(
            page_id UNINDEXED,
            namespace UNINDEXED,
            title,
            tokenize='unicode61 remove_diacritics 1'
        );
    """)

    conn.commit()
    logger.info("Created slim database schema with FTS5 tables")
```

#### 5.1.2 Update `copy_data()`

Add FTS5 population:

```python
def copy_data(source_conn: sqlite3.Connection, dest_conn: sqlite3.Connection) -> None:
    """Copy data from source database to destination database."""
    source_cursor = source_conn.cursor()
    dest_cursor = dest_conn.cursor()

    # ... existing copy code for page_log, page_vector, cluster_tree ...

    # NEW: Populate FTS5 tables
    logger.info("Populating cluster_tree_fts...")
    dest_cursor.execute("""
        INSERT INTO cluster_tree_fts(node_id, namespace, final_label)
        SELECT node_id, namespace, final_label
        FROM cluster_tree
        WHERE final_label IS NOT NULL;
    """)
    logger.info("Populated cluster_tree_fts with %d rows", dest_cursor.rowcount)

    logger.info("Populating page_log_fts...")
    dest_cursor.execute("""
        INSERT INTO page_log_fts(page_id, namespace, title)
        SELECT page_id, namespace, title
        FROM page_log
        WHERE title IS NOT NULL;
    """)
    logger.info("Populated page_log_fts with %d rows", dest_cursor.rowcount)

    # Optimize FTS5 indexes
    logger.info("Optimizing FTS5 indexes...")
    dest_cursor.execute("INSERT INTO cluster_tree_fts(cluster_tree_fts) VALUES('optimize');")
    dest_cursor.execute("INSERT INTO page_log_fts(page_log_fts) VALUES('optimize');")

    dest_conn.commit()
```

**Note**: DO NOT modify `main()` function - let errors happen if FTS5 fails.

#### 5.1.3 Testing

- [ ] Run migration on test database: `python migrate_to_slim.py test_data.db`
- [ ] Verify FTS5 tables exist: `SELECT name FROM sqlite_master WHERE name LIKE '%_fts';`
- [ ] Verify row counts match
- [ ] Test FTS5 query: `SELECT * FROM cluster_tree_fts WHERE final_label MATCH 'physics' LIMIT 5;`
- [ ] Test phrase search: `SELECT * FROM cluster_tree_fts WHERE final_label MATCH '"quantum physics"' LIMIT 5;`
- [ ] Verify BM25 scoring: `SELECT final_label, bm25(cluster_tree_fts) FROM cluster_tree_fts WHERE final_label MATCH 'physics';`

---

### Phase 2: FastAPI Backend Implementation

**Files**:
- `backend/models/search.py` (new)
- `backend/services/search_service.py` (new)
- `backend/services/service_setup.py` (update)
- `backend/api/search.py` (update)

#### 5.2.1 Create Response Models

**File**: `backend/models/search.py`

```python
from pydantic import BaseModel
from typing import Optional, Literal

class SearchResultResponse(BaseModel):
    node_id: int
    namespace: str
    node_label: str
    match_type: Literal["node_label", "page_title"]
    matched_page_title: Optional[str] = None
    depth: int
    parent_id: Optional[int] = None

class SearchNodeResponse(BaseModel):
    results: list[SearchResultResponse]
    total_count: int
    query: str
    language_code: str
```

#### 5.2.2 Create SearchService

**File**: `backend/services/search_service.py`

```python
import logging
from typing import Optional
from services.service_model import ManagedService
from services.database_service import DatabaseService
from models.search import SearchResultResponse

logger = logging.getLogger(__name__)

# Language-specific FTS5 configurations
FTS5_LANGUAGE_CONFIG = {
    'en': {'use_stemming': True},
    'de': {'use_stemming': False},
    'fr': {'use_stemming': False},
    'es': {'use_stemming': False},
    'pt': {'use_stemming': False},
    'it': {'use_stemming': False},
    'ru': {'use_stemming': False},
    'zh': {'use_stemming': False},
    'ja': {'use_stemming': False},
    'ko': {'use_stemming': False},
    'ar': {'use_stemming': False},
    'arz': {'use_stemming': False},
    'th': {'use_stemming': False},
    'vi': {'use_stemming': False},
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

        sql = """
        SELECT DISTINCT
            ct.node_id, ct.namespace, ct.final_label, 'node_label' as match_type,
            NULL as matched_page_title, ct.depth, ct.parent_id,
            bm25(fts) as relevance_score
        FROM cluster_tree_fts fts
        INNER JOIN cluster_tree ct ON ct.namespace = fts.namespace AND ct.node_id = fts.node_id
        WHERE fts.final_label MATCH :fts_query AND ct.namespace = :namespace

        UNION ALL

        SELECT DISTINCT
            ct.node_id, ct.namespace, ct.final_label, 'page_title' as match_type,
            pl.title as matched_page_title, ct.depth, ct.parent_id,
            bm25(page_fts) as relevance_score
        FROM page_log_fts page_fts
        INNER JOIN page_log pl ON pl.namespace = page_fts.namespace AND pl.page_id = page_fts.page_id
        INNER JOIN page_vector pv ON pv.namespace = pl.namespace AND pv.page_id = pl.page_id
        INNER JOIN cluster_tree ct ON ct.namespace = pv.namespace AND ct.node_id = pv.cluster_node_id
        WHERE page_fts.title MATCH :fts_query AND pl.namespace = :namespace

        ORDER BY relevance_score ASC
        LIMIT :limit;
        """

        try:
            cursor = sqlconn.execute(sql, {"namespace": namespace, "fts_query": fts_query, "limit": limit})
            rows = cursor.fetchall()
            return [
                SearchResultResponse(
                    node_id=row[0], namespace=row[1], node_label=row[2],
                    match_type=row[3], matched_page_title=row[4],
                    depth=row[5], parent_id=row[6]
                )
                for row in rows
            ]
        except Exception as e:
            logger.error(f"FTS5 search error for namespace {namespace}: {e}")
            return []  # Return empty on error (FTS5 tables missing, query syntax error, etc.)

    def shutdown(self) -> None:
        """Shutdown the service."""
        logger.info("SearchService shutdown")
```

#### 5.2.3 Update Service Registry

**File**: `backend/services/service_setup.py`

```python
from functools import partial
import logging
import os

from services.database_service import DatabaseService
from services.search_service import SearchService  # NEW
from services.service_model import ManagedService

logger = logging.getLogger(__name__)

global _service_catalog
_service_catalog: dict[str, ManagedService] = dict()


def init_services():
    """Initialize all services."""
    logger.info("Initializing services")
    db_directory = os.environ.get("DB_FILE_PATH") or None

    if db_directory:
        logger.info("DB directory: %s", db_directory)
        db_service = DatabaseService(db_directory=db_directory)
    else:
        logger.warning("DB directory not set, using default")
        db_service = DatabaseService()

    _service_catalog["cluster_service"] = db_service

    # NEW: Initialize SearchService with DatabaseService dependency
    search_service = SearchService(database_service=db_service)
    _service_catalog["search_service"] = search_service

    logger.debug("Service initialization complete")


def shutdown_services():
    logger.info("Shutting down services")
    for service_name in _service_catalog:
        try:
            _service_catalog[service_name].shutdown()
        except Exception as e:
            logger.warning("Exception shutting down %s: %s", service_name, e)
    logger.debug("Service shutdown complete")


def service_provider(service_name: str):
    """Provide a service instance by name."""
    if service_name in _service_catalog:
        return _service_catalog[service_name]
    else:
        raise ValueError(f"No service named {service_name}")


get_cluster_service = partial(service_provider, "cluster_service")
get_search_service = partial(service_provider, "search_service")  # NEW
```

#### 5.2.4 Update Search Endpoint

**File**: `backend/api/search.py`

```python
from typing import Annotated
from fastapi import APIRouter, Query, Depends, HTTPException
import logging

from services.search_service import SearchService
from services.service_setup import get_search_service
from models.search import SearchNodeResponse
from util.cache import async_cache

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/nodes", response_model=SearchNodeResponse)
@async_cache(key_prefix="search_nodes", ttl=300)
async def search_nodes(
    namespace: Annotated[str, Query(description="Wikipedia namespace")],
    query: Annotated[str, Query(min_length=1, max_length=100, description="Search query")],
    language_code: Annotated[str, Query(description="Language code (e.g., 'en', 'de', 'zh')")],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
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
        results = search_service.search_nodes(namespace, query, language_code, limit)
        return {
            "results": results,
            "total_count": len(results),
            "query": query,
            "language_code": language_code
        }
    except Exception as e:
        logger.exception("Error searching nodes")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")
```

#### 5.2.5 Testing

**Unit Tests** (`backend/test/test_search_service.py`):
- [ ] Test `_prepare_fts5_query()` with English (stemming)
- [ ] Test `_prepare_fts5_query()` with German (no stemming)
- [ ] Test `_prepare_fts5_query()` with phrase search `"quoted phrase"`
- [ ] Test `_prepare_fts5_query()` escapes double quotes
- [ ] Test `search_nodes()` returns results for valid query
- [ ] Test `search_nodes()` returns empty list for invalid query
- [ ] Test `search_nodes()` returns empty list if FTS5 tables missing

**Integration Tests** (`backend/test/test_search_api.py`):
- [ ] Test endpoint with basic search: `query=physics&language_code=en`
- [ ] Test endpoint with phrase search: `query="quantum physics"&language_code=en`
- [ ] Test endpoint with prefix search: `query=phys*&language_code=en`
- [ ] Test endpoint with boolean: `query=physics AND quantum&language_code=en`
- [ ] Test endpoint with German: `language_code=de`
- [ ] Test endpoint with Chinese: `language_code=zh`
- [ ] Test endpoint respects limit parameter
- [ ] Test endpoint returns 500 if namespace missing
- [ ] Test response includes `language_code` field
- [ ] Test BM25 ranking (results ordered by relevance)

---

### Phase 3: Frontend Implementation

**Files**:
- `frontend/src/ui/SearchBar.tsx` (new)
- `frontend/src/services/apiClient.ts` (update)
- `frontend/src/ui/AppHeader.tsx` (update)
- `frontend/src/i18n/dictionaries/*.ts` (update)

#### 5.3.1 Create SearchBar Component

**File**: `frontend/src/ui/SearchBar.tsx`

```typescript
import { createSignal, Show, For } from 'solid-js';
import { BsSearch } from 'solid-icons/bs';
import { useI18n } from '../i18n';
import { apiClient } from '../services/apiClient';

interface SearchBarProps {
  namespace: string;
  onNodeSelect: (nodeId: number) => void;
}

interface SearchResult {
  node_id: number;
  namespace: string;
  node_label: string;
  match_type: 'node_label' | 'page_title';
  matched_page_title?: string;
  depth: number;
  parent_id?: number;
}

export function SearchBar(props: SearchBarProps) {
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [showResults, setShowResults] = createSignal(false);
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const [totalResults, setTotalResults] = createSignal(0);

  const getLanguageCode = (ns: string): string => {
    const match = ns.match(/^([a-z]+)wiki/);
    return match ? match[1] : 'en';
  };

  const handleSearch = async () => {
    if (!searchQuery().trim()) return;

    setIsSearching(true);
    try {
      const languageCode = getLanguageCode(props.namespace);
      const response = await apiClient.searchNodes(
        props.namespace,
        searchQuery(),
        languageCode,
        50
      );
      setSearchResults(response.results);
      setTotalResults(response.total_count);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSearch();
        break;
      case 'Escape':
        setShowResults(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex() + 1, searchResults().length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex() - 1, 0));
        break;
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    props.onNodeSelect(result.node_id);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  return (
    <div class="relative flex-1 max-w-md">
      <input
        type="text"
        placeholder={t("search.placeholder")}
        class="w-full px-4 py-2 pr-10 rounded-full border border-gray-300
               focus:outline-none focus:ring-2 focus:ring-blue-500
               dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        value={searchQuery()}
        onInput={(e) => setSearchQuery(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />

      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1
               hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        onClick={handleSearch}
        disabled={isSearching()}
      >
        <BsSearch class="w-5 h-5" />
      </button>

      <Show when={showResults() && searchResults().length > 0}>
        <div class="absolute top-full left-0 right-0 mt-2
                    bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50">
          <div class="px-4 py-2 border-b text-sm text-gray-600 dark:text-gray-400">
            {t("search.resultsHeader", {
              showing: Math.min(10, searchResults().length),
              total: totalResults()
            })}
          </div>

          <div class="max-h-80 overflow-y-auto">
            <For each={searchResults().slice(0, 10)}>
              {(result, index) => (
                <button
                  class={`w-full px-4 py-3 text-left hover:bg-gray-100
                          dark:hover:bg-gray-700 transition-colors
                          ${index() === selectedIndex() ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                  onClick={() => handleResultSelect(result)}
                >
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    {result.node_label}
                  </div>
                  <Show when={result.matched_page_title}>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                      ({result.matched_page_title})
                    </div>
                  </Show>
                </button>
              )}
            </For>
          </div>

          <Show when={totalResults() > 10}>
            <div class="px-4 py-2 border-t text-sm text-gray-600 dark:text-gray-400 text-center">
              {t("search.moreResults", { count: totalResults() - 10 })}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
```

#### 5.3.2 Update API Client

**File**: `frontend/src/services/apiClient.ts`

```typescript
// Add to existing apiClient class
async searchNodes(
  namespace: string,
  query: string,
  languageCode: string,
  limit: number = 50
): Promise<SearchNodeResponse> {
  const params = new URLSearchParams({
    namespace,
    query,
    language_code: languageCode,
    limit: limit.toString()
  });

  return await this.fetchWithErrorHandling<SearchNodeResponse>(
    `${this.baseUrl}/search/nodes?${params}`
  );
}

// Add TypeScript interface
interface SearchNodeResponse {
  results: SearchResult[];
  total_count: number;
  query: string;
  language_code: string;
}

interface SearchResult {
  node_id: number;
  namespace: string;
  node_label: string;
  match_type: 'node_label' | 'page_title';
  matched_page_title?: string;
  depth: number;
  parent_id?: number;
}
```

#### 5.3.3 Update AppHeader

**File**: `frontend/src/ui/AppHeader.tsx`

```typescript
// Add SearchBar next to LocaleSelector
<div class="flex items-center gap-4">
  <LocaleSelector />
  <SearchBar
    namespace={currentNamespace()}
    onNodeSelect={handleNodeSelection}
  />
</div>
```

#### 5.3.4 Add Localization

**File**: `frontend/src/i18n/dictionaries/en.ts`

```typescript
search: {
  placeholder: "Search...",
  resultsHeader: "Showing {{showing}} of {{total}} results",
  moreResults: "{{count}} more results available",
  noResults: "No results found",
  searching: "Searching...",
  error: "Search failed. Please try again."
}
```

**File**: `frontend/src/i18n/dictionaries/de.ts`

```typescript
search: {
  placeholder: "Suchen...",
  resultsHeader: "{{showing}} von {{total}} Ergebnissen angezeigt",
  moreResults: "{{count}} weitere Ergebnisse verfügbar",
  noResults: "Keine Ergebnisse gefunden",
  searching: "Suche läuft...",
  error: "Suche fehlgeschlagen. Bitte erneut versuchen."
}
```

**File**: `frontend/src/i18n/dictionaries/fr.ts`

```typescript
search: {
  placeholder: "Rechercher...",
  resultsHeader: "Affichage de {{showing}} sur {{total}} résultats",
  moreResults: "{{count}} résultats supplémentaires disponibles",
  noResults: "Aucun résultat trouvé",
  searching: "Recherche en cours...",
  error: "La recherche a échoué. Veuillez réessayer."
}
```

#### 5.3.5 Testing

**Component Tests** (`frontend/src/test/searchBar.test.tsx`):
- [ ] SearchBar renders input and button
- [ ] Enter key triggers search
- [ ] Button click triggers search
- [ ] Results display in dropdown
- [ ] Escape key closes dropdown
- [ ] Arrow keys navigate results
- [ ] Click result calls onNodeSelect
- [ ] Search clears after selection
- [ ] Language code extracted correctly from namespace
- [ ] Loading state shows during search
- [ ] Error handling displays appropriately

**Integration Tests**:
- [ ] Test with real API (mock server)
- [ ] Test phrase search UI: `"quantum physics"`
- [ ] Test all 3 language dictionaries load
- [ ] Test dark mode compatibility

---

### Phase 4: UI Integration

**Files**: `frontend/src/ui/AppHeader.tsx`

- [ ] Import SearchBar component
- [ ] Add SearchBar to header layout next to LocaleSelector
- [ ] Pass namespace prop from dataStore
- [ ] Wire onNodeSelect to dataStore.selectNodeById
- [ ] Test responsive layout (desktop/mobile)
- [ ] Test search bar doesn't overflow on small screens
- [ ] Verify z-index doesn't conflict with other overlays

**Testing**:
- [ ] Visual regression tests (screenshots)
- [ ] Test on mobile viewport (320px, 768px, 1024px)
- [ ] Test with long node labels (truncation)
- [ ] Test with no results
- [ ] Test with >10 results (scrolling)

---

### Phase 5: Node Navigation Integration

**Files**: `frontend/src/stores/dataStore.ts`, `frontend/src/babylon/interactionManager.ts`

- [ ] Ensure `selectNodeById(nodeId, namespace)` method exists
- [ ] Test selectNodeById loads node tree (ancestors + children + siblings)
- [ ] Test 3D visualization highlights selected node
- [ ] Test camera positions correctly
- [ ] Test search result selection clears search UI
- [ ] Test navigation works across different depths
- [ ] Test navigation from root to deep leaf node

**Testing**:
- [ ] E2E test: Search → Select → Node highlighted in 3D
- [ ] Test node tree loads with correct ancestors
- [ ] Test camera animation completes
- [ ] Test state updates correctly

---

### Phase 6: Polish & Testing

- [ ] Add empty state ("No results found")
- [ ] Add minimum query length hint (1 char)
- [ ] Test phrase search: `"quantum physics"`
- [ ] Test prefix search: `phys*`
- [ ] Test boolean operators: `physics AND quantum`, `physics OR chemistry`
- [ ] Test results ranked by relevance (most relevant first)
- [ ] Test English stemming: "running" finds "run", "runs"
- [ ] Test multi-language: en, de, fr, zh, ar
- [ ] Test special characters in search
- [ ] Test very long queries (100 chars)
- [ ] Accessibility: ARIA labels, keyboard navigation, screen reader
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Performance: Search completes in <100ms with FTS5

---

### Phase 7: Documentation

- [ ] Update README with search feature documentation
- [ ] Document FTS5 query syntax (phrase, boolean, prefix)
- [ ] Document language support (14+ languages)
- [ ] Add inline code comments
- [ ] Document migration requirement (FTS5 tables)
- [ ] Add user guide for advanced search features
- [ ] Update API documentation with search endpoint
- [ ] Document BM25 relevance ranking

---

## 6. Success Criteria

- [ ] Search bar renders next to locale selector
- [ ] Search triggered by Enter key and button click
- [ ] Results display in dropdown (max 10 visible, scrollable)
- [ ] Results show node label + page title (if applicable)
- [ ] Selecting result navigates to and highlights node in tree
- [ ] Search box clears after selection
- [ ] Dropdown closes on Escape, selection, or click-outside
- [ ] Rounded edges, search icon from solid-icons
- [ ] Localized placeholder text (en, de, fr)
- [ ] Phrase search works: `"quantum physics"`
- [ ] Boolean operators work: `physics AND quantum`
- [ ] Prefix matching works: `phys*`
- [ ] Results ranked by relevance (BM25)
- [ ] Multi-language support (en, de, fr, zh, ar, etc.)
- [ ] Performance: <100ms search response time
- [ ] Accessibility: Full keyboard navigation
- [ ] No console errors or warnings
- [ ] FTS5 tables exist in all migrated databases

---

## 7. Security Considerations

### SQL Injection Prevention
- Use parameterized queries ✅
- Escape FTS5 special characters: `query.replace('"', '""')`
- Validate input length (max 100 chars)
- Sanitize to prevent XSS in results display

### Rate Limiting
- Implement on search endpoint (e.g., 10 requests/second per IP)

### Input Validation
- Max query length: 100 characters
- Min query length: 1 character
- Reject queries with only whitespace

---

## 8. Technical Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| FTS5 not available in SQLite | High | Very Low | Require SQLite 3.9.0+ (verify at runtime) |
| Migration script fails | High | Low | Test on sample databases, add error handling |
| FTS5 query syntax errors | Medium | Medium | Escape special characters, return empty on error |
| Storage overhead from FTS5 | Low | High (expected) | Accept 30-50% increase, document |
| Language tokenization issues | Low | Medium | Test all 14+ languages, fallback to basic search |
| Search out of sync with tree | Medium | Low | FTS5 tables read-only, always in sync |

---

## 9. Open Questions

1. **Deduplication**: If page title matches AND node label matches, show once or twice?
2. **Mobile UX**: Should search be a modal on mobile devices?
3. **Boolean operator UI**: Show helper text about `AND`, `OR`, `NOT` syntax?
4. **Auto-quotes**: Should multi-word searches auto-add quotes for phrase search?
