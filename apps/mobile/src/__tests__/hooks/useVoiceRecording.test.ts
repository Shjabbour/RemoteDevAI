/**
 * Tests for useVoiceRecording hook
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { Audio } from 'expo-av';

describe('useVoiceRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useVoiceRecording());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.duration).toBe(0);
    expect(result.current.uri).toBeNull();
  });

  it('should request permissions', async () => {
    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(Audio.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('should start recording', async () => {
    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(Audio.setAudioModeAsync).toHaveBeenCalled();
  });

  it('should stop recording', async () => {
    const { result } = renderHook(() => useVoiceRecording());

    // Start recording first
    await act(async () => {
      await result.current.startRecording();
    });

    // Then stop
    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.uri).toBeDefined();
  });

  it('should pause recording', async () => {
    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      await result.current.pauseRecording();
    });

    expect(result.current.isPaused).toBe(true);
    expect(result.current.isRecording).toBe(true);
  });

  it('should resume recording', async () => {
    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
      await result.current.pauseRecording();
    });

    await act(async () => {
      await result.current.resumeRecording();
    });

    expect(result.current.isPaused).toBe(false);
    expect(result.current.isRecording).toBe(true);
  });

  it('should track recording duration', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.duration).toBeGreaterThan(0);

    jest.useRealTimers();
  });

  it('should reset recording', async () => {
    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
      await result.current.stopRecording();
    });

    await act(async () => {
      await result.current.resetRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.duration).toBe(0);
    expect(result.current.uri).toBeNull();
  });

  it('should handle permission denial', async () => {
    (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied'
    });

    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      const granted = await result.current.requestPermission();
      expect(granted).toBe(false);
    });
  });

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    unmount();

    // Verify cleanup happened (recording stopped, resources released)
    expect(result.current.isRecording).toBe(false);
  });
});
