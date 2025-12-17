/**
 * Tests for authentication middleware
 */

import { createMockRequest, createMockResponse, createMockNext, createMockUser } from '../testUtils';
import prismaMock from '../__mocks__/prisma';

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

describe('Auth Middleware', () => {
  let authenticate: any;
  let requireRole: any;

  beforeEach(() => {
    // Import middleware here
    // ({ authenticate, requireRole } = require('../../middleware/auth'));
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({ userId: 'user-123' });

      const mockUser = createMockUser({ id: 'user-123' });
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should reject missing token', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject expired token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        const error: any = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const req = createMockRequest({
        headers: { authorization: 'Bearer expired-token' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('expired')
          })
        })
      );
    });

    it('should reject inactive user', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({ userId: 'user-123' });

      const mockUser = createMockUser({ id: 'user-123', isActive: false });
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      const req = createMockRequest({
        user: createMockUser({ roles: ['admin', 'user'] })
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      const req = createMockRequest({
        user: createMockUser({ roles: ['user'] })
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
