import time
from typing import Any, Optional, Dict, List


class SimpleMemoryCache:
    """
    Ultra-fast in-memory TTL cache for public read-heavy REST endpoints.
    Allows sub-millisecond responses without database overhead.
    """
    def __init__(self, default_ttl_seconds: int = 60):
        self._store: Dict[str, tuple[float, Any]] = {}
        self.default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            expires_at, value = self._store[key]
            if time.time() < expires_at:
                return value
            # Expired, clean up
            del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        duration = ttl if ttl is not None else self.default_ttl
        self._store[key] = (time.time() + duration, value)

    def invalidate(self, prefix: str = "") -> None:
        if not prefix:
            self._store.clear()
        else:
            to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in to_delete:
                self._store.pop(k, None)

    def clear(self) -> None:
        self._store.clear()


# Global cache instance
cache = SimpleMemoryCache(default_ttl_seconds=60)
