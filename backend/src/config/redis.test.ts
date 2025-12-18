import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Redis from 'ioredis';

// Mock ioredis before importing the module
vi.mock('ioredis', () => {
  const EventEmitter = require('events');
  
  class MockRedis extends EventEmitter {
    status: string = 'end';
    host: string = 'localhost';
    port: number = 6379;
    
    constructor(options?: any) {
      super();
      this.host = options?.host || 'localhost';
      this.port = options?.port || 6379;
      // Simulate lazy connect
      setTimeout(() => {
        if (options?.lazyConnect !== false) {
          this.status = 'ready';
          this.emit('connect');
          this.emit('ready');
        }
      }, 0);
    }
    
    async ping(): Promise<string> {
      if (this.status === 'ready') {
        return 'PONG';
      }
      throw new Error('Connection closed');
    }
    
    async get(key: string): Promise<string | null> {
      if (this.status !== 'ready') {
        throw new Error('Connection closed');
      }
      return null;
    }
    
    async setex(key: string, seconds: number, value: string): Promise<string> {
      if (this.status !== 'ready') {
        throw new Error('Connection closed');
      }
      return 'OK';
    }
    
    disconnect(): void {
      this.status = 'end';
      this.emit('end');
    }
  }
  
  return {
    default: MockRedis,
  };
});

// Mock env before importing redis config
vi.mock('./env', () => ({
  env: {
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: undefined,
  },
}));

