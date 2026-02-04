/**
 * In-memory caching layer for reservation data
 * 
 * Provides fast access to frequently requested data like availability
 * with automatic expiration and invalidation support.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class ReservationCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * @param defaultTTL Default time-to-live for cache entries in milliseconds
   */
  constructor(defaultTTL: number = 30000) {
    // Default TTL: 30 seconds
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   * 
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache with TTL
   * 
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time-to-live in milliseconds (uses default if not provided)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data: value, expiresAt });
  }

  /**
   * Invalidate cache entries matching pattern
   * 
   * @param pattern Regular expression pattern to match keys
   * 
   * @example
   * // Invalidate all availability caches
   * cache.invalidate('availability:.*');
   * 
   * // Invalidate cache for specific date
   * cache.invalidate('availability:2026-01-24');
   */
  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    let invalidatedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    if (invalidatedCount > 0) {
      console.log(`Cache invalidated: ${invalidatedCount} entries matching pattern "${pattern}"`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`Cache cleared: ${count} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * Stop the cleanup interval (useful for testing or graceful shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance for use across the application
export const reservationCache = new ReservationCache();
