# Backend Refactoring Plan: Single-Table FTS5 Design

**Created**: 2026-03-03
**Purpose**: Refactor backend search implementation to match the plan's single-table FTS5 design

---

## 1. Problem Statement

The current implementation uses **two FTS5 tables** (`cluster_tree_fts` and `page_log_fts`) with a UNION ALL query, which deviates from the plan's specification of a **single FTS5 table** with aggregated page titles.

### Current Implementation Issues

| Issue | Current | Plan Spec |
|-------|---------|-----------|
| FTS5 Tables | Two tables (`cluster_tree_fts` + `page_log_fts`) | Single table (`cluster_tree_fts`) |
| Query Structure | UNION ALL of two separate queries | Single table JOIN with cluster_tree |
| Match Type | Separate queries for each type | CASE statement to determine match type |
| Response Field | `matched_page_title` included | No `matched_page_title` field |
| Match Type Value | `"page_title"` (singular) | `"page_titles"` (plural) |

---

## 2. Architecture Comparison

### Current (Two-Table) Architecture

```
┌─────────────────────┐
│  cluster_tree_fts   │
│  (node_id,         │
│   final_label)      │
└──────────┬──────────┘
           │
           ├─ Query 1: final_label MATCH
           │
┌──────────┴──────────┐
│  page_log_fts       │
│  (page_id, title)   │
└──────────┬──────────┘
           │
           ├─ Query 2: title MATCH
           │
           ▼
    UNION ALL
           │
           ▼
    Results (may have duplicates)
```

### Plan (Single-Table) Architecture

```
┌─────────────────────────────────────┐
│      cluster_tree_fts               │
│  (node_id,                         │
│   final_label,                      │
│   page_titles  ← aggregated)        │
└──────────┬──────────────────────────┘
           │
           │ Single query: MATCH across both columns
           │
           ▼
    INNER JOIN cluster_tree
           │
           ▼
    CASE statement determines match_type
           │
           ▼
    Results (no duplicates, one per node)
```

---

## 3. Required Changes

### 3.1 Response Models (`backend/models/search.py`)

**Current Code** (lines 15-20):
```python
match_type: Literal["node_label", "page_title"] = Field(
    ..., description="Type of match: node label or page title"
)
matched_page_title: Optional[str] = Field(
    None, description="Page title that matched (if match_type is 'page_title')"
)
```

**Required Change**:
```python
match_type: Literal["node_label", "page_titles"] = Field(
    ..., description="Type of match: node label or page titles"
)
# Remove matched_page_title field entirely
```

**Impact**:
- API contract change
- Frontend will need to be updated to not expect `matched_page_title`

---

### 3.2 Search Service (`backend/services/search_service.py`)

**Current Code** (lines 69-92):
```python
sql = """
SELECT DISTINCT
    ct.node_id, ct.namespace, ct.final_label, 'node_label' as match_type,
    NULL as matched_page_title, ct.depth, ct.parent_id,
    bm25(cluster_tree_fts) as relevance_score
FROM cluster_tree_fts fts
INNER JOIN cluster_tree ct ON ct.namespace = fts.namespace AND ct.node_id = fts.node_id
WHERE fts.final_label MATCH :fts_query AND ct.namespace = :namespace

UNION ALL

SELECT DISTINCT
    ct.node_id, ct.namespace, ct.final_label, 'page_title' as match_type,
    pl.title as matched_page_title, ct.depth, ct.parent_id,
    bm25(page_log_fts) as relevance_score
FROM page_log_fts page_fts
INNER JOIN page_log pl ON pl.namespace = page_fts.namespace AND pl.page_id = page_fts.page_id
INNER JOIN page_vector pv ON pv.namespace = pl.namespace AND pv.page_id = pl.page_id
INNER JOIN cluster_tree ct ON ct.namespace = pv.namespace AND ct.node_id = pv.cluster_node_id
WHERE page_fts.title MATCH :fts_query AND pl.namespace = :namespace

ORDER BY relevance_score ASC
LIMIT :limit;
"""
```

**Required Change**:
```python
sql = """
SELECT
    ct.node_id,
    ct.namespace,
    ct.final_label,
    CASE
        WHEN fts.final_label MATCH :fts_query THEN 'node_label'
        ELSE 'page_titles'
    END as match_type,
    ct.depth,
    ct.parent_id,
    bm25(fts) as relevance_score
FROM cluster_tree_fts fts
INNER JOIN cluster_tree ct ON ct.namespace = fts.namespace AND ct.node_id = fts.node_id
WHERE fts MATCH :fts_query
  AND ct.namespace = :namespace
ORDER BY relevance_score ASC
LIMIT :limit;
"""
```

**Key Changes**:
1. Remove UNION ALL structure
2. Remove references to `page_log_fts`, `page_log`, `page_vector` tables
3. Use CASE statement to determine match_type
4. Remove `matched_page_title` from SELECT
5. Change WHERE clause to `fts MATCH` (searches both `final_label` and `page_titles`)

**Impact**:
- Simpler query (single table scan)
- No duplicate results (each node appears once)
- BM25 considers both label and page titles together
- Cannot show which specific page title matched

---

