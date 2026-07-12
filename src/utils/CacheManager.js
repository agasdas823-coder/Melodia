const DB_NAME = 'MelodiaCache';
const STORE_NAME = 'audio_urls';
const DB_VERSION = 1;
const MAX_SONGS = 200;

export class CacheManager {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('[CacheManager] IndexedDB init error', event);
        reject(event.target.error);
      };
    });
  }

  async saveAudio(data) {
    await this.initPromise;
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const item = {
        id: data.id,
        url: data.url,
        title: data.title,
        artist: data.artist,
        thumbnail: data.thumbnail,
        source: data.source || 'indexeddb',
        timestamp: Date.now(),
      };

      const request = store.put(item);
      
      request.onsuccess = () => {
        // After saving, check limit and enforce cleanup asynchronously
        this.enforceLimit();
        resolve(item);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAudio(id) {
    await this.initPromise;
    if (!this.db || !id) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = (e) => {
        const result = e.target.result;
        if (result) {
          // Verify TTL? The prompt asks for 30 days. Let's enforce that.
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          if (Date.now() - result.timestamp > thirtyDaysMs) {
            this.removeAudio(id);
            resolve(null);
          } else {
            resolve(result);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  async removeAudio(id) {
    await this.initPromise;
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getCount() {
    await this.initPromise;
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async enforceLimit() {
    const count = await this.getCount();
    if (count <= MAX_SONGS) return;

    const excess = count - MAX_SONGS;
    await this.removeOldest(excess);
  }

  async removeOldest(count) {
    await this.initPromise;
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor();
      
      let deleted = 0;

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && deleted < count) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  async clearCache() {
    await this.initPromise;
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

export const cacheManager = new CacheManager();