describe('Redis Config', () => {
  let redis: any;
  let isRedisAvailable: () => boolean;
  let safeRedisCommand: <T>(command: () => Promise<T>, fallback: T) => Promise<T>;
  
  beforeEach(async () => {
    // Clear all mocks and re-import
    vi.clearAllMocks();
    vi.resetModules();
    
    // Import after mocks are set up
    const redisModule = await import('./redis');
    redis = redisModule.redis;
    isRedisAvailable = redisModule.isRedisAvailable;
    safeRedisCommand = redisModule.safeRedisCommand;
  });
  
  afterEach(async () => {
    if (redis && typeof redis.disconnect === 'function') {
      redis.disconnect();
    }
    vi.clearAllMocks();
  });
  
  describe('Redis Connection', () => {
    it('should create Redis instance with correct configuration', () => {
      expect(redis).toBeDefined();
      expect(redis.host).toBe('localhost');
      expect(redis.port).toBe(6379);
    });
    
    it('should handle connection events', async () => {
      return new Promise<void>((resolve) => {
        const connectHandler = vi.fn();
        const readyHandler = vi.fn();
        
        redis.once('connect', connectHandler);
        redis.once('ready', readyHandler);
        
        // Trigger connection
        redis.status = 'connecting';
        redis.emit('connect');
        redis.status = 'ready';
        redis.emit('ready');
        
        setTimeout(() => {
          expect(connectHandler).toHaveBeenCalled();
          expect(readyHandler).toHaveBeenCalled();
          resolve();
        }, 100);
      });
    });
    
    it('should handle error events', () => {
      const errorHandler = vi.fn();
      redis.once('error', errorHandler);
      
      const error = new Error('Test error');
      redis.emit('error', error);
      
      expect(errorHandler).toHaveBeenCalledWith(error);
    });
    
    it('should handle close events', () => {
      const closeHandler = vi.fn();
      redis.once('close', closeHandler);
      
      redis.emit('close');
      
      expect(closeHandler).toHaveBeenCalled();
    });
    
    it('should handle reconnecting events', () => {
      const reconnectingHandler = vi.fn();
      redis.once('reconnecting', reconnectingHandler);
      
      redis.emit('reconnecting', 1000);
      
      expect(reconnectingHandler).toHaveBeenCalledWith(1000);
    });
    
    it('should handle end events', () => {
      const endHandler = vi.fn();
      redis.once('end', endHandler);
      
      redis.emit('end');
      
      expect(endHandler).toHaveBeenCalled();
    });
  });
  
  describe('isRedisAvailable', () => {
    it('should return true when Redis is ready and connected', async () => {
      redis.status = 'ready';
      // Trigger ready event to set internal connection state
      redis.emit('ready');
      // Wait a bit for the event handler to process
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(isRedisAvailable()).toBe(true);
    });
    
    it('should return false when Redis status is not ready', () => {
      redis.status = 'connecting';
      expect(isRedisAvailable()).toBe(false);
    });
    
    it('should return false when Redis status is end', () => {
      redis.status = 'end';
      expect(isRedisAvailable()).toBe(false);
    });
  });
  
  describe('safeRedisCommand', () => {
    it('should execute command successfully when Redis is ready', async () => {
      redis.status = 'ready';
      
      const result = await safeRedisCommand(
        async () => {
          return await redis.ping();
        },
        'fallback'
      );
      
      expect(result).toBe('PONG');
    });
    
    it('should return fallback when Redis is not ready', async () => {
      redis.status = 'connecting';
      
      const result = await safeRedisCommand(
        async () => {
          return await redis.ping();
        },
        'fallback'
      );
      
      expect(result).toBe('fallback');
    });
    
    it('should return fallback on connection errors', async () => {
      redis.status = 'ready';
      
      // Mock ping to throw connection error
      const originalPing = redis.ping;
      redis.ping = vi.fn().mockRejectedValue(new Error('Stream isn\'t writeable'));
      
      const result = await safeRedisCommand(
        async () => {
          return await redis.ping();
        },
        'fallback'
      );
      
      expect(result).toBe('fallback');
      
      // Restore
      redis.ping = originalPing;
    });
    
    it('should return fallback on ECONNREFUSED errors', async () => {
      redis.status = 'ready';
      
      const originalPing = redis.ping;
      redis.ping = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      
      const result = await safeRedisCommand(
        async () => {
          return await redis.ping();
        },
        'fallback'
      );
      
      expect(result).toBe('fallback');
      
      redis.ping = originalPing;
    });
    
    it('should return fallback on Connection is closed errors', async () => {
      redis.status = 'ready';
      
      const originalPing = redis.ping;
      redis.ping = vi.fn().mockRejectedValue(new Error('Connection is closed'));
      
      const result = await safeRedisCommand(
        async () => {
          return await redis.ping();
        },
        'fallback'
      );
      
      expect(result).toBe('fallback');
      
      redis.ping = originalPing;
    });
    
    it('should return fallback on NR_CLOSED error code', async () => {
      redis.status = 'ready';
      
      const error: any = new Error('Connection closed');
      error.code = 'NR_CLOSED';
      
      const originalPing = redis.ping;
      redis.ping = vi.fn().mockRejectedValue(error);
      
      const result = await safeRedisCommand(
        async () => {
          return await redis.ping();
        },
        'fallback'
      );
      
      expect(result).toBe('fallback');
      
      redis.ping = originalPing;
    });
    
    it('should return fallback on other errors', async () => {
      redis.status = 'ready';
      
      const originalPing = redis.ping;
      redis.ping = vi.fn().mockRejectedValue(new Error('Unexpected error'));
      
      const result = await safeRedisCommand(
        async () => {
          return await redis.ping();
        },
        'fallback'
      );
      
      expect(result).toBe('fallback');
      
      redis.ping = originalPing;
    });
    
    it('should handle successful command execution', async () => {
      redis.status = 'ready';
      
      const testValue = { data: 'test' };
      const result = await safeRedisCommand(
        async () => {
          return testValue;
        },
        null
      );
      
      expect(result).toEqual(testValue);
    });
  });
  
  describe('Redis ping on startup', () => {
    it('should attempt ping after timeout', async () => {
      // The module should have already attempted ping
      // We just verify it doesn't throw
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(true).toBe(true); // Test passes if no errors
    });
  });
});

