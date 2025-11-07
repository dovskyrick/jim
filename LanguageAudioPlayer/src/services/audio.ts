// Audio playback service using expo-av
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';

// Configure audio mode for background playback
export async function setupAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    console.log('✅ Audio mode configured for background playback');
  } catch (error) {
    console.error('❌ Failed to set audio mode:', error);
  }
}

/**
 * Audio Player class to manage playback
 */
export class AudioPlayer {
  private sound: Audio.Sound | null = null;
  private onStatusUpdate?: (status: AVPlaybackStatusSuccess) => void;

  /**
   * Set callback for playback status updates
   */
  setOnStatusUpdate(callback: (status: AVPlaybackStatusSuccess) => void) {
    this.onStatusUpdate = callback;
  }

  /**
   * Load and play audio from a URL
   */
  async loadAndPlay(url: string): Promise<void> {
    try {
      // Unload previous sound if exists
      await this.cleanup();

      console.log('🎵 Loading audio from:', url);

      // Create new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }, // Auto-play
        this.handleStatusUpdate.bind(this)
      );

      this.sound = sound;
      console.log('✅ Audio loaded and playing');
    } catch (error) {
      console.error('❌ Failed to load audio:', error);
      throw new Error('Could not load audio file');
    }
  }

  /**
   * Play or resume playback
   */
  async play(): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      await this.sound.playAsync();
      console.log('▶️ Playing');
    } catch (error) {
      console.error('❌ Failed to play:', error);
      throw error;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      await this.sound.pauseAsync();
      console.log('⏸️ Paused');
    } catch (error) {
      console.error('❌ Failed to pause:', error);
      throw error;
    }
  }

  /**
   * Get current playback status
   */
  async getStatus(): Promise<AVPlaybackStatus> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    return await this.sound.getStatusAsync();
  }

  /**
   * Seek to a position (in milliseconds)
   */
  async seekTo(positionMillis: number): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      await this.sound.setPositionAsync(positionMillis);
      console.log(`⏩ Seeked to ${positionMillis}ms`);
    } catch (error) {
      console.error('❌ Failed to seek:', error);
      throw error;
    }
  }

  /**
   * Skip forward by a number of milliseconds (preserves play/pause state)
   */
  async skipForward(milliseconds: number): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      // Get current status
      const status = await this.sound.getStatusAsync();
      
      if (!status.isLoaded) {
        throw new Error('Audio not loaded');
      }

      // Calculate new position (don't skip past the end)
      const currentPosition = status.positionMillis;
      const duration = status.durationMillis || 0;
      const newPosition = Math.min(currentPosition + milliseconds, duration);

      // Seek to new position (automatically preserves play/pause state!)
      await this.sound.setPositionAsync(newPosition);
      
      console.log(`⏩ Skipped forward ${milliseconds}ms to ${newPosition}ms`);
    } catch (error) {
      console.error('❌ Failed to skip forward:', error);
      throw error;
    }
  }

  /**
   * Skip backward by a number of milliseconds (preserves play/pause state)
   */
  async skipBackward(milliseconds: number): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      // Get current status
      const status = await this.sound.getStatusAsync();
      
      if (!status.isLoaded) {
        throw new Error('Audio not loaded');
      }

      // Calculate new position (don't go below 0)
      const currentPosition = status.positionMillis;
      const newPosition = Math.max(currentPosition - milliseconds, 0);

      // Seek to new position (automatically preserves play/pause state!)
      await this.sound.setPositionAsync(newPosition);
      
      console.log(`⏪ Skipped backward ${milliseconds}ms to ${newPosition}ms`);
    } catch (error) {
      console.error('❌ Failed to skip backward:', error);
      throw error;
    }
  }

  /**
   * Clean up and unload sound
   */
  async cleanup(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
        this.sound = null;
        console.log('🧹 Audio cleaned up');
      } catch (error) {
        console.error('❌ Failed to cleanup audio:', error);
      }
    }
  }

  /**
   * Internal status update handler
   */
  private handleStatusUpdate(status: AVPlaybackStatus) {
    if (status.isLoaded && this.onStatusUpdate) {
      this.onStatusUpdate(status);
    }
  }
}

/**
 * Format milliseconds to MM:SS
 */
export function formatTime(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

