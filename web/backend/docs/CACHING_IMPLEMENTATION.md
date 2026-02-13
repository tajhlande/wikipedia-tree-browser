# Caching Implementation Documentation

## Overview

This document describes the caching implementation for the FastAPI API layer in the Wikipedia Embeddings web backend. The implementation provides in-memory caching with time-to-live (TTL) expiration for API endpoints to improve performance and reduce database load.

## Requirements

The caching implementation was designed to meet the following requirements:

1. **In-Memory Storage**: Use in-memory caching for fast access
2. **TTL-Based Expiration**: Entries should automatically expire after a configurable time period
3. **Async Decorator**: Provide an async-compatible decorator for annotating FastAPI endpoint functions
4. **Environment Configuration**: Cache settings should be configurable via environment variables
5. **Default Values**: Sensible defaults should be provided (1 hour TTL, 100 max entries)
6. **Library Choice**: Use `cachetools.TTLCache` as the caching backend

## Architecture

### Component Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
├──────────────────────────────────────────────────────────────┤
│ API Endpoints (api/clusters.py, api/pages.py, api/search.py) │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  @router.get("/namespace/{namespace}/root_node")       │  │
│  │  @async_cache(key_prefix="root_node")                  │  │
│  │  async def get_root_node(...):                         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Cache Decorator (util/cache.py)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  @async_cache(key_prefix=..., ttl=...)                │  │
│  │  - Generates cache key from args/kwargs               │  │
│  │  - Checks cache for existing entry                    │  │
│  │  - Calls function on cache miss                       │  │
│  │  - Stores result in cache                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          Global TTLCache Instance (cachetools)              │
│  - maxsize: Configurable via CACHE_MAX_SIZE (default: 100)  │
│  - ttl: Configurable via CACHE_TTL_SECONDS (default: 3600)  │
│  - LRU eviction when maxsize exceeded                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          Configuration (util/environment.py)                │
│  - CacheConfig class reads environment variables            │
│  - Provides default values                                  │
└─────────────────────────────────────────────────────────────┘
```

## Library Choice: cachetools.TTLCache

### Why cachetools?

The `cachetools` library was chosen for the following reasons:

1. **Built-in TTL Support**: `TTLCache` provides automatic time-based expiration without manual implementation
2. **LRU Eviction**: Automatically evicts least-recently-used entries when size limit is reached
3. **Thread-Safe**: The cache implementation is thread-safe for concurrent access
4. **Simple API**: Clean, Pythonic interface that integrates well with decorators
5. **Well-Maintained**: Actively maintained library with good documentation
6. **Lightweight**: Minimal dependencies and small footprint

### Alternative Libraries Considered

#### `functools.lru_cache`

**Pros:**
- Standard library, zero dependencies
- Very fast (C implementation)
- Thread-safe

**Cons:**
- No expiration (TTL)
- Sync only (not async def)
- Cache tied to function args only (no manual keys)
- Per-process (each Uvicorn worker gets its own cache)

#### `async_lru`

**Pros:**
- Designed for async def
- Coalesces concurrent identical calls (important for web apps)

**Cons:**
- No TTL
- LRU only

#### manual dictionary

**Pros:**
- Maximum control
- Zero dependencies

**Cons:**
- You implement eviction, locking, cleanup

#### `fastapi-cache2`

**Pros:**
- Designed for FastAPI
- Async-friendly
- Route response caching

**Cons:**
- Another dependency
- Still per-process

## Implementation Details

### 1. Configuration (util/environment.py)

The [`CacheConfig`](../util/environment.py:79) class provides static methods to read cache settings:

```python
class CacheConfig:
    @staticmethod
    def get_ttl_seconds() -> int:
        """Get cache TTL in seconds from environment"""
        return int(os.getenv("CACHE_TTL_SECONDS", "3600"))  # Default: 1 hour

    @staticmethod
    def get_max_size() -> int:
        """Get maximum cache size from environment"""
        return int(os.getenv("CACHE_MAX_SIZE", "100"))  # Default: 100 entries
```

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_TTL_SECONDS` | Time-to-live for cache entries in seconds | `3600` (1 hour) |
| `CACHE_MAX_SIZE` | Maximum number of entries in cache | `100` |

### 2. Cache Decorator (util/cache.py)

The [`@async_cache`](../util/cache.py:35) decorator is the core of the caching implementation:

```python
def async_cache(
    key_prefix: str | None = None,
    ttl: int | None = None,
) -> Callable[[Callable[P, Coroutine[Any, Any, T]]], Callable[P, Coroutine[Any, Any, T]]]:
    """Async decorator for caching function results using TTLCache"""
```

**Parameters:**

- `key_prefix`: Optional prefix for cache keys. If `None`, uses the function name.
- `ttl`: Optional custom TTL in seconds. If `None`, uses default from config.

### 3. Cache Key Construction

The cache key is generated on [line 67](../util/cache.py:67):

```python
cache_key = (prefix, args, frozenset(kwargs.items()))
```

**Key Components:**

| Component | Type | Purpose | Example |
|-----------|------|---------|---------|
| `prefix` | `str` | Function/endpoint identifier | `"root_node"` |
| `args` | `tuple` | Positional arguments | `("enwiki_namespace_0",)` |
| `frozenset(kwargs.items())` | `frozenset` | Keyword arguments (order-independent) | `frozenset({("node_id", 42)})` |

**Why frozenset for kwargs?**

- `kwargs.items()` returns `dict_items` which is not hashable
- `frozenset` makes it immutable and hashable
- Order of kwargs doesn't matter: `{"a":1,"b":2}` == `{"b":2,"a":1}`

**Example Cache Keys:**

