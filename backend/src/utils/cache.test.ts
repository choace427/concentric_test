import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  invalidateStatsCache,
  invalidateClassCache,
  invalidateUserCache,
  isTokenBlacklisted,
  blacklistToken,
  getOrSetCache,
  CACHE_KEYS,
  CACHE_TTL,
} from './cache';

// Mock Redis - use a factory that creates the mock object
vi.mock('../config/redis', () => {
  const mockRedisInstance = {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    exists: vi.fn(),
    status: 'ready',
  };
  
  return {
    redis: mockRedisInstance,
    safeRedisCommand: <T>(command: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        if (mockRedisInstance.status !== 'ready') {
          return Promise.resolve(fallback);
        }
        return command();
      } catch (error: any) {
        if (
          error?.message?.includes('Stream isn\'t writeable') ||
          error?.message?.includes('Connection is closed') ||
          error?.message?.includes('ECONNREFUSED') ||
          error?.code === 'NR_CLOSED'
        ) {
          return Promise.resolve(fallback);
        }
        return Promise.resolve(fallback);
      }
    },
  };
});

describe('Cache Utilities', () => {
  let mockRedis: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked redis instance
    const redisModule = await import('../config/redis');
    mockRedis = redisModule.redis;
    mockRedis.status = 'ready';
  });
  
  describe('getCache', () => {
    it('should return cached value when key exists', async () => {
      const cachedData = { id: '1', name: 'Test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      
      const result = await getCache<typeof cachedData>('test:key');
      
      expect(result).toEqual(cachedData);
      expect(mockRedis.get).toHaveBeenCalledWith('test:key');
    });
    
    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await getCache('test:key');
      
      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('test:key');
    });
    
    it('should return null when Redis is unavailable', async () => {
      mockRedis.status = 'end';
      
      const result = await getCache('test:key');
      
      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });
    
    it('should handle JSON parsing errors gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid json');
      
      // This should throw, but safeRedisCommand will catch it
      await expect(getCache('test:key')).rejects.toThrow();
    });
  });
  
  describe('setCache', () => {
    it('should set cache with default TTL', async () => {
      const data = { id: '1', name: 'Test' };
      mockRedis.setex.mockResolvedValue('OK');
      
      await setCache('test:key', data);
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:key',
        CACHE_TTL.STATS,
        JSON.stringify(data)
      );
    });
    
    it('should set cache with custom TTL', async () => {
      const data = { id: '1', name: 'Test' };
      const customTtl = 300;
      mockRedis.setex.mockResolvedValue('OK');
      
      await setCache('test:key', data, customTtl);
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:key',
        customTtl,
        JSON.stringify(data)
      );
    });
    
    it('should handle Redis unavailability gracefully', async () => {
      mockRedis.status = 'end';
      const data = { id: '1', name: 'Test' };
      
      await expect(setCache('test:key', data)).resolves.not.toThrow();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });
  
  describe('deleteCache', () => {
    it('should delete cache key', async () => {
      mockRedis.del.mockResolvedValue(1);
      
      await deleteCache('test:key');
      
      expect(mockRedis.del).toHaveBeenCalledWith('test:key');
    });
    
    it('should handle Redis unavailability gracefully', async () => {
      mockRedis.status = 'end';
      
      await expect(deleteCache('test:key')).resolves.not.toThrow();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
  
  describe('deleteCachePattern', () => {
    it('should delete all keys matching pattern', async () => {
      const keys = ['test:key1', 'test:key2', 'test:key3'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(3);
      
      await deleteCachePattern('test:*');
      
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });
    
    it('should not delete when no keys match pattern', async () => {
      mockRedis.keys.mockResolvedValue([]);
      
      await deleteCachePattern('test:*');
      
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
    
    it('should handle Redis unavailability gracefully', async () => {
      mockRedis.status = 'end';
      
      await expect(deleteCachePattern('test:*')).resolves.not.toThrow();
      expect(mockRedis.keys).not.toHaveBeenCalled();
    });
  });
  
  describe('invalidateStatsCache', () => {
    it('should invalidate all stats cache keys', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.keys.mockResolvedValue([]);
      
      await invalidateStatsCache();
      
      expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEYS.STATS_AVG_GRADES);
      expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEYS.STATS_TEACHER_NAMES);
      expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEYS.STATS_STUDENT_NAMES);
      expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEYS.STATS_CLASSES);
      expect(mockRedis.keys).toHaveBeenCalledWith(`${CACHE_KEYS.STATS_AVG_GRADES_CLASS}*`);
      expect(mockRedis.keys).toHaveBeenCalledWith(`${CACHE_KEYS.STATS_CLASS}*`);
      expect(mockRedis.keys).toHaveBeenCalledWith(`${CACHE_KEYS.STATS_CLASS_STUDENTS}*`);
    });
  });
  
  describe('invalidateClassCache', () => {
    it('should invalidate class cache without classId', async () => {
      mockRedis.del.mockResolvedValue(1);
      
      await invalidateClassCache();
      
      expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEYS.STATS_CLASSES);
      expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEYS.STATS_AVG_GRADES);
    });
    
    it('should invalidate class cache with classId', async () => {
      const classId = 'class-123';
      mockRedis.del.mockResolvedValue(1);
      
      await invalidateClassCache(classId);
      
      expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEYS.STATS_CLASSES);
      expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEYS.STATS_AVG_GRADES);
      expect(mockRedis.del).toHaveBeenCalledWith(`${CACHE_KEYS.STATS_CLASS}${classId}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`${CACHE_KEYS.STATS_CLASS_STUDENTS}${classId}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`${CACHE_KEYS.STATS_AVG_GRADES_CLASS}${classId}`);
    });
  });
  
  describe('invalidateUserCache', () => {
    it('should invalidate user cache', async () => {
      const userId = 'user-123';
      mockRedis.del.mockResolvedValue(1);
      
      await invalidateUserCache(userId);
      
      expect(mockRedis.del).toHaveBeenCalledWith(`${CACHE_KEYS.USER}${userId}`);
    });
  });
  
  describe('isTokenBlacklisted', () => {
    it('should return true when token is blacklisted', async () => {
      const token = 'test-token';
      mockRedis.exists.mockResolvedValue(1);
      
      const result = await isTokenBlacklisted(token);
      
      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith(`${CACHE_KEYS.TOKEN_BLACKLIST}${token}`);
    });
    
    it('should return false when token is not blacklisted', async () => {
      const token = 'test-token';
      mockRedis.exists.mockResolvedValue(0);
      
      const result = await isTokenBlacklisted(token);
      
      expect(result).toBe(false);
      expect(mockRedis.exists).toHaveBeenCalledWith(`${CACHE_KEYS.TOKEN_BLACKLIST}${token}`);
    });
    
    it('should return false (fail open) when Redis is unavailable', async () => {
      mockRedis.status = 'end';
      const token = 'test-token';
      
      const result = await isTokenBlacklisted(token);
      
      expect(result).toBe(false);
      expect(mockRedis.exists).not.toHaveBeenCalled();
    });
  });
  
  describe('blacklistToken', () => {
    it('should blacklist a token with correct TTL', async () => {
      const token = 'test-token';
      mockRedis.setex.mockResolvedValue('OK');
      
      await blacklistToken(token);
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `${CACHE_KEYS.TOKEN_BLACKLIST}${token}`,
        CACHE_TTL.TOKEN_BLACKLIST,
        '1'
      );
    });
    
    it('should handle Redis unavailability gracefully', async () => {
      mockRedis.status = 'end';
      const token = 'test-token';
      
      await expect(blacklistToken(token)).resolves.not.toThrow();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });
  
  describe('getOrSetCache', () => {
    it('should return cached value when available', async () => {
      const cachedData = { id: '1', name: 'Test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      
      const fetchFn = vi.fn();
      
      const result = await getOrSetCache('test:key', fetchFn);
      
      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('test:key');
    });
    
    it('should fetch and cache value when not cached', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      
      const fetchedData = { id: '2', name: 'Fetched' };
      const fetchFn = vi.fn().mockResolvedValue(fetchedData);
      
      const result = await getOrSetCache('test:key', fetchFn);
      
      expect(result).toEqual(fetchedData);
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:key',
        CACHE_TTL.STATS,
        JSON.stringify(fetchedData)
      );
    });
    
    it('should use custom TTL when provided', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      
      const fetchedData = { id: '2', name: 'Fetched' };
      const fetchFn = vi.fn().mockResolvedValue(fetchedData);
      const customTtl = 600;
      
      const result = await getOrSetCache('test:key', fetchFn, customTtl);
      
      expect(result).toEqual(fetchedData);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:key',
        customTtl,
        JSON.stringify(fetchedData)
      );
    });
    
    it('should handle fetch function errors', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const fetchFn = vi.fn().mockRejectedValue(new Error('Fetch failed'));
      
      await expect(getOrSetCache('test:key', fetchFn)).rejects.toThrow('Fetch failed');
      expect(fetchFn).toHaveBeenCalledOnce();
    });
  });
  
  describe('CACHE_KEYS constants', () => {
    it('should have all required cache key prefixes', () => {
      expect(CACHE_KEYS.USER).toBe('user:');
      expect(CACHE_KEYS.STATS_AVG_GRADES).toBe('stats:avg_grades');
      expect(CACHE_KEYS.STATS_AVG_GRADES_CLASS).toBe('stats:avg_grades:class:');
      expect(CACHE_KEYS.STATS_TEACHER_NAMES).toBe('stats:teacher_names');
      expect(CACHE_KEYS.STATS_STUDENT_NAMES).toBe('stats:student_names');
      expect(CACHE_KEYS.STATS_CLASSES).toBe('stats:classes');
      expect(CACHE_KEYS.STATS_CLASS).toBe('stats:class:');
      expect(CACHE_KEYS.STATS_CLASS_STUDENTS).toBe('stats:class_students:');
      expect(CACHE_KEYS.TOKEN_BLACKLIST).toBe('token:blacklist:');
      expect(CACHE_KEYS.RATE_LIMIT).toBe('rate_limit:');
    });
  });
  
  describe('CACHE_TTL constants', () => {
    it('should have all required TTL values', () => {
      expect(CACHE_TTL.USER).toBe(300);
      expect(CACHE_TTL.STATS).toBe(60);
      expect(CACHE_TTL.CLASSES).toBe(300);
      expect(CACHE_TTL.TOKEN_BLACKLIST).toBe(7 * 24 * 60 * 60);
    });
  });
});

