/**
 * High-performance In-Memory API Cache & Request Deduplicator
 * Provides sub-millisecond responses for read-heavy REST queries (cruises, tours, offers, etc.)
 * Prevents redundant parallel network calls through in-flight deduplication.
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCacheManager {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<any>>();
  private defaultTtlMs = 120000; // 2 minutes

  /**
   * Retrieves fresh cached entry if still valid.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp < entry.ttl) {
      return entry.data as T;
    }

    // Expired
    this.cache.delete(key);
    return null;
  }

  /**
   * Saves data into memory cache.
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs !== undefined ? ttlMs : this.defaultTtlMs,
    });
  }

  /**
   * Gets currently running request promise to deduplicate parallel requests.
   */
  getInFlight<T>(key: string): Promise<T> | null {
    return (this.inFlight.get(key) as Promise<T>) || null;
  }

  /**
   * Sets in-flight request promise.
   */
  setInFlight<T>(key: string, promise: Promise<T>): void {
    this.inFlight.set(key, promise);
    promise
      .finally(() => {
        this.inFlight.delete(key);
      })
      .catch(() => {});
  }

  /**
   * Invalidates specific cache keys by prefix/substring, or all if no pattern provided.
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => this.cache.delete(k));
  }

  /**
   * Clears everything.
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const apiCache = new ApiCacheManager();
export const clearApiCache = (pattern?: string) => apiCache.invalidate(pattern);
