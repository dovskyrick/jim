# Seek Slider Implementation Plan

## Overview

Adding a draggable slider to allow users to scrub through audio playback by dragging their finger along a progress bar.

**Goal:** Replace the static progress bar with an interactive slider that updates audio position in real-time.

---

## Current vs. Desired State

### Current Implementation:

```
┌────────────────────────────┐
│ ━━━━━━━━━━░░░░░░░░░░░░░░░ │  ← Static progress bar (display only)
│ 0:45              2:00     │
└────────────────────────────┘
```

**Properties:**
- Visual only (no interaction)
- Updates automatically during playback
- Simple `<View>` with width percentage

### Desired Implementation:

```
┌────────────────────────────┐
│ ━━━━━━━━━●░░░░░░░░░░░░░░░ │  ← Interactive slider (draggable thumb)
│ 0:45              2:00     │
└────────────────────────────┘
         ↑
    Draggable thumb
```

**Properties:**
- Fully interactive (touch and drag)
- Updates audio position when dragged
- Visual feedback during interaction
- Continues to update during playback (when not being touched)

---

## How Sliders Work in React Native

### The Challenge:

React Native doesn't have a built-in `<Slider>` component in core. We have options:

### Option 1: React Native Community Slider (RECOMMENDED)

**Package:** `@react-native-community/slider`

**Pros:**
- Native performance (uses iOS UISlider and Android SeekBar)
- Smooth, hardware-accelerated
- Familiar native look and feel
- Well-maintained
- Works with Expo

**Cons:**
- External dependency
- Platform-specific styling differences

**Installation:**
```bash
npx expo install @react-native-community/slider
```

### Option 2: Custom Implementation with PanResponder

Build our own slider using React Native's gesture system.

**Pros:**
- Complete control over appearance
- No dependencies
- Custom behavior

**Cons:**
- Complex to implement correctly
- Need to handle all touch states manually
- Performance considerations
- More code to maintain
- Easy to get wrong on edge cases

### Option 3: Third-party libraries

Libraries like `react-native-slider` or `rn-range-slider`

**Pros:**
- More features/customization

**Cons:**
- Less maintained
- Larger bundle size
- Potential compatibility issues

### Recommendation:

**Use `@react-native-community/slider`** - It's the industry standard, maintained, and works perfectly with Expo.

---

## Slider Interaction Flow

### Understanding the Touch Lifecycle:

```
User touches slider
      ↓
onSlidingStart() fires
      ↓
User drags finger
      ↓
onValueChange() fires continuously (many times per second)
      ↓
User releases finger
      ↓
onSlidingComplete() fires
```

### What Happens at Each Stage:

#### 1. onSlidingStart (User begins dragging)

```typescript
const handleSlidingStart = () => {
  console.log('👆 User started dragging');
  setIsSliding(true);  // Track that we're in sliding mode
  // Optionally pause auto-updates from playback
};
```

**Purpose:**
- Know when user takes control
- Disable skip buttons
- Optionally pause the audio
- Stop updating slider from playback status

#### 2. onValueChange (User is dragging)

```typescript
const handleValueChange = (value: number) => {
  console.log('🎯 Slider moved to:', value);
  setSliderPosition(value);  // Update visual position immediately
  // Don't seek audio yet! (would be too many operations)
};
```

**Purpose:**
- Update the slider visual position immediately
- Store the target position
- Give instant visual feedback
- Don't seek audio yet (performance!)

**Why not seek immediately?**
- This fires ~60 times per second while dragging
- Seeking is relatively expensive (~50-100ms)
- Would cause stuttering and lag
- Battery drain
- Wait until user releases!

#### 3. onSlidingComplete (User releases)

```typescript
const handleSlidingComplete = async (value: number) => {
  console.log('✅ User released at:', value);
  
  // NOW we actually seek the audio
  const positionMillis = (value / 100) * duration;
  await playerRef.current.seekTo(positionMillis);
  
  setIsSliding(false);  // Re-enable normal updates
};
```

**Purpose:**
- Actually update the audio position
- One single seek operation
- Re-enable skip buttons
- Resume normal status updates

---

## State Management Strategy

### The Problem:

We have **TWO sources** trying to update the slider:

1. **User dragging** - wants to control slider position
2. **Playback updates** - every 250ms, status callback wants to update slider

**Conflict:**
```
User drags to 1:30
   ↓
Slider shows 1:30
   ↓
Before we seek, status update fires!
   ↓
Status says "you're at 0:45"
   ↓
Slider jumps back to 0:45
   ↓
User confused! 😵
```

### The Solution: Sliding State Flag

