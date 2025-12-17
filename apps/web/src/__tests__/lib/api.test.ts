/**
 * Tests for API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, setAuthToken, clearAuthToken } from '@/lib/api';

global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearAuthToken();
  });

  describe('GET requests', () => {
    it('should make GET request', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.get('/users/1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include query parameters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      await api.get('/users', { params: { page: 1, limit: 10 } });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });
  });

  describe('POST requests', () => {
    it('should make POST request with body', async () => {
      const mockResponse = { success: true, data: { id: 1 } };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const payload = { name: 'New User', email: 'user@example.com' };
      const result = await api.post('/users', payload);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('PUT requests', () => {
    it('should make PUT request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const payload = { name: 'Updated Name' };
      await api.put('/users/1', payload);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await api.delete('/users/1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Authentication', () => {
    it('should include auth token in headers', async () => {
      setAuthToken('test-token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      await api.get('/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should not include auth token when not set', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      await api.get('/public');

      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].headers.Authorization).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle 404 errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Not found' } })
      });

      await expect(api.get('/users/999')).rejects.toThrow('Not found');
    });

    it('should handle 401 errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } })
      });

      await expect(api.get('/protected')).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(api.get('/users')).rejects.toThrow('Network error');
    });

    it('should handle 500 errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } })
      });

      await expect(api.get('/users')).rejects.toThrow('Server error');
    });
  });

  describe('Request interceptors', () => {
    it('should call request interceptor', async () => {
      const interceptor = vi.fn((config) => config);
      api.interceptors.request.use(interceptor);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      await api.get('/users');

      expect(interceptor).toHaveBeenCalled();
    });
  });

  describe('Response interceptors', () => {
    it('should call response interceptor', async () => {
      const interceptor = vi.fn((response) => response);
      api.interceptors.response.use(interceptor);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      await api.get('/users');

      expect(interceptor).toHaveBeenCalled();
    });
  });
});