```python
# get_root_node("enwiki_namespace_0")
("root_node", ("enwiki_namespace_0",), frozenset())

# get_cluster_node("enwiki_namespace_0", node_id=42)
("cluster_node", ("enwiki_namespace_0",), frozenset({("node_id", 42)}))
```

### 4. Global Cache Instance

The [`get_cache()`](../util/cache.py:18) function manages a singleton `TTLCache` instance:

```python
_cache: TTLCache | None = None

def get_cache() -> TTLCache:
    """Get or create the global TTLCache instance"""
    global _cache
    if _cache is None:
        ttl = Config.cache.get_ttl_seconds()
        max_size = Config.cache.get_max_size()
        _cache = TTLCache(maxsize=max_size, ttl=ttl)
        logger.info(f"Created TTLCache with max_size={max_size}, ttl={ttl}s")
    return _cache
```

### 5. Cache Flow

```
Request → Endpoint → @async_cache wrapper
                              │
                              ├─→ Check cache for key
                              │       │
                              │       ├─→ HIT → Return cached value
                              │       │
                              │       └─→ MISS → Call function
                              │                   │
                              │                   └─→ Store result in cache
                              │                       │
                              └───────────────────────┘
                                    Return result
```

## API Endpoints with Caching

### Applied Decorators

| File | Endpoint | Key Prefix |
|------|----------|------------|
| [`api/clusters.py`](../api/clusters.py) | `get_root_node` | `root_node` |
| [`api/clusters.py`](../api/clusters.py) | `get_cluster_node` | `cluster_node` |
| [`api/clusters.py`](../api/clusters.py) | `get_cluster_node_children` | `cluster_node_children` |
| [`api/clusters.py`](../api/clusters.py) | `get_cluster_node_siblings` | `cluster_node_siblings` |
| [`api/clusters.py`](../api/clusters.py) | `get_cluster_node_parent` | `cluster_node_parent` |
| [`api/clusters.py`](../api/clusters.py) | `get_cluster_node_ancestors` | `cluster_node_ancestors` |
| [`api/pages.py`](../api/pages.py) | `get_pages_in_cluster` | `pages_in_cluster` |
| [`api/pages.py`](../api/pages.py) | `get_page_details` | `page_details` |
| [`api/search.py`](../api/search.py) | `get_available_namespaces` | `available_namespaces` |

### Example Usage

```python
@router.get("/namespace/{namespace}/root_node", response_model=ClusterNodeResponse)
@async_cache(key_prefix="root_node")
async def get_root_node(
    namespace: Annotated[str, Path(title="Wikipedia namespace")],
    cluster_service: ClusterService = Depends(
        lambda: service_provider("cluster_service")
    ),
):
    """Get details for a specific cluster node"""
    node = cluster_service.get_root_node(namespace)
    return node
```

## Utility Functions

### clear_cache()

Clears all cached entries:

```python
from util.cache import clear_cache

clear_cache()  # Empties the entire cache
```

### get_cache_stats()

Returns cache statistics:

```python
from util.cache import get_cache_stats

stats = get_cache_stats()
# Returns: {"current_size": 42, "max_size": 100, "ttl_seconds": 3600}
```

## Testing

Comprehensive tests are provided in [`test/test_cache.py`](../test/test_cache.py):

| Test | Description |
|------|-------------|
| `test_async_cache_hit` | Verifies cache returns cached value on subsequent calls |
| `test_async_cache_different_args` | Tests different arguments result in separate cache entries |
| `test_async_cache_with_kwargs` | Tests cache works with keyword arguments |
| `test_clear_cache` | Tests that clear_cache removes all entries |
| `test_get_cache_stats` | Tests that get_cache_stats returns correct information |
| `test_cache_stats_updates` | Tests that cache stats update correctly |
| `test_default_key_prefix` | Tests that default key prefix is function name |

Run tests with:
```bash
uv run pytest test/test_cache.py -v
```

## Configuration Examples

### Default Configuration

No environment variables set:
```bash
# Uses defaults
# TTL: 3600 seconds (1 hour)
# Max Size: 100 entries
```

### Custom Configuration

Set in `.env` file:
```bash
CACHE_TTL_SECONDS=7200    # 2 hours
CACHE_MAX_SIZE=500         # 500 entries
```

### Per-Endpoint Custom TTL

Override TTL for specific endpoints:
```python
@async_cache(key_prefix="user_data", ttl=300)  # 5 minutes
async def get_user_data(user_id: int):
    return await fetch_user(user_id)
```

## Performance Considerations

### Benefits

1. **Reduced Database Load**: Cached results avoid repeated database queries
2. **Faster Response Times**: In-memory cache is significantly faster than database access
3. **Lower Latency**: Eliminates network/database round-trips for cached data

### Trade-offs

1. **Memory Usage**: In-memory cache consumes RAM proportional to cache size
2. **Staleness**: Cached data may be outdated until TTL expires
3. **Single-Process Only**: Cache is not shared across multiple worker processes

### Recommendations

- **Monitor cache hit rate** using logs to assess effectiveness
- **Adjust TTL** based on data freshness requirements
- **Adjust max_size** based on available memory and request patterns
- **Consider cache warming** for frequently accessed endpoints

## Future Enhancements

Potential improvements for future iterations:

1. **Distributed Caching**: Use Redis or Memcached for multi-process scenarios
2. **Cache Invalidation**: Implement selective cache invalidation on data changes
3. **Cache Metrics**: Add Prometheus metrics for cache hit/miss rates
4. **Cache Warming**: Pre-populate cache on application startup
5. **Compression**: Compress cached values to reduce memory usage

## References

- [cachetools Documentation](https://cachetools.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Python functools - Decorators](https://docs.python.org/3/library/functools.html)