```typescript
const [isSliding, setIsSliding] = useState(false);
const [sliderPosition, setSliderPosition] = useState(0);

// In status update callback:
const handleStatusUpdate = (status: AVPlaybackStatusSuccess) => {
  setIsPlaying(status.isPlaying);
  setCurrentTime(status.positionMillis);
  setDuration(status.durationMillis || 0);

  // ONLY update slider if user isn't controlling it
  if (!isSliding) {
    const progress = (status.positionMillis / (status.durationMillis || 1)) * 100;
    setSliderPosition(progress);
  }
  // If isSliding === true, ignore status updates for slider!
};
```

**How it works:**

1. **During normal playback:**
   - `isSliding = false`
   - Status updates freely update slider position
   - Slider moves smoothly with playback

2. **User starts dragging:**
   - `isSliding = true`
   - Status updates are ignored for slider
   - Only user's drag position matters

3. **User releases:**
   - Seek audio to new position
   - `isSliding = false`
   - Status updates resume control
   - Everything syncs up

---

## Implementation Plan

### Step 1: Install the Slider Package

```bash
npx expo install @react-native-community/slider
```

### Step 2: Add State Variables

```typescript
const [isSliding, setIsSliding] = useState(false);
const [sliderPosition, setSliderPosition] = useState(0);
```

**Why separate from `currentTime`?**
- `currentTime` = actual playback position (in milliseconds)
- `sliderPosition` = visual slider position (as percentage 0-100)
- Allows smooth dragging without constant conversions

### Step 3: Update handleStatusUpdate

```typescript
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

  if (status.didJustFinish) {
    setIsPlaying(false);
  }
};
```

### Step 4: Add Slider Handlers

```typescript
const handleSlidingStart = () => {
  setIsSliding(true);
};

const handleValueChange = (value: number) => {
  // Update visual position immediately
  setSliderPosition(value);
  
  // Optionally update time display for preview
  const previewTime = (value / 100) * duration;
  setCurrentTime(previewTime);
};

const handleSlidingComplete = async (value: number) => {
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
```

### Step 5: Replace Progress Bar with Slider

**Remove:**
```tsx
<View style={styles.progressBar}>
  <View style={[styles.progressFill, { width: `${progress}%` }]} />
</View>
```

**Add:**
```tsx
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
  disabled={isSliding && false} // Could disable during loading
/>
```

### Step 6: Disable Skip Buttons During Sliding

```tsx
<TouchableOpacity
  style={[styles.skipButton, isSliding && styles.buttonDisabled]}
  onPress={handleSkipBackward}
  disabled={isSliding}
  activeOpacity={0.7}
>
  <Text style={[styles.skipIcon, isSliding && styles.iconDisabled]}>↺</Text>
  <Text style={[styles.skipLabel, isSliding && styles.labelDisabled]}>-15s</Text>
</TouchableOpacity>
```

**Styling:**
```typescript
buttonDisabled: {
  opacity: 0.4,
},
iconDisabled: {
  color: '#999',
},
labelDisabled: {
  color: '#999',
},
```

---

## Technical Deep Dive: How Sliders Work

### Native Components

The slider component is a thin JavaScript wrapper around native UI elements:

**iOS:** `UISlider`
- Built into iOS UIKit
- Hardware accelerated
- Native gesture recognition
- Smooth 60fps dragging

**Android:** `SeekBar`
- Part of Android Material Design
- Native touch handling
- Ripple effects
- Accessibility built-in

### The Bridge Dance

```
User drags finger on screen
      ↓
Native touch event (iOS/Android)
      ↓
Native slider component updates (60fps)
      ↓
Native code sends update to JavaScript (throttled ~10-30fps)
      ↓
onValueChange callback fires in JavaScript
      ↓
State updates
      ↓
React re-renders (if needed)
```

**Key optimization:**
- Native slider updates immediately (smooth!)
- JavaScript updates are throttled (performance!)
- User sees smooth animation even if JS is slow

### Why Native Components Are Better

**Custom PanResponder implementation:**
```
Touch event
  ↓
Bridge crossing (~16-30ms)
  ↓
JavaScript processing (~1-5ms)
  ↓
State update
  ↓
Re-render
  ↓
Bridge crossing back (~16-30ms)
  ↓
Native view updates
  ↓
TOTAL: ~35-65ms per frame = stuttery!
```

**Native slider:**
```
Touch event
  ↓
Native slider updates immediately (~1-2ms)
  ↓
User sees smooth animation!
  ↓
JavaScript updates happen later (throttled)
```

This is why native components feel so much better!

---

## Edge Cases & Solutions

### Edge Case 1: Seeking While Audio is Loading

**Problem:** User drags slider before audio finishes loading

**Solution:**
```typescript
const handleSlidingComplete = async (value: number) => {
  if (!duration || duration === 0) {
    console.warn('⚠️ Audio not ready yet');
    return;
  }
  
  const positionMillis = (value / 100) * duration;
  await playerRef.current.seekTo(positionMillis);
  setIsSliding(false);
};
```

