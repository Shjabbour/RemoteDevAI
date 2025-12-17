import { useState, useEffect, useCallback } from 'react';
import { voiceService } from '@services/voice';
import { VoiceRecording, VoiceInputState } from '@types/index';

export const useVoiceRecording = () => {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    waveformData: [],
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (state.isRecording && !state.isPaused) {
      interval = setInterval(async () => {
        const status = await voiceService.getRecordingStatus();
        if (status) {
          setState((prev) => ({
            ...prev,
            duration: status.durationMillis / 1000,
            waveformData: generateWaveform(status.durationMillis),
          }));
        }
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.isRecording, state.isPaused]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      await voiceService.startRecording();
      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        waveformData: [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
      console.error('Error starting recording:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<VoiceRecording | null> => {
    try {
      setError(null);
      const recording = await voiceService.stopRecording();
      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        waveformData: [],
      });
      return recording;
    } catch (err: any) {
      setError(err.message || 'Failed to stop recording');
      console.error('Error stopping recording:', err);
      return null;
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    try {
      setError(null);
      await voiceService.pauseRecording();
      setState((prev) => ({ ...prev, isPaused: true }));
    } catch (err: any) {
      setError(err.message || 'Failed to pause recording');
      console.error('Error pausing recording:', err);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      setError(null);
      await voiceService.resumeRecording();
      setState((prev) => ({ ...prev, isPaused: false }));
    } catch (err: any) {
      setError(err.message || 'Failed to resume recording');
      console.error('Error resuming recording:', err);
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    try {
      setError(null);
      await voiceService.cancelRecording();
      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        waveformData: [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to cancel recording');
      console.error('Error canceling recording:', err);
    }
  }, []);

  return {
    ...state,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
};

// Helper function to generate waveform visualization data
function generateWaveform(duration: number): number[] {
  const dataPoints = Math.min(Math.floor(duration / 100), 50);
  return Array.from({ length: dataPoints }, () => Math.random() * 0.8 + 0.2);
}
