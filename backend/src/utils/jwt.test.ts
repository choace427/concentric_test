import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateToken, verifyToken } from './jwt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '1h',
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

describe('JWT Utils', () => {
  const mockPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'student' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a token successfully', () => {
      const mockToken = 'mock-jwt-token';
      (jwt.sign as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockToken);

      const token = generateToken(mockPayload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      vi.mocked(env).JWT_SECRET = undefined as unknown as string;

      expect(() => generateToken(mockPayload)).toThrow('JWT_SECRET is not configured');

      vi.mocked(env).JWT_SECRET = 'test-secret';
    });
  });

  describe('verifyToken', () => {
    it('should verify a token successfully', () => {
      (jwt.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPayload);

      const result = verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      vi.mocked(env).JWT_SECRET = undefined as unknown as string;

      expect(() => verifyToken('token')).toThrow('JWT_SECRET is not configured');

      vi.mocked(env).JWT_SECRET = 'test-secret';
    });
  });
});

