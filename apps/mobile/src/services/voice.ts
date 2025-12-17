import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { VoiceRecording } from '@types/index';
import { useSettingsStore } from '@stores/settingsStore';

class VoiceService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isRecordingActive = false;

  async initialize() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Error initializing voice service:', error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    try {
      if (this.isRecordingActive) {
        throw new Error('Recording already in progress');
      }

      await this.initialize();

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      this.recording = recording;
      this.isRecordingActive = true;

      // Haptic feedback
      if (useSettingsStore.getState().hapticFeedbackEnabled) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<VoiceRecording | null> {
    try {
      if (!this.recording || !this.isRecordingActive) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      const status = await this.recording.getStatusAsync();

      this.isRecordingActive = false;
      const recording = this.recording;
      this.recording = null;

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Haptic feedback
      if (useSettingsStore.getState().hapticFeedbackEnabled) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      return {
        uri,
        duration: status.durationMillis / 1000, // Convert to seconds
        size: 0, // File size would be calculated on server
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  async pauseRecording(): Promise<void> {
    try {
      if (!this.recording || !this.isRecordingActive) {
        return;
      }

      await this.recording.pauseAsync();
    } catch (error) {
      console.error('Error pausing recording:', error);
      throw error;
    }
  }

  async resumeRecording(): Promise<void> {
    try {
      if (!this.recording || !this.isRecordingActive) {
        return;
      }

      await this.recording.startAsync();
    } catch (error) {
      console.error('Error resuming recording:', error);
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
        this.isRecordingActive = false;
      }
    } catch (error) {
      console.error('Error canceling recording:', error);
      throw error;
    }
  }

  async getRecordingStatus() {
    if (!this.recording) {
      return null;
    }

    return await this.recording.getStatusAsync();
  }

  isRecording(): boolean {
    return this.isRecordingActive;
  }

  // Playback
  async playAudio(uri: string): Promise<void> {
    try {
      // Unload previous sound if any
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
      throw error;
    }
  }

  async pausePlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
      }
    } catch (error) {
      console.error('Error pausing playback:', error);
      throw error;
    }
  }

  async resumePlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.playAsync();
      }
    } catch (error) {
      console.error('Error resuming playback:', error);
      throw error;
    }
  }

  private onPlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      this.stopPlayback();
    }
  };

  // Text-to-Speech
  async speak(text: string): Promise<void> {
    try {
      const options = {
        language: useSettingsStore.getState().language,
        pitch: 1.0,
        rate: 1.0,
      };

      await Speech.speak(text, options);
    } catch (error) {
      console.error('Error speaking text:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Error stopping speech:', error);
      throw error;
    }
  }

  isSpeaking(): boolean {
    return Speech.isSpeakingAsync() as unknown as boolean;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    try {
      await this.cancelRecording();
      await this.stopPlayback();
      await this.stopSpeaking();
    } catch (error) {
      console.error('Error cleaning up voice service:', error);
    }
  }
}

export const voiceService = new VoiceService();
