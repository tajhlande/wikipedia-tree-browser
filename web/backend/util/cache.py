"""
Async caching decorator using TTLCache for FastAPI endpoints
"""

import functools
import logging
from typing import Any, Callable, TypeVar, ParamSpec, Coroutine
from cachetools import TTLCache
from util.environment import Config

logger = logging.getLogger(__name__)

P = ParamSpec("P")
T = TypeVar("T")

# Global cache instance
_cache: TTLCache | None = None


def get_cache() -> TTLCache:
    """
    Get or create the global TTLCache instance

    Returns:
        TTLCache instance configured with environment settings
    """
    global _cache
    if _cache is None:
        ttl = Config.cache.get_ttl_seconds()
        max_size = Config.cache.get_max_size()
        _cache = TTLCache(maxsize=max_size, ttl=ttl)
        logger.info(f"Created TTLCache with max_size={max_size}, ttl={ttl}s")
    return _cache


def async_cache(
    key_prefix: str | None = None,
    ttl: int | None = None,
) -> Callable[
    [Callable[P, Coroutine[Any, Any, T]]],
    Callable[P, Coroutine[Any, Any, T]],
]:
    """
    Async decorator for caching function results using TTLCache

    Args:
        key_prefix: Optional prefix for cache keys. If None, uses function name.
        ttl: Optional custom TTL in seconds. If None, uses default from config.

    Returns:
        Decorator function

    Example:
        @async_cache(key_prefix="user_data", ttl=300)
        async def get_user(user_id: int):
            return await db.fetch_user(user_id)
    """

    def decorator(
        func: Callable[P, Coroutine[Any, Any, T]]
    ) -> Callable[P, Coroutine[Any, Any, T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Generate cache key
            prefix = key_prefix or func.__name__
            # Create a hashable key from args and kwargs
            cache_key = (prefix, args, frozenset(kwargs.items()))

            cache = get_cache()

            # Try to get from cache
            try:
                cached_value = cache[cache_key]
                logger.debug(f"Cache HIT for key: {prefix}")
                return cached_value
            except KeyError:
                # Cache miss - call the function
                logger.debug(f"Cache MISS for key: {prefix}")
                result = await func(*args, **kwargs)

                # Store in cache
                try:
                    cache[cache_key] = result
                    logger.debug(f"Cached result for key: {prefix}")
                except Exception as e:
                    logger.warning(f"Failed to cache result: {e}")

                return result

        return wrapper

    return decorator


def clear_cache() -> None:
    """Clear all cached entries"""
    if _cache is not None:
        _cache.clear()
        logger.info("Cache cleared")


def get_cache_stats() -> dict[str, Any]:
    """
    Get cache statistics

    Returns:
        Dictionary with cache stats including size, maxsize, and ttl
    """
    cache = get_cache()
    return {
        "current_size": len(cache),
        "max_size": cache.maxsize,
        "ttl_seconds": cache.ttl,
    }
