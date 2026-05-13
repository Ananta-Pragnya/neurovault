import time
import json
import logging
import os
import sqlite3
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Redis fallback: In-memory dictionary
_MEM_CACHE = {}

class Cache:
    def __init__(self):
        self.redis = None
        self.db_path = os.path.join(os.getcwd(), "data", "cache_l4.db")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_l4()

        # Attempt to connect to Redis if REDIS_URL exists
        redis_url = os.environ.get("REDIS_URL")
        if redis_url:
            try:
                import redis
                self.redis = redis.from_url(redis_url, decode_responses=True)
                logger.info("Connected to Redis cache.")
            except Exception as e:
                logger.warning(f"Redis unavailable: {e}. Falling back to in-memory/L4 cache.")

    def _init_l4(self):
        """Initialize L4 SQLite cache table"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, expiry REAL)")
        except Exception as e:
            logger.error(f"Failed to initialize L4 cache: {e}")

    async def get(self, key: str) -> Optional[Any]:
        # L3: Redis
        if self.redis:
            try:
                val = self.redis.get(key)
                if val: return json.loads(val)
            except Exception:
                pass
        
        # L2: In-memory
        item = _MEM_CACHE.get(key)
        if item:
            val, expiry = item
            if expiry > time.time():
                return val
            else:
                del _MEM_CACHE[key]

        # L4: File-based (Last resort / Persistent)
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT value, expiry FROM cache WHERE key = ?", (key,))
                row = cursor.fetchone()
                if row:
                    val_str, expiry = row
                    if expiry > time.time():
                        return json.loads(val_str)
        except Exception as e:
            logger.error(f"L4 cache get error: {e}")

        return None

    async def set(self, key: str, value: Any, ttl: int = 60):
        val_str = json.dumps(value)
        expiry = time.time() + ttl

        # L3: Redis
        if self.redis:
            try:
                self.redis.setex(key, ttl, val_str)
            except Exception:
                pass
        
        # L2: In-memory
        _MEM_CACHE[key] = (value, expiry)

        # L4: File-based persistence
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)",
                    (key, val_str, expiry)
                )
        except Exception as e:
            logger.error(f"L4 cache set error: {e}")

# Singleton instance for original cache architecture
cache = Cache()

# --- UnifiedCache Layer (Fix 5) ---
class UnifiedCache:
    def __init__(self, ttl_seconds: int = 60):
        self._store: dict = {}
        self._ttl  = ttl_seconds

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        effective_ttl = ttl if ttl is not None else self._ttl
        self._store[key] = {"value": value, "ts": time.time(), "ttl": effective_ttl}

    def get(self, key: str) -> Any:
        entry = self._store.get(key)
        if not entry:
            return None
        if time.time() - entry["ts"] > entry.get("ttl", self._ttl):
            del self._store[key]
            return None
        return entry["value"]

    def get_or_fetch(self, key: str, fetch_fn, *args):
        """
        Returns cached value if fresh.
        Only calls fetch_fn (= API call) if cache is stale.
        """
        cached = self.get(key)
        if cached is not None:
            return cached
        import asyncio
        if asyncio.iscoroutinefunction(fetch_fn):
            raise ValueError("Use async get_or_fetch for async fetch functions")
        result = fetch_fn(*args)
        self.set(key, result)
        return result
        
    async def get_or_fetch_async(self, key: str, fetch_fn, *args):
        cached = self.get(key)
        if cached is not None:
            return cached
        result = await fetch_fn(*args)
        self.set(key, result)
        return result

    def invalidate(self, key: str):
        self._store.pop(key, None)

    def clear_expired(self):
        now    = time.time()
        stale  = [k for k, v in self._store.items()
                  if now - v["ts"] > v.get("ttl", self._ttl)]
        for k in stale:
            del self._store[k]

unified_cache = UnifiedCache(ttl_seconds=60)