### 3.3 Test Fixtures (`backend/test/test_search_service.py`)

**Current Code** (lines 87-100):
```python
# Create FTS5 virtual tables
conn.execute(
    """
    CREATE VIRTUAL TABLE cluster_tree_fts USING fts5(
        node_id UNINDEXED,
        namespace UNINDEXED,
        final_label,
        tokenize='unicode61 remove_diacritics 1'
    );
    """
)

conn.execute(
    """
    CREATE VIRTUAL TABLE page_log_fts USING fts5(
```

**Required Change**:
```python
# Create single FTS5 virtual table with aggregated content
conn.execute(
    """
    CREATE VIRTUAL TABLE cluster_tree_fts USING fts5(
        node_id UNINDEXED,
        namespace UNINDEXED,
        final_label,
        page_titles,
        tokenize='unicode61 remove_diacritics 1'
    );
    """
)
# Remove page_log_fts table creation
```

**Also update test data population** to include `page_titles` column with aggregated content.

---

### 3.4 Test Expectations (`backend/test/test_search_service.py`)

**Current Code** (expects `matched_page_title`):
```python
assert result.matched_page_title == "Quantum Physics"
```

**Required Change**:
```python
assert result.match_type == "page_titles"
# Remove any assertions about matched_page_title
```

---

## 4. Migration Script Verification

The migration script (`dataprep/migrate_to_slim.py`) already creates the correct single-table FTS5 structure:

**Lines 115-128**:
```python
# Create FTS5 virtual table for full-text search with aggregated page titles
# cluster_tree_fts: Search across cluster tree nodes (final_label) and aggregated page titles
# Uses unicode61 tokenizer for multi-language support
cursor.execute(
    """
    CREATE VIRTUAL TABLE cluster_tree_fts USING fts5(
        node_id UNINDEXED,
        namespace UNINDEXED,
        final_label,
        page_titles,
        page_count UNINDEXED,
        tokenize='unicode61 remove_diacritics 1'
    );
    """
)
```

**Lines 207-238**:
```python
def populate_fts5_table(source_conn: sqlite3.Connection, dest_conn: sqlite3.Connection) -> None:
    """Populate FTS5 virtual table with aggregated page titles per node."""
    # ... aggregates page titles per node ...
```

**Status**: ✅ Migration script is CORRECT - no changes needed.

---

## 5. Trade-offs Analysis

| Aspect | Current (Two-Table) | Plan (Single-Table) |
|--------|---------------------|---------------------|
| **Query Complexity** | High (UNION ALL, 4 tables) | Low (single JOIN) |
| **Performance** | May be slower (two queries) | Likely faster (single scan) |
| **Duplicate Results** | Possible (same node from multiple pages) | Impossible (one per node) |
| **Relevance Ranking** | Separate BM25 per query | Unified BM25 across all content |
| **Match Granularity** | Can show which page matched | Cannot show which page matched |
| **Storage** | Two FTS5 indexes | One FTS5 index |
| **Result Count** | May exceed limit per node | Exactly limit results |

---

## 6. Implementation Order

1. **Update Response Models** (`backend/models/search.py`)
   - Change `match_type` literal to use `"page_titles"`
   - Remove `matched_page_title` field

2. **Update Search Service** (`backend/services/search_service.py`)
   - Replace UNION ALL query with single-table query
   - Update result construction (remove `matched_page_title`)

3. **Update Test Fixtures** (`backend/test/test_search_service.py`)
   - Remove `page_log_fts` table creation
   - Update `cluster_tree_fts` schema to include `page_titles`
   - Update test data to populate `page_titles`

4. **Update Test Expectations** (`backend/test/test_search_service.py`, `backend/test/test_search.py`)
   - Change expected `match_type` values
   - Remove assertions about `matched_page_title`

5. **Run Tests**
   - `cd web/backend && uv run pytest test/test_search_service.py -v`
   - `cd web/backend && uv run pytest test/test_search.py -v`

6. **Verify with Real Data**
   - Test with migrated database
   - Verify search returns expected results
   - Check BM25 ranking behavior

---

## 7. Rollback Plan

If issues arise after refactoring:

1. **Revert changes** to `backend/models/search.py`, `backend/services/search_service.py`
2. **Restore test fixtures** in `backend/test/test_search_service.py`
3. **Keep migration script** as-is (it's already correct)

---

## 8. Success Criteria

- [ ] All tests pass after refactoring
- [ ] Search returns results without duplicates
- [ ] `match_type` correctly identifies node_label vs page_titles
- [ ] BM25 ranking orders results by relevance
- [ ] No references to `page_log_fts` in search service
- [ ] API response matches plan specification
- [ ] Frontend can consume updated API (or updated to match)

---

## 9. Open Questions

1. **Frontend Compatibility**: The frontend may expect `matched_page_title`. Should we:
   - Update frontend to not expect this field
   - Keep a placeholder value for backward compatibility

2. **Result Display**: Without `matched_page_title`, how should the UI indicate that a match was from page titles?
   - Show generic "(page titles match)" text
   - Show nothing extra for page title matches

3. **Test Data**: Need to ensure test fixtures populate `page_titles` with realistic aggregated content.
