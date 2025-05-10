const redis = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

let redisClient;
let isRedisAvailable = false;

const memoryCache = new Map();

// Initializing Redis client
const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: config.REDIS_URL
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis Error: ${err}`);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis successfully');
      isRedisAvailable = true;
    });

    await redisClient.connect();
    isRedisAvailable = true;
    return redisClient;
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    isRedisAvailable = false;
    logger.warn('Continuing with in-memory cache instead of Redis');
    return null;
  }
};

// Get cache
const getCache = async (key) => {
  try {
    if (isRedisAvailable) {
      if (!redisClient?.isOpen) {
        await initRedis();
      }
      
      const cachedData = await redisClient.get(key);
      return cachedData ? JSON.parse(cachedData) : null;
    } else {
      // Use in-memory cache
      return memoryCache.get(key) || null;
    }
  } catch (error) {
    logger.error(`Cache get error: ${error.message}`);
    // Fallback to in-memory
    return memoryCache.get(key) || null;
  }
};

// Set cache
const setCache = async (key, data, expiry = 3600) => {
  try {
    if (isRedisAvailable) {
      if (!redisClient?.isOpen) {
        await initRedis();
      }
      
      await redisClient.set(key, JSON.stringify(data), {
        EX: expiry
      });
    } else {
      // Use in-memory cache
      memoryCache.set(key, data);
      
      // Optional: Implement expiry for in-memory cache
      if (expiry) {
        setTimeout(() => {
          memoryCache.delete(key);
        }, expiry * 1000);
      }
    }
    return true;
  } catch (error) {
    logger.error(`Cache set error: ${error.message}`);
    // Fallback to in-memory
    memoryCache.set(key, data);
    return true;
  }
};

// Delete cache
const deleteCache = async (key) => {
  try {
    if (isRedisAvailable) {
      if (!redisClient?.isOpen) {
        await initRedis();
      }
      
      await redisClient.del(key);
    } else {
      // Use in-memory cache
      memoryCache.delete(key);
    }
    return true;
  } catch (error) {
    logger.error(`Cache delete error: ${error.message}`);
    // Fallback to in-memory
    memoryCache.delete(key);
    return true;
  }
};

// Clear cache by pattern
const clearCacheByPattern = async (pattern) => {
  try {
    if (isRedisAvailable) {
      if (!redisClient?.isOpen) {
        await initRedis();
      }
      
      const keys = await redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      // For in-memory, we'll need to iterate keys
      // This is a simple implementation; pattern matching won't be as sophisticated as Redis
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key);
        }
      }
    }
    return true;
  } catch (error) {
    logger.error(`Cache clear error: ${error.message}`);
    return false;
  }
};

module.exports = {
  initRedis,
  getCache,
  setCache,
  deleteCache,
  clearCacheByPattern
};