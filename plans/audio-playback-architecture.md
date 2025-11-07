# Audio Playback Architecture & Skip Implementation

## How Audio Playback Time is Stored

### The Complete Flow:

```
expo-av Sound Object
      ↓
   (plays audio)
      ↓
Status Updates (every ~250ms)
      ↓
handleStatusUpdate callback
      ↓
React State (currentTime, duration, isPlaying)
      ↓
UI Updates (progress bar, time display)
```

---

## Detailed Breakdown

### 1. The Sound Object (Native Layer)

**Location:** `src/services/audio.ts` - `AudioPlayer` class

```typescript
private sound: Audio.Sound | null = null;
```

**What it is:**
- An expo-av `Sound` object
- Wrapper around native audio APIs (iOS: AVPlayer, Android: MediaPlayer)
- Lives in **native code** (Swift/Kotlin), not JavaScript
- Manages the actual audio file and playback

**What it stores:**
- Audio file URI/URL
- Current playback position (in milliseconds)
- Duration of audio (in milliseconds)
- Playing state (playing, paused, stopped)
- Volume, rate, looping settings
- Buffer status

**Key Point:** The Sound object is the **source of truth** for playback state!

---

### 2. Status Updates (Bridge Communication)

**How it works:**

```typescript
// When we create the sound, we register a callback:
const { sound } = await Audio.Sound.createAsync(
  { uri: url },
  { shouldPlay: true },
  this.handleStatusUpdate.bind(this) // <- Callback function
);
```

**What happens:**
1. **Native layer** (iOS/Android) plays audio
2. Every ~250 milliseconds, native code checks playback status
3. Status is **serialized** and sent across the React Native bridge
4. **JavaScript layer** receives status as an object
5. Our callback function is called with the status

**Status Object Structure:**

```typescript
interface AVPlaybackStatusSuccess {
  isLoaded: true;
  uri: string;
  
  // Time information
  positionMillis: number;      // Current playback position (e.g., 15,750 = 15.75 seconds)
  durationMillis: number;      // Total audio duration (e.g., 120,000 = 2 minutes)
  
  // Playback state
  isPlaying: boolean;          // true = playing, false = paused
  isBuffering: boolean;        // true = loading audio data
  didJustFinish: boolean;      // true if audio just reached the end
  
  // Settings
  rate: number;                // Playback speed (1.0 = normal)
  volume: number;              // Volume (0.0 to 1.0)
  isMuted: boolean;
  
  // Other metadata
  shouldPlay: boolean;
  // ... more fields
}
```

**Example status during playback:**

```javascript
{
  isLoaded: true,
  uri: "https://firebasestorage.googleapis.com/.../test.wav",
  positionMillis: 23450,       // Currently at 23.45 seconds
  durationMillis: 90000,       // Audio is 90 seconds long
  isPlaying: true,             // Currently playing
  didJustFinish: false,
  rate: 1.0,
  volume: 1.0,
  // ...
}
```

---

### 3. React State (JavaScript Layer)

**Location:** `src/screens/PlayerScreen.tsx`

```typescript
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
```

**What happens in the callback:**

```typescript
const handleStatusUpdate = (status: AVPlaybackStatusSuccess) => {
  // Extract values from native status
  setIsPlaying(status.isPlaying);           // Update playing state
  setCurrentTime(status.positionMillis);    // Update current time
  setDuration(status.durationMillis || 0);  // Update duration

  // Check if finished
  if (status.didJustFinish) {
    console.log('✅ Playback finished');
    setIsPlaying(false);
  }
};
```

**Key Point:** React state is a **copy** of the native state, updated periodically.

---

### 4. Where Time is Actually Stored

There are **TWO copies** of playback time:

#### A) Native Layer (Source of Truth)
- **Location:** Inside the native Sound object (iOS AVPlayer or Android MediaPlayer)
- **Format:** Milliseconds as integer (e.g., 15750)
- **Updates:** Continuously as audio plays (hardware timer)
- **Access:** Only through async methods

#### B) React State (UI Copy)
- **Location:** `currentTime` state variable in PlayerScreen component
- **Format:** Milliseconds as integer (e.g., 15750)
- **Updates:** Every ~250ms when status callback fires
- **Access:** Synchronous, immediate

**Diagram:**

```
Native Sound Object          React State
┌──────────────────┐        ┌──────────────────┐
│ positionMillis:  │        │ currentTime:     │
│   15750          │ -----> │   15750          │
│                  │ copy   │                  │
│ (updates ~60fps) │        │ (updates ~4fps)  │
└──────────────────┘        └──────────────────┘
   SOURCE OF TRUTH             FOR DISPLAY ONLY
```

---

## How Seeking Works

### Current Seek Implementation:

```typescript
async seekTo(positionMillis: number): Promise<void> {
  if (!this.sound) {
    throw new Error('No audio loaded');
  }

  await this.sound.setPositionAsync(positionMillis);
}
```

**What happens when you seek:**

1. **JavaScript calls:** `playerRef.current.seekTo(30000)` (seek to 30 seconds)
2. **Bridge crossing:** Request is serialized and sent to native layer
3. **Native processing:**
   - Native code receives the seek request
   - Tells the audio player to jump to that position
   - Updates internal position counter
   - Continues playing (if was playing) or stays paused (if was paused)
4. **Status update:** Native sends new status back to JavaScript
5. **UI updates:** React state updates, progress bar jumps

**Timing:**
- Total time: ~50-100ms (feels instant to user)
- Most time is bridge crossing (~30-50ms)
- Actual seek is very fast (~10-20ms)

---

## Implementation Plan: 15-Second Skip Buttons

### Feature Requirements:

✅ Skip forward 15 seconds
✅ Skip backward 15 seconds
✅ Preserve play/pause state (if playing, keep playing; if paused, stay paused)
✅ Handle edge cases (don't skip past start/end)

---

### Implementation Steps:

#### Step 1: Add Skip Functions to AudioPlayer

**File:** `src/services/audio.ts`

```typescript
/**
 * Skip forward by a number of milliseconds
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

    // Calculate new position
    const currentPosition = status.positionMillis;
    const duration = status.durationMillis || 0;
    const newPosition = Math.min(currentPosition + milliseconds, duration);

    // Seek to new position (preserves play/pause state automatically!)
    await this.sound.setPositionAsync(newPosition);
    
    console.log(`⏩ Skipped forward to ${newPosition}ms`);
  } catch (error) {
    console.error('❌ Failed to skip forward:', error);
    throw error;
  }
}

/**
 * Skip backward by a number of milliseconds
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

    // Seek to new position
    await this.sound.setPositionAsync(newPosition);
    
    console.log(`⏪ Skipped backward to ${newPosition}ms`);
  } catch (error) {
    console.error('❌ Failed to skip backward:', error);
    throw error;
  }
}
```

**Key Implementation Details:**

1. **Get current status first:** 
   - We need to know current position and duration
   - Use `getStatusAsync()` to fetch from native layer

2. **Calculate new position:**
   - Forward: `newPosition = currentPosition + 15000`
   - Backward: `newPosition = currentPosition - 15000`
   - Clamp to bounds: `Math.min(newPosition, duration)` and `Math.max(newPosition, 0)`

3. **Seek with `setPositionAsync()`:**
   - This method automatically preserves play/pause state!
   - If playing → seeks and continues playing
   - If paused → seeks and stays paused
   - This is built into expo-av!

4. **Error handling:**
   - Check if sound is loaded
   - Try/catch for network issues or invalid seeks

---

#### Step 2: Add Skip Handlers to PlayerScreen

**File:** `src/screens/PlayerScreen.tsx`

```typescript
const handleSkipForward = async () => {
  try {
    await playerRef.current.skipForward(15000); // 15 seconds = 15,000 milliseconds
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
```

**Why this is simple:**
- Just call the AudioPlayer methods
- Error handling in case something goes wrong
- No need to manually track play/pause state!

---

#### Step 3: Update UI Layout

**Current Layout:**
```
┌────────────────────────┐
│                        │
│        [▶/⏸]          │  <- Single large button
│                        │
└────────────────────────┘
```

**New Layout:**
```
┌────────────────────────┐
│                        │
│   [⏪]  [▶/⏸]  [⏩]   │  <- Three buttons in a row
│   -15     │     +15    │
│                        │
└────────────────────────┘
```

**Code structure:**

```tsx
{/* Controls Row */}
<View style={styles.controlsRow}>
  {/* Skip Backward Button */}
  <TouchableOpacity
    style={styles.skipButton}
    onPress={handleSkipBackward}
    activeOpacity={0.7}
  >
    <Text style={styles.skipIcon}>↺</Text>
    <Text style={styles.skipLabel}>-15s</Text>
  </TouchableOpacity>

  {/* Play/Pause Button (existing) */}
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
    style={styles.skipButton}
    onPress={handleSkipForward}
    activeOpacity={0.7}
  >
    <Text style={styles.skipIcon}>↻</Text>
    <Text style={styles.skipLabel}>+15s</Text>
  </TouchableOpacity>
</View>
```

**Styling:**

```typescript
controlsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 30,               // Space between buttons
  marginBottom: 30,
},
skipButton: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#E3F2FD',  // Light blue background
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#007AFF',
},
skipIcon: {
  fontSize: 24,
  color: '#007AFF',
},
skipLabel: {
  fontSize: 11,
  color: '#007AFF',
  fontWeight: '600',
  marginTop: 2,
},
playButton: {
  width: 100,           // Larger than skip buttons
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
```

---

## Why This Works Seamlessly

### 1. expo-av Handles State Preservation

When you call `setPositionAsync()`, expo-av:
- Checks if audio is currently playing
- Seeks to the new position
- **Automatically resumes playing** if it was playing
- **Stays paused** if it was paused

**No manual state management needed!**

### 2. Status Updates Happen Automatically

After seeking:
1. Native layer updates position
2. Status callback fires within ~250ms
3. React state updates automatically
4. Progress bar jumps to new position
5. Time display updates

**Everything stays in sync!**

### 3. Edge Cases Handled

```typescript
// Can't skip past the end
const newPosition = Math.min(currentPosition + 15000, duration);

// Can't skip before the beginning
const newPosition = Math.max(currentPosition - 15000, 0);
```

**User experience:**
- Skip forward at 1:45 in a 2:00 audio → goes to 2:00 (end)
- Skip backward at 0:10 → goes to 0:00 (start)
- No crashes, no weird behavior!

---

## Icon/Emoji Options

Since finding perfect icons is hard, here are options:

### Option 1: Unicode Arrows (What we'll use)
```
↺  - Counterclockwise arrow (backward)
↻  - Clockwise arrow (forward)
```

### Option 2: Emojis
```
⏪ - Fast backward
⏩ - Fast forward
```

### Option 3: Text Only
```
« 15s
15s »
```

### Option 4: Combined
```
↺      ↻
-15    +15
```

**We'll use Option 4** - Arrows on top, label below. Clean and clear!

---

## User Experience Flow

### Example: Skip Forward

**User action:** Taps [⏩ +15s] button

**What happens:**

1. **Instant visual feedback** (~0ms)
   - Button opacity changes (activeOpacity)
   - User sees they tapped it

2. **JavaScript processing** (~10ms)
   - `handleSkipForward()` called
   - Calls `playerRef.current.skipForward(15000)`

3. **Bridge crossing** (~30-50ms)
   - Request serialized and sent to native layer

4. **Native seek** (~10-20ms)
   - Native code updates position
   - If playing, continues playing
   - If paused, stays paused

5. **Status update** (~250ms or less)
   - Native sends new status back
   - `handleStatusUpdate` called
   - `setCurrentTime(newPosition)` updates state

6. **UI update** (~16ms)
   - React re-renders
   - Progress bar jumps forward
   - Time display updates

**Total time: ~100-350ms** (feels instant!)

---

## Potential Issues & Solutions

### Issue 1: Rapid Button Mashing

**Problem:** User taps skip button 5 times rapidly

**What happens:**
- 5 async operations queued
- Each takes ~100ms
- All complete, audio skips 75 seconds total (5 × 15)

**Is this a problem?** No!
- This is expected behavior
- If user taps 5 times, they want to skip 75 seconds
- Operations queue naturally

**Optional enhancement (not needed for MVP):**
- Add debouncing if this becomes an issue
- Visual feedback showing multiple skips

### Issue 2: Skipping Near End/Start

**Problem:** Audio is at 1:50, duration is 2:00, user skips forward

**Solution:** Already handled!
```typescript
const newPosition = Math.min(currentPosition + 15000, duration);
```
Result: Goes to 2:00 (end), doesn't crash

### Issue 3: Network Lag

**Problem:** Audio is streaming, network is slow, seek fails

**Solution:** Try/catch blocks
```typescript
try {
  await playerRef.current.skipForward(15000);
} catch (err) {
  console.error('Skip failed:', err);
  // User can try again
}
```

Audio continues playing, skip just doesn't happen. Not ideal but not catastrophic.

---

## Testing Checklist

After implementation, test:

**Basic Functionality:**
- [ ] Skip forward 15 seconds works
- [ ] Skip backward 15 seconds works
- [ ] Buttons are visually clear and responsive

**State Preservation:**
- [ ] Skip forward while playing → continues playing at new position
- [ ] Skip forward while paused → stays paused at new position
- [ ] Skip backward while playing → continues playing at new position
- [ ] Skip backward while paused → stays paused at new position

**Edge Cases:**
- [ ] Skip forward near end → goes to end, doesn't crash
- [ ] Skip backward at start → goes to 0:00, doesn't crash
- [ ] Rapid tapping → all skips register (skip 45s if tapped 3 times)
- [ ] Skip during loading → either queues or fails gracefully

**UI:**
- [ ] Buttons are large enough to tap easily (60×60 minimum)
- [ ] Visual feedback on tap (opacity change)
- [ ] Progress bar updates after skip
- [ ] Time display updates after skip

---

## Summary

### How Time is Stored:
1. **Native Sound object** - Source of truth, updates continuously
2. **React state** - Copy for UI, updates every ~250ms
3. **Bridge communication** - Keeps them in sync

### How Skip Works:
1. Calculate new position (current ± 15000ms)
2. Clamp to valid range (0 to duration)
3. Call `setPositionAsync(newPosition)`
4. expo-av preserves play/pause state automatically
5. Status update fires, UI updates

### Why It's Simple:
- expo-av handles state preservation
- No manual play/pause tracking needed
- Built-in edge case handling
- Automatic UI synchronization

**Ready to implement!** 🚀

