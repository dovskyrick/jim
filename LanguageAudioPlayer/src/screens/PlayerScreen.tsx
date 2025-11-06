import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { AVPlaybackStatusSuccess } from 'expo-av';
import { AudioPlayer, formatTime, setupAudioMode } from '../services/audio';
import { getAudioDownloadUrl } from '../services/firebase';
import { Lesson } from '../types';

interface PlayerScreenProps {
  lesson: Lesson;
}

export default function PlayerScreen({ lesson }: PlayerScreenProps) {
  const playerRef = useRef(new AudioPlayer());
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Setup and load audio on mount
  useEffect(() => {
    initializePlayer();

    // Cleanup on unmount
    return () => {
      playerRef.current.cleanup();
    };
  }, [lesson.storagePath]);

  const initializePlayer = async () => {
    try {
      setLoading(true);
      setError(null);

      // Setup audio mode for background playback
      await setupAudioMode();

      // Get download URL from Firebase
      console.log('🔗 Getting download URL for:', lesson.storagePath);
      const url = await getAudioDownloadUrl(lesson.storagePath);

      // Setup status update callback
      playerRef.current.setOnStatusUpdate(handleStatusUpdate);

      // Load and play audio
      await playerRef.current.loadAndPlay(url);
      
      setIsPlaying(true);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio';
      console.error('❌ Player initialization error:', err);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleStatusUpdate = (status: AVPlaybackStatusSuccess) => {
    setIsPlaying(status.isPlaying);
    setCurrentTime(status.positionMillis);
    setDuration(status.durationMillis || 0);

    // Check if finished
    if (status.didJustFinish) {
      console.log('✅ Playback finished');
      setIsPlaying(false);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await playerRef.current.pause();
      } else {
        await playerRef.current.play();
      }
    } catch (err) {
      console.error('❌ Play/Pause error:', err);
    }
  };

  const handleRestart = async () => {
    try {
      await playerRef.current.seekTo(0);
      if (!isPlaying) {
        await playerRef.current.play();
      }
    } catch (err) {
      console.error('❌ Restart error:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading audio...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializePlayer}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Main player view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{lesson.title}</Text>
      </View>

      {/* Player Controls */}
      <View style={styles.playerContainer}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Play/Pause Button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>

        {/* Restart Button */}
        <TouchableOpacity
          style={styles.restartButton}
          onPress={handleRestart}
          activeOpacity={0.7}
        >
          <Text style={styles.restartButtonText}>↻ Restart</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Audio will continue playing even when the screen is off 🌙
          </Text>
        </View>
      </View>

      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Status: {isPlaying ? 'Playing ▶' : 'Paused ⏸'}
        </Text>
        <Text style={styles.debugText}>
          Progress: {progress.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  playerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  timeContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonText: {
    fontSize: 48,
    color: '#fff',
  },
  restartButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 30,
  },
  restartButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginVertical: 2,
  },
});

