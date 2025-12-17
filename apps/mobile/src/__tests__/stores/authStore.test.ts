/**
 * Tests for auth store (Zustand)
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthStore } from '@/stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should set user and token on login', () => {
    const { result } = renderHook(() => useAuthStore());

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User'
    };
    const mockToken = 'mock-token';

    act(() => {
      result.current.setAuth(mockUser, mockToken);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should clear user and token on logout', () => {
    const { result } = renderHook(() => useAuthStore());

    // First login
    act(() => {
      result.current.setAuth(
        { id: '123', email: 'test@example.com', name: 'Test' },
        'token'
      );
    });

    // Then logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should persist token to AsyncStorage', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.setAuth(
        { id: '123', email: 'test@example.com', name: 'Test' },
        'mock-token'
      );
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'auth_token',
      'mock-token'
    );
  });

  it('should remove token from AsyncStorage on logout', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.logout();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('should load token from AsyncStorage on init', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('stored-token');

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.loadStoredAuth();
    });

    expect(result.current.token).toBe('stored-token');
  });

  it('should update user profile', () => {
    const { result } = renderHook(() => useAuthStore());

    // First set user
    act(() => {
      result.current.setAuth(
        { id: '123', email: 'test@example.com', name: 'Old Name' },
        'token'
      );
    });

    // Then update
    act(() => {
      result.current.updateUser({ name: 'New Name' });
    });

    expect(result.current.user?.name).toBe('New Name');
    expect(result.current.user?.email).toBe('test@example.com');
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });
});