### Edge Case 2: Rapid Dragging

**Problem:** User drags quickly, releases, drags again before seek completes

**Solution:** The `isSliding` flag naturally handles this! Each drag session is independent.

### Edge Case 3: Drag Past End/Start

**Problem:** User might drag slider past 100% or below 0%

**Solution:** Slider component handles this automatically with `minimumValue={0}` and `maximumValue={100}`

### Edge Case 4: Audio Ends While Dragging

**Problem:** Audio finishes while user is dragging slider

**Solution:**
```typescript
const handleStatusUpdate = (status: AVPlaybackStatusSuccess) => {
  // ... other updates ...
  
  if (status.didJustFinish) {
    setIsPlaying(false);
    // Even if dragging, user will see it finished
    if (!isSliding) {
      setSliderPosition(100); // Snap to end
    }
  }
};
```

### Edge Case 5: Network Lag During Seek

**Problem:** Seeking to new position takes a long time (slow network)

**Solution:**
```typescript
const handleSlidingComplete = async (value: number) => {
  const positionMillis = (value / 100) * duration;
  
  try {
    setIsSliding(true); // Keep control until seek completes
    await playerRef.current.seekTo(positionMillis);
  } catch (err) {
    console.error('Seek failed:', err);
    // Slider will snap back to actual position
  } finally {
    setIsSliding(false);
  }
};
```

---

## User Experience Considerations

### Visual Feedback

**During drag:**
- Thumb follows finger precisely
- Time display updates to show preview
- Track fills/empties in real-time

**On release:**
- Brief moment before seek completes
- If lag, user might see slight jump
- This is normal and expected

### Accessibility

The native slider components have built-in accessibility:
- VoiceOver/TalkBack support
- Increment/decrement gestures
- Announce current position
- Standard accessibility labels

**We should add:**
```tsx
<Slider
  accessible={true}
  accessibilityLabel="Seek audio position"
  accessibilityValue={{
    min: 0,
    max: 100,
    now: sliderPosition,
    text: `${formatTime(currentTime)} of ${formatTime(duration)}`
  }}
  // ... other props
/>
```

### Touch Target Size

**Slider thumb:**
- Default is usually 28×28 on iOS, 20×20 on Android
- Can be customized with `thumbStyle` prop
- Make sure it's at least 44×44 for comfortable tapping

**Hit slop:**
- Slider automatically has generous hit area
- Users can tap slightly above/below slider and it works
- Built into native components

---

## Performance Considerations

### Status Update Frequency

**Current:** Status updates every ~250ms (4 times per second)

**During sliding:** We ignore these updates, so no performance impact

**After seeking:** One status update fires immediately with new position

**Optimization:** Already optimal! No changes needed.

### Slider Update Frequency

**During drag:** Updates at ~60fps (native side), throttled to ~10-30fps (JS side)

**Concern:** Could this lag?

**Answer:** No! Native component handles smoothness. JS updates are just for our callbacks.

### Memory

**New state variables:**
- `isSliding`: boolean (1 byte)
- `sliderPosition`: number (8 bytes)

**Total added:** ~9 bytes. Negligible!

---

## Interaction with Skip Buttons

### Strategy: Disable During Sliding

**Why disable?**
- Prevents conflicting operations
- User is focused on slider, won't try to skip
- Clearer UI state
- Prevents edge case where skip happens mid-drag

**Implementation:**
```tsx
// Skip buttons
disabled={isSliding}
style={[styles.skipButton, isSliding && styles.buttonDisabled]}

// Play/Pause button
disabled={isSliding}  // Optional - could allow this

// Restart button
disabled={isSliding}
```

**Visual feedback:**
- Buttons fade to 40% opacity
- Icon/text color changes to gray
- Clear indication they're disabled

**Alternative approach (not recommended):**
- Allow skip buttons during drag
- Cancel drag if skip is pressed
- More complex, confusing UX

---

## Alternative: Pause Audio During Drag?

### Option A: Keep Playing While Dragging

**Current plan:**
- Audio continues playing
- User drags slider
- On release, audio seeks to new position

**Pros:**
- Simple implementation
- Audio doesn't stop
- User can hear what's playing

**Cons:**
- Slider position might jump after release (during seek)
- Slightly confusing UX

### Option B: Pause During Drag

**Alternative:**
```typescript
const handleSlidingStart = () => {
  setIsSliding(true);
  if (isPlaying) {
    wasPlayingBeforeDrag = true;
    playerRef.current.pause();
  }
};

const handleSlidingComplete = async (value: number) => {
  const positionMillis = (value / 100) * duration;
  await playerRef.current.seekTo(positionMillis);
  
  if (wasPlayingBeforeDrag) {
    await playerRef.current.play();
    wasPlayingBeforeDrag = false;
  }
  
  setIsSliding(false);
};
```

