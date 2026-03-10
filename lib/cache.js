/**
 * API Response Caching Module
 * Provides caching functionality to reduce redundant API calls
 */

const fs = require("fs");
const path = require("path");
const { log } = require("./config");
const { CACHE } = require("./constants");

/**
 * Simple in-memory cache for API responses
 */
class ModelCache {
  constructor() {
    this.cache = new Map();
    this.cacheDir = path.join(__dirname, "..", ".cache");

    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate cache key for a provider
   */
  _generateKey(provider, params = "") {
    return `${provider}:${params}`;
  }

  /**
   * Get cached data if valid
   */
  get(provider, params = "") {
    const key = this._generateKey(provider, params);
    const cached = this.cache.get(key);

    if (cached) {
      const { data, timestamp } = cached;
      const now = Date.now();

      // Check if cache is still valid
      if (now - timestamp < CACHE.TTL) {
        log(
          `📦 Cache hit for ${provider}${params ? ` (${params})` : ""}`,
          "green",
        );
        return data;
      } else {
        // Remove expired cache
        this.cache.delete(key);
        this._removeCacheFile(key);
      }
    }

    return null;
  }

  /**
   * Set cache data with timestamp
   */
  set(provider, data, params = "") {
    const key = this._generateKey(provider, params);
    const timestamp = Date.now();

    this.cache.set(key, { data, timestamp });
    this._saveCacheFile(key, data);

    log(
      `💾 Cached ${provider}${params ? ` (${params})` : ""} (${data.length} items)`,
      "blue",
    );
  }

  /**
   * Clear cache for a provider
   */
  clear(provider, params = "") {
    const key = this._generateKey(provider, params);
    this.cache.delete(key);
    this._removeCacheFile(key);
    log(
      `🗑️ Cleared cache for ${provider}${params ? ` (${params})` : ""}`,
      "yellow",
    );
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache.clear();

    // Remove all cache files
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      files.forEach((file) => {
        if (file.endsWith(".json")) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      });
    }

    log("🗑️ Cleared all cache", "yellow");
  }

  /**
   * Get cache file path
   */
  _getCacheFilePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Save cache to file
   */
  _saveCacheFile(key, data) {
    const filePath = this._getCacheFilePath(key);
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          data,
          timestamp: Date.now(),
        },
        null,
        2,
      ),
    );
  }

  /**
   * Remove cache file
   */
  _removeCacheFile(key) {
    const filePath = this._getCacheFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Load existing cache from files
   */
  _loadExistingCache() {
    if (!fs.existsSync(this.cacheDir)) {
      return;
    }

    const files = fs.readdirSync(this.cacheDir);
    files.forEach((file) => {
      if (file.endsWith(".json")) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const content = fs.readFileSync(filePath, "utf8");
          const cacheData = JSON.parse(content);

          const key = file.replace(".json", "");
          this.cache.set(key, cacheData);
        } catch (error) {
          console.warn(`⚠️ Failed to load cache file ${file}:`, error.message);
        }
      }
    });
  }
}

// Create global cache instance
const modelCache = new ModelCache();

// Load existing cache on startup
modelCache._loadExistingCache();

module.exports = {
  ModelCache,
  modelCache,
};
