import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AVPlaybackStatusSuccess } from 'expo-av';
import { RootStackParamList } from '../../App';
import { AudioPlayer, formatTime, setupAudioMode } from '../services/audio';
import { getAudioDownloadUrl } from '../services/firebase';

type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;
type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;

interface PlayerScreenProps {
  navigation: PlayerScreenNavigationProp;
  route: PlayerScreenRouteProp;
}

export default function PlayerScreen({ navigation, route }: PlayerScreenProps) {
  const { lesson } = route.params;
  const playerRef = useRef(new AudioPlayer());
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);

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

    // Only update slider if user isn't dragging
    if (!isSliding) {
      const progress = status.durationMillis > 0 
        ? (status.positionMillis / status.durationMillis) * 100 
        : 0;
      setSliderPosition(progress);
    }

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

  const handleSkipForward = async () => {
    try {
      await playerRef.current.skipForward(15000); // 15 seconds
    } catch (err) {
      console.error('❌ Skip forward error:', err);
    }
  };

  const handleSkipBackward = async () => {
    try {
      await playerRef.current.skipBackward(15000); // 15 seconds
    } catch (err) {
      console.error('❌ Skip backward error:', err);
    }
  };

  const handleSlidingStart = () => {
    console.log('👆 User started dragging slider');
    setIsSliding(true);
  };

  const handleValueChange = (value: number) => {
    // Update visual position immediately
    setSliderPosition(value);
    
    // Update time display for preview
    const previewTime = (value / 100) * duration;
    setCurrentTime(previewTime);
  };

  const handleSlidingComplete = async (value: number) => {
    console.log('✅ User released slider at:', value);
    
    if (!duration || duration === 0) {
      console.warn('⚠️ Audio not ready yet');
      setIsSliding(false);
      return;
    }

    // Convert percentage to milliseconds
    const positionMillis = (value / 100) * duration;
    
    try {
      // Seek to the new position
      await playerRef.current.seekTo(positionMillis);
    } catch (err) {
      console.error('❌ Seek error:', err);
    } finally {
      // Re-enable normal updates
      setIsSliding(false);
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

  const handleBackPress = () => {
    // Cleanup audio before leaving
    playerRef.current.cleanup();
    navigation.goBack();
  };

  // Main player view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{lesson.title}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      {/* Player Controls */}
      <View style={styles.playerContainer}>
        {/* Seek Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={sliderPosition}
            onSlidingStart={handleSlidingStart}
            onValueChange={handleValueChange}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#007AFF"
          />
        </View>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Control Buttons Row */}
        <View style={styles.controlsRow}>
          {/* Skip Backward Button */}
          <TouchableOpacity
            style={[styles.skipButton, isSliding && styles.buttonDisabled]}
            onPress={handleSkipBackward}
            disabled={isSliding}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipIcon, isSliding && styles.iconDisabled]}>↺</Text>
            <Text style={[styles.skipLabel, isSliding && styles.labelDisabled]}>-15s</Text>
          </TouchableOpacity>

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

          {/* Skip Forward Button */}
          <TouchableOpacity
            style={[styles.skipButton, isSliding && styles.buttonDisabled]}
            onPress={handleSkipForward}
            disabled={isSliding}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipIcon, isSliding && styles.iconDisabled]}>↻</Text>
            <Text style={[styles.skipLabel, isSliding && styles.labelDisabled]}>+15s</Text>
          </TouchableOpacity>
        </View>

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
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    marginBottom: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginLeft: -4,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  playerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 30,
  },
  skipButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  skipIcon: {
    fontSize: 28,
    color: '#007AFF',
  },
  skipLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  iconDisabled: {
    color: '#999',
  },
  labelDisabled: {
    color: '#999',
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
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