**Pros:**
- Clearer UX - audio position matches slider
- No unexpected jumps
- User is clearly "scrubbing"

**Cons:**
- More complex code
- Audio stops/starts (might be jarring)
- Extra state to track

**Recommendation:** Start with Option A (keep playing). Can always add Option B if users request it.

---

## Testing Checklist

### Basic Functionality:
- [ ] Can drag slider left and right
- [ ] Thumb follows finger smoothly
- [ ] Audio seeks to new position on release
- [ ] Time display updates during drag

### State Preservation:
- [ ] Drag while playing → continues playing after seek
- [ ] Drag while paused → stays paused after seek
- [ ] Playback updates don't interfere with dragging

### Skip Button Interaction:
- [ ] Skip buttons disabled during drag
- [ ] Skip buttons work before drag
- [ ] Skip buttons work after drag
- [ ] Visual feedback (opacity/color change)

### Edge Cases:
- [ ] Drag to very end → seeks to end
- [ ] Drag to very start → seeks to start
- [ ] Quick drag and release → seeks correctly
- [ ] Drag, release, drag again quickly → works

### Visual:
- [ ] Slider matches overall app theme
- [ ] Thumb is easy to see
- [ ] Track colors are clear
- [ ] Looks good on both iOS and Android

### Performance:
- [ ] Dragging is smooth (60fps feel)
- [ ] No stuttering during drag
- [ ] Seek happens quickly on release
- [ ] No lag when returning to playback

---

## Styling Options

### Default Native Look

```tsx
<Slider
  minimumTrackTintColor="#007AFF"  // Blue filled portion
  maximumTrackTintColor="#E0E0E0"  // Gray unfilled portion
  thumbTintColor="#007AFF"         // Blue thumb
/>
```

### Custom Thumb (iOS only)

```tsx
<Slider
  thumbImage={require('./assets/custom-thumb.png')}
/>
```

### Custom Track Images (iOS only)

```tsx
<Slider
  minimumTrackImage={require('./assets/track-min.png')}
  maximumTrackImage={require('./assets/track-max.png')}
/>
```

### Styling the Container

```typescript
slider: {
  width: '100%',
  height: 40,
  marginBottom: 20,
}
```

**Note:** Native slider has some platform-specific styling that can't be fully customized. This is intentional - maintains platform consistency!

---

## Future Enhancements

### 1. Show Preview Time While Dragging

```typescript
const handleValueChange = (value: number) => {
  setSliderPosition(value);
  
  // Update time display to show where you're seeking to
  const previewTime = (value / 100) * duration;
  setCurrentTime(previewTime);
};
```

### 2. Haptic Feedback on Seek

```typescript
import * as Haptics from 'expo-haptics';

const handleSlidingComplete = async (value: number) => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // ... rest of seek logic
};
```

### 3. Show Tooltip Above Thumb

Display current time in a tooltip above the thumb while dragging:
```
      1:23
       ↓
━━━━━━●━━━━━━━
```

Would require custom implementation with absolute positioning.

### 4. Waveform Visualization

Show audio waveform in the slider track. Complex but looks professional!

### 5. Chapter/Marker Support

Add markers on slider for different sections of the lesson.

**For MVP:** None of these are needed! Simple slider is perfect.

---

## Implementation Summary

### Files to Modify:

1. **`src/screens/PlayerScreen.tsx`**
   - Add slider state
   - Add slider handlers
   - Replace progress bar with Slider component
   - Update handleStatusUpdate to respect isSliding flag
   - Add disabled state to skip buttons

2. **`package.json`** (via npm install)
   - Add `@react-native-community/slider`

### New Dependencies:

```bash
npx expo install @react-native-community/slider
```

### Lines of Code:

- New state: ~2 lines
- Handlers: ~30 lines
- JSX changes: ~10 lines
- Style updates: ~5 lines

**Total: ~50 lines of code**

### Complexity: Medium

**Easy parts:**
- Installing package
- Basic slider setup
- Visual styling

**Medium parts:**
- State management with isSliding flag
- Coordinating with status updates
- Disabling skip buttons

**No hard parts!** This is a well-solved problem with good libraries.

---

## Recommendation

**Implement this feature!** It's:
- ✅ Standard UX expectation for audio players
- ✅ Easy to implement with community slider
- ✅ Well-tested approach
- ✅ Good user experience
- ✅ Performs well

The `isSliding` flag pattern is industry-standard and handles all edge cases elegantly.

---

## Ready to Implement?

Once you give the go-ahead, I'll:
1. Install `@react-native-community/slider`
2. Add the state and handlers
3. Replace progress bar with interactive slider
4. Add disabled states to skip buttons
5. Test all interactions

Should take ~15 minutes to implement and test! 🚀

