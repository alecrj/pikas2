import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorHandler } from './ErrorHandler';

/**
 * High-performance data management system with caching, compression, and sync
 * Handles all data persistence needs with optimal performance
 */
export class DataManager {
  private static instance: DataManager;
  private cache: Map<string, CacheEntry> = new Map();
  private pendingWrites: Map<string, any> = new Map();
  private writeTimer: NodeJS.Timeout | null = null;
  private readonly cacheMaxSize = 50 * 1024 * 1024; // 50MB cache
  private currentCacheSize = 0;
  private readonly writeDebounceMs = 1000;
  
  private readonly storageKeys = {
    USER_PROFILE: 'user_profile',
    USER_PREFERENCES: 'user_preferences',
    LEARNING_PROGRESS: 'learning_progress',
    ARTWORKS: 'artworks',
    OFFLINE_QUEUE: 'offline_queue',
    CACHE_METADATA: 'cache_metadata',
  };

  private constructor() {
    this.initializeCache();
    this.setupPeriodicCleanup();
  }

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  private async initializeCache(): Promise<void> {
    try {
      const metadata = await this.loadCacheMetadata();
      if (metadata) {
        // Restore frequently accessed items to cache
        for (const key of metadata.frequentKeys) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            this.addToCache(key, JSON.parse(data));
          }
        }
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('CACHE_INIT_ERROR', 'Failed to initialize cache', 'low', error)
      );
    }
  }

  private setupPeriodicCleanup(): void {
    // Clean up old cache entries every hour
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 60 * 1000);
  }

  // Generic data operations with caching
  public async get<T>(key: string): Promise<T | null> {
    // Check cache first
    const cached = this.getFromCache(key);
    if (cached !== null) {
      return cached as T;
    }

    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        this.addToCache(key, parsed);
        return parsed as T;
      }
      return null;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.storageError(`Failed to get data for key: ${key}`, error)
      );
      return null;
    }
  }

  public async set(key: string, value: any): Promise<void> {
    // Update cache immediately
    this.addToCache(key, value);
    
    // Debounce writes to storage
    this.pendingWrites.set(key, value);
    this.schedulePendingWrites();
  }

  private schedulePendingWrites(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    
    this.writeTimer = setTimeout(() => {
      this.flushPendingWrites();
    }, this.writeDebounceMs);
  }

  private async flushPendingWrites(): Promise<void> {
    const writes = Array.from(this.pendingWrites.entries());
    this.pendingWrites.clear();
    
    try {
      const writePromises = writes.map(([key, value]) => 
        AsyncStorage.setItem(key, JSON.stringify(value))
      );
      await Promise.all(writePromises);
    } catch (error) {
      // Re-add failed writes to pending
      writes.forEach(([key, value]) => this.pendingWrites.set(key, value));
      errorHandler.handleError(
        errorHandler.storageError('Failed to write pending data', error)
      );
    }
  }

  public async remove(key: string): Promise<void> {
    this.removeFromCache(key);
    this.pendingWrites.delete(key);
    
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.storageError(`Failed to remove data for key: ${key}`, error)
      );
    }
  }

  // Batch operations for performance
  public async getBatch<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const uncachedKeys: string[] = [];
    
    // Get cached values
    keys.forEach(key => {
      const cached = this.getFromCache(key);
      if (cached !== null) {
        results.set(key, cached as T);
      } else {
        uncachedKeys.push(key);
      }
    });
    
    // Fetch uncached values
    if (uncachedKeys.length > 0) {
      try {
        const pairs = await AsyncStorage.multiGet(uncachedKeys);
        pairs.forEach(([key, value]) => {
          if (value) {
            const parsed = JSON.parse(value);
            results.set(key, parsed as T);
            this.addToCache(key, parsed);
          }
        });
      } catch (error) {
        errorHandler.handleError(
          errorHandler.storageError('Failed to get batch data', error)
        );
      }
    }
    
    return results;
  }

  public async setBatch(items: Map<string, any>): Promise<void> {
    // Update cache
    items.forEach((value, key) => {
      this.addToCache(key, value);
      this.pendingWrites.set(key, value);
    });
    
    this.schedulePendingWrites();
  }

  // Cache management
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      return entry.data;
    }
    return null;
  }

  private addToCache(key: string, data: any): void {
    const size = this.estimateSize(data);
    
    // Remove old entries if cache is full
    while (this.currentCacheSize + size > this.cacheMaxSize && this.cache.size > 0) {
      this.evictOldestEntry();
    }
    
    const entry: CacheEntry = {
      data,
      size,
      created: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
    };
    
    if (this.cache.has(key)) {
      this.currentCacheSize -= this.cache.get(key)!.size;
    }
    
    this.cache.set(key, entry);
    this.currentCacheSize += size;
  }

  private removeFromCache(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.cache.delete(key);
    }
  }

  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestScore = Infinity;
    
    // LRU with frequency consideration
    this.cache.forEach((entry, key) => {
      const age = Date.now() - entry.lastAccessed;
      const score = age / entry.accessCount;
      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.removeFromCache(oldestKey);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.lastAccessed > maxAge) {
        this.removeFromCache(key);
      }
    });
    
    this.saveCacheMetadata();
  }

  private estimateSize(data: any): number {
    // Rough estimation of object size in bytes
    return JSON.stringify(data).length * 2; // UTF-16
  }

  // Specialized data operations
  public async saveUserProfile(profile: any): Promise<void> {
    await this.set(this.storageKeys.USER_PROFILE, profile);
  }

  public async getUserProfile(): Promise<any | null> {
    return this.get(this.storageKeys.USER_PROFILE);
  }

  public async saveLearningProgress(progress: any): Promise<void> {
    await this.set(this.storageKeys.LEARNING_PROGRESS, progress);
  }

  public async getLearningProgress(): Promise<any | null> {
    return this.get(this.storageKeys.LEARNING_PROGRESS);
  }

  public async saveArtwork(artworkId: string, artwork: any): Promise<void> {
    const artworks = await this.get<Record<string, any>>(this.storageKeys.ARTWORKS) || {};
    artworks[artworkId] = artwork;
    await this.set(this.storageKeys.ARTWORKS, artworks);
  }

  public async getArtwork(artworkId: string): Promise<any | null> {
    const artworks = await this.get<Record<string, any>>(this.storageKeys.ARTWORKS);
    return artworks?.[artworkId] || null;
  }

  public async getAllArtworks(): Promise<any[]> {
    const artworks = await this.get<Record<string, any>>(this.storageKeys.ARTWORKS);
    return artworks ? Object.values(artworks) : [];
  }

  // Offline queue management
  public async addToOfflineQueue(action: any): Promise<void> {
    const queue = await this.get<any[]>(this.storageKeys.OFFLINE_QUEUE) || [];
    queue.push({
      ...action,
      timestamp: Date.now(),
      id: `${Date.now()}_${Math.random()}`,
    });
    await this.set(this.storageKeys.OFFLINE_QUEUE, queue);
  }

  public async getOfflineQueue(): Promise<any[]> {
    return await this.get<any[]>(this.storageKeys.OFFLINE_QUEUE) || [];
  }

  public async clearOfflineQueue(): Promise<void> {
    await this.remove(this.storageKeys.OFFLINE_QUEUE);
  }

  // Metadata persistence
  private async saveCacheMetadata(): Promise<void> {
    const frequentKeys = Array.from(this.cache.entries())
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 20)
      .map(([key]) => key);
    
    await AsyncStorage.setItem(
      this.storageKeys.CACHE_METADATA,
      JSON.stringify({ frequentKeys, timestamp: Date.now() })
    );
  }

  private async loadCacheMetadata(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(this.storageKeys.CACHE_METADATA);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // Cleanup and maintenance
  public async clearAllData(): Promise<void> {
    this.cache.clear();
    this.pendingWrites.clear();
    this.currentCacheSize = 0;
    
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    
    try {
      await AsyncStorage.clear();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.storageError('Failed to clear all data', error)
      );
    }
  }

  public getCacheStats(): {
    size: number;
    entries: number;
    hitRate: number;
  } {
    let totalHits = 0;
    let totalAccess = 0;
    
    this.cache.forEach(entry => {
      totalAccess += entry.accessCount;
      totalHits += entry.accessCount - 1; // First access is a miss
    });
    
    return {
      size: this.currentCacheSize,
      entries: this.cache.size,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
    };
  }
}

interface CacheEntry {
  data: any;
  size: number;
  created: number;
  lastAccessed: number;
  accessCount: number;
}

// Export singleton instance
export const dataManager = DataManager.getInstance();