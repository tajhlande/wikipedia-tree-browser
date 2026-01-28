# Backend Test Coverage Plan

## Current Coverage (66%)

| Module | Coverage | Missing |
|--------|----------|---------|
| api/ | 90-100% | Minimal |
| models/ | 100% | None |
| services/cluster_service.py | 73% | Lines 16, 22, 29, 35, 41, 47, 53, 59, 66 |
| services/database_service.py | 26% | Extensive |
| services/service_setup.py | 46% | Lines 17-19, 23-29, 38-41 |
| util/languages.py | 81% | Lines 55, 67, 82, 88, 98-102, 105, 127-129, 142, 150 |

---

## Phase 1: Database Service Tests (High Priority)

**File**: `services/database_service.py` (26% coverage → target 90%+)

### 1.1 Connection Management Tests
- [ ] Test `_get_sql_conn_for_file()` connection caching
- [ ] Test connection pragmas are applied (WAL, synchronous, cache)
- [ ] Test `_get_connection()` constructs correct db file path
- [ ] Test `shutdown()` closes all connections

### 1.2 Row Mapping Tests
- [ ] Test `_row_to_pydantic()` with valid row data
- [ ] Test `_row_to_pydantic()` filters to model fields only
- [ ] Test `_map_cluster_row_to_response()` with centroid_three_d as JSON
- [ ] Test `_map_cluster_row_to_response()` with centroid_three_d as None
- [ ] Test `_map_cluster_row_to_response()` with invalid JSON (graceful None)
- [ ] Test `_map_cluster_row_to_response()` field defaults

### 1.3 Page Query Tests
- [ ] Test `get_page_by_id()` returns PageResponse when found
- [ ] Test `get_page_by_id()` returns None when not found
- [ ] Test `get_pages_in_cluster()` with default pagination
- [ ] Test `get_pages_in_cluster()` with custom limit/offset
- [ ] Test `get_pages_in_cluster()` empty result handling

### 1.4 Cluster Query Tests
- [ ] Test `get_cluster_node()` returns node when found
- [ ] Test `get_cluster_node()` returns None when not found
- [ ] Test `get_cluster_node_children()` returns ordered children
- [ ] Test `get_cluster_node_children()` empty result
- [ ] Test `get_cluster_node_siblings()` returns siblings (excludes self)
- [ ] Test `get_cluster_node_siblings()` no siblings case
- [ ] Test `get_cluster_node_parent()` returns parent
- [ ] Test `get_cluster_node_parent()` returns None for root
- [ ] Test `get_cluster_node_ancestors()` returns ordered ancestor chain
- [ ] Test `get_cluster_node_ancestors()` empty for root
- [ ] Test `get_root_node()` returns root node
- [ ] Test `get_root_node()` returns None when no root exists

### 1.5 Namespace Discovery Tests
- [ ] Test `get_available_namespaces()` returns sorted list
- [ ] Test `get_available_namespaces()` handles empty data directory
- [ ] Test `get_available_namespaces()` strips `_slim` suffix correctly

### 1.6 Error Handling Tests
- [ ] Test behavior when database file doesn't exist
- [ ] Test behavior when database is corrupted
- [ ] Test SQL error handling

---

## Phase 2: Service Setup Tests (High Priority)

**File**: `services/service_setup.py` (46% coverage → target 90%+)

### 2.1 Initialization Tests
- [ ] Test `init_services()` creates DatabaseService instance
- [ ] Test `init_services()` populates service catalog
- [ ] Test `init_services()` is idempotent (can call multiple times)

### 2.2 Provider Tests
- [ ] Test `service_provider()` returns correct service instance
- [ ] Test `service_provider()` raises ValueError for unknown service
- [ ] Test `get_cluster_service()` returns cluster service

### 2.3 Shutdown Tests
- [ ] Test `shutdown_services()` calls shutdown on all services
- [ ] Test `shutdown_services()` handles exceptions gracefully
- [ ] Test `shutdown_services()` with empty catalog
- [ ] Test `shutdown_services()` with multiple service failures

---

## Phase 3: Languages Utility Tests (Medium Priority)

**File**: `util/languages.py` (81% coverage → target 95%+)

### 3.1 CSV Loading Tests
- [ ] Test `load_languages_from_csv()` with valid CSV file
- [ ] Test `load_languages_from_csv()` raises FileNotFoundError
- [ ] Test `load_languages_from_csv()` validates required headers
- [ ] Test `load_languages_from_csv()` raises LanguageDataError on missing headers
- [ ] Test `load_languages_from_csv()` raises LanguageDataError on empty fields
- [ ] Test `load_languages_from_csv()` raises LanguageDataError on no data
- [ ] Test `load_languages_from_csv()` handles duplicate namespaces with warning
- [ ] Test `load_languages_from_csv()` strips whitespace from fields

### 3.2 Language Lookup Tests
- [ ] Test `get_language_info_for_namespace()` returns cached data on second call
- [ ] Test `get_language_info_for_namespace()` loads from CSV on first call
- [ ] Test `get_language_info_for_namespace()` raises KeyError for unknown namespace
- [ ] Test `get_language_info_for_namespace()` is thread-safe (Lock behavior)
- [ ] Test `get_language_for_namespace()` returns language name
- [ ] Test `get_localized_wiki_name_for_namespace()` returns localized name

### 3.3 Edge Cases
- [ ] Test behavior with malformed CSV rows
- [ ] Test behavior with missing CSV file path
- [ ] Test behavior with custom language file path

---

## Phase 4: Cluster Service Tests (Lower Priority)

**File**: `services/cluster_service.py` (73% coverage → target 100%)

### 4.1 Abstract Method Tests
- [ ] Test that `ClusterService` cannot be instantiated directly
- [ ] Test that `DatabaseService` implements all abstract methods
- [ ] Verify all abstract methods have proper type hints

---

## Test Fixtures and Utilities

### Needed Fixtures
- [ ] Mock database with sample data (clusters, pages)
- [ ] Temporary SQLite database for integration tests
- [ ] Sample language CSV file for testing
- [ ] Mock service provider for isolation

### Test Utilities
- [ ] Helper to create test database files
- [ ] Helper to create test cluster hierarchies
- [ ] Helper to create test page data

---

## Implementation Order

1. **Phase 1** (Database Service) - Highest impact, lowest coverage
2. **Phase 2** (Service Setup) - Critical for app initialization
3. **Phase 3** (Languages) - Important but relatively simple
4. **Phase 4** (Cluster Service) - Mostly coverage check

---

## Success Criteria

- Overall backend coverage: **85%+** (from 66%)
- All critical paths (database queries): **90%+**
- All service initialization/shutdown: **90%+**
- All error paths: **80%+**

---

## Notes

- Tests should use pytest fixtures for setup/teardown
- Use pytest-mock for mocking where appropriate
- Database tests should use in-memory SQLite when possible
- Integration tests should use temporary test database files
