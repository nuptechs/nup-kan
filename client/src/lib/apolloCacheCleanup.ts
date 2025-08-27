/**
 * Apollo Cache Cleanup Utility
 * 
 * This utility helps prevent conflicts from previous Apollo GraphQL implementations
 * by cleaning up any Apollo-related cache entries and localStorage data that might
 * be causing the "ApolloError: Notification alert not found" error.
 */

interface ApolloCleanupOptions {
  clearLocalStorage?: boolean;
  clearSessionStorage?: boolean;
  clearIndexedDB?: boolean;
  clearServiceWorkers?: boolean;
}

export class ApolloCacheCleanup {
  private static readonly APOLLO_CACHE_KEYS = [
    'apollo-cache-persist',
    'apollo-cache',
    'apollo-client-cache',
    '__APOLLO_CLIENT__',
    'apollo-link-state-cache',
    'apollo-cache-inmemory',
    'APOLLO_CACHE_PERSIST'
  ];

  private static readonly APOLLO_STORAGE_PATTERNS = [
    /^apollo/i,
    /^__apollo/i,
    /^graphql/i,
    /cache.*apollo/i,
    /apollo.*cache/i
  ];

  /**
   * Clean up Apollo-related cache and storage
   */
  static async cleanup(options: ApolloCleanupOptions = {}): Promise<void> {
    const {
      clearLocalStorage = true,
      clearSessionStorage = true,
      clearIndexedDB = true,
      clearServiceWorkers = true
    } = options;

    console.log('🧹 [APOLLO-CLEANUP] Starting Apollo cache cleanup...');

    try {
      // Clear localStorage
      if (clearLocalStorage) {
        await this.clearLocalStorageApolloData();
      }

      // Clear sessionStorage
      if (clearSessionStorage) {
        await this.clearSessionStorageApolloData();
      }

      // Clear IndexedDB Apollo data
      if (clearIndexedDB) {
        await this.clearIndexedDBApolloData();
      }

      // Clear service workers
      if (clearServiceWorkers) {
        await this.clearServiceWorkers();
      }

      // Clear any remaining Apollo-related browser cache
      await this.clearBrowserCache();

      console.log('✅ [APOLLO-CLEANUP] Apollo cache cleanup completed successfully');
    } catch (error) {
      console.error('❌ [APOLLO-CLEANUP] Error during cleanup:', error);
    }
  }

  /**
   * Clear Apollo data from localStorage
   */
  private static async clearLocalStorageApolloData(): Promise<void> {
    try {
      const keysToRemove: string[] = [];

      // Find keys that match Apollo patterns
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && this.isApolloKey(key)) {
          keysToRemove.push(key);
        }
      }

      // Remove Apollo-specific keys
      this.APOLLO_CACHE_KEYS.forEach(key => {
        if (localStorage.getItem(key)) {
          keysToRemove.push(key);
        }
      });

      // Remove all identified keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ [APOLLO-CLEANUP] Removed localStorage key: ${key}`);
      });

      console.log(`🧹 [APOLLO-CLEANUP] Cleared ${keysToRemove.length} Apollo localStorage entries`);
    } catch (error) {
      console.error('❌ [APOLLO-CLEANUP] Error clearing localStorage:', error);
    }
  }

  /**
   * Clear Apollo data from sessionStorage
   */
  private static async clearSessionStorageApolloData(): Promise<void> {
    try {
      const keysToRemove: string[] = [];

      // Find keys that match Apollo patterns
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && this.isApolloKey(key)) {
          keysToRemove.push(key);
        }
      }

      // Remove all identified keys
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️ [APOLLO-CLEANUP] Removed sessionStorage key: ${key}`);
      });

      console.log(`🧹 [APOLLO-CLEANUP] Cleared ${keysToRemove.length} Apollo sessionStorage entries`);
    } catch (error) {
      console.error('❌ [APOLLO-CLEANUP] Error clearing sessionStorage:', error);
    }
  }

  /**
   * Clear Apollo data from IndexedDB
   */
  private static async clearIndexedDBApolloData(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.log('🟡 [APOLLO-CLEANUP] IndexedDB not available');
      return;
    }

    try {
      const databases = await indexedDB.databases();
      
      for (const dbInfo of databases) {
        const dbName = dbInfo.name;
        if (dbName && this.isApolloKey(dbName)) {
          try {
            indexedDB.deleteDatabase(dbName);
            console.log(`🗑️ [APOLLO-CLEANUP] Deleted IndexedDB: ${dbName}`);
          } catch (error) {
            console.error(`❌ [APOLLO-CLEANUP] Error deleting IndexedDB ${dbName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ [APOLLO-CLEANUP] Error accessing IndexedDB:', error);
    }
  }

  /**
   * Clear service workers that might be serving cached Apollo content
   */
  private static async clearServiceWorkers(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('🟡 [APOLLO-CLEANUP] Service Workers not available');
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ [APOLLO-CLEANUP] Unregistered service worker:', registration.scope);
      }

      console.log(`🧹 [APOLLO-CLEANUP] Cleared ${registrations.length} service workers`);
    } catch (error) {
      console.error('❌ [APOLLO-CLEANUP] Error clearing service workers:', error);
    }
  }

  /**
   * Clear browser cache using Cache API
   */
  private static async clearBrowserCache(): Promise<void> {
    if (!('caches' in window)) {
      console.log('🟡 [APOLLO-CLEANUP] Cache API not available');
      return;
    }

    try {
      const cacheNames = await caches.keys();
      const apolloCaches = cacheNames.filter(name => this.isApolloKey(name));
      
      for (const cacheName of apolloCaches) {
        await caches.delete(cacheName);
        console.log(`🗑️ [APOLLO-CLEANUP] Deleted cache: ${cacheName}`);
      }

      console.log(`🧹 [APOLLO-CLEANUP] Cleared ${apolloCaches.length} Apollo caches`);
    } catch (error) {
      console.error('❌ [APOLLO-CLEANUP] Error clearing browser cache:', error);
    }
  }

  /**
   * Check if a key is Apollo-related
   */
  private static isApolloKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    
    // Check explicit keys
    if (this.APOLLO_CACHE_KEYS.some(cacheKey => 
      lowerKey === cacheKey.toLowerCase() || 
      lowerKey.includes(cacheKey.toLowerCase())
    )) {
      return true;
    }

    // Check patterns
    return this.APOLLO_STORAGE_PATTERNS.some(pattern => pattern.test(key));
  }

  /**
   * Initialize cleanup on app start - run automatically
   */
  static async initCleanup(): Promise<void> {
    // Only run cleanup once per session
    const cleanupKey = 'apollo-cleanup-v1';
    const hasRun = sessionStorage.getItem(cleanupKey);
    
    if (!hasRun) {
      await this.cleanup();
      sessionStorage.setItem(cleanupKey, 'true');
    }
  }

  /**
   * Force cleanup - can be called manually
   */
  static async forceCleanup(): Promise<void> {
    await this.cleanup();
    
    // Clear the session flag so cleanup can run again if needed
    sessionStorage.removeItem('apollo-cleanup-v1');
    
    // Reload page to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// Auto-initialize cleanup when module loads
if (typeof window !== 'undefined') {
  // Run cleanup after a short delay to avoid blocking initial render
  setTimeout(() => {
    ApolloCacheCleanup.initCleanup();
  }, 100);
}

export { ApolloCacheCleanup as apolloCleanup };