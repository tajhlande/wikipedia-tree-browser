"""
Unit tests for the caching decorator
"""

import pytest
from util.cache import async_cache, clear_cache, get_cache_stats


class TestAsyncCacheDecorator:
    """Test suite for the async cache decorator"""

    def setup_method(self):
        """Clear cache before each test"""
        clear_cache()

    @pytest.mark.asyncio
    async def test_async_cache_hit(self):
        """Test that cache returns cached value on subsequent calls"""
        call_count = 0

        @async_cache(key_prefix="test_hit")
        async def expensive_function(x: int) -> int:
            nonlocal call_count
            call_count += 1
            return x * 2

        # First call - cache miss
        result1 = await expensive_function(5)
        assert result1 == 10
        assert call_count == 1

        # Second call - cache hit
        result2 = await expensive_function(5)
        assert result2 == 10
        assert call_count == 1  # Should not increment

    @pytest.mark.asyncio
    async def test_async_cache_different_args(self):
        """Test that different arguments result in separate cache entries"""
        call_count = 0

        @async_cache(key_prefix="test_args")
        async def add_numbers(a: int, b: int) -> int:
            nonlocal call_count
            call_count += 1
            return a + b

        result1 = await add_numbers(1, 2)
        result2 = await add_numbers(1, 2)  # Cache hit
        result3 = await add_numbers(3, 4)  # Cache miss (different args)
        result4 = await add_numbers(1, 2)  # Cache hit

        assert result1 == 3
        assert result2 == 3
        assert result3 == 7
        assert result4 == 3
        assert call_count == 2  # Only called for (1,2) and (3,4)

    @pytest.mark.asyncio
    async def test_async_cache_with_kwargs(self):
        """Test that cache works with keyword arguments"""
        call_count = 0

        @async_cache(key_prefix="test_kwargs")
        async def greet(name: str, greeting: str = "Hello") -> str:
            nonlocal call_count
            call_count += 1
            return f"{greeting}, {name}!"

        result1 = await greet("Alice", greeting="Hi")
        result2 = await greet("Alice", greeting="Hi")  # Cache hit
        result3 = await greet("Bob", greeting="Hi")  # Cache miss
        result4 = await greet(
            "Alice", greeting="Hello"
        )  # Cache miss (different greeting)

        assert result1 == "Hi, Alice!"
        assert result2 == "Hi, Alice!"
        assert result3 == "Hi, Bob!"
        assert result4 == "Hello, Alice!"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_clear_cache(self):
        """Test that clear_cache removes all entries"""
        call_count = 0

        @async_cache(key_prefix="test_clear")
        async def get_value(x: int) -> int:
            nonlocal call_count
            call_count += 1
            return x

        await get_value(1)
        await get_value(1)  # Cache hit
        assert call_count == 1

        clear_cache()

        await get_value(1)  # Cache miss after clear
        assert call_count == 2

    def test_get_cache_stats(self):
        """Test that get_cache_stats returns correct information"""
        stats = get_cache_stats()
        assert "current_size" in stats
        assert "max_size" in stats
        assert "ttl_seconds" in stats
        assert stats["max_size"] == 100  # Default from config
        assert stats["ttl_seconds"] == 3600  # Default from config

    @pytest.mark.asyncio
    async def test_cache_stats_updates(self):
        """Test that cache stats update correctly"""

        @async_cache(key_prefix="test_stats")
        async def dummy_func(x: int) -> int:
            return x

        stats_before = get_cache_stats()
        initial_size = stats_before["current_size"]

        await dummy_func(1)
        await dummy_func(2)

        stats_after = get_cache_stats()
        assert stats_after["current_size"] == initial_size + 2

    @pytest.mark.asyncio
    async def test_default_key_prefix(self):
        """Test that default key prefix is function name"""
        myf_call_count = 0
        myof_call_count = 0

        @async_cache()  # No key_prefix specified
        async def my_function(x: int) -> int:
            nonlocal myf_call_count
            myf_call_count += 1
            return x

        @async_cache()  # No key_prefix specified
        async def my_other_function(x: int) -> int:
            nonlocal myof_call_count
            myof_call_count += 1
            return x

        await my_function(1)
        await my_function(1)  # Cache hit
        await my_other_function(1)
        await my_other_function(1)  # Cache hit

        # assert the function calls have been distinguished by function names
        assert myf_call_count == 1
        assert myof_call_count == 1
