# Language Audio Player - Development Architecture Plan

## Project Overview

A minimal React Native app using **Expo** and **expo-av** for playing language learning audio lessons downloaded from Firebase Storage.

**Core Requirements:**
- Browse lessons: Language → Level → Lessons
- Play audio with screen off support
- Download lessons from Firebase
- Simple, minimal implementation

---

## Technology Stack

- **React Native** via Expo
- **expo-av** - Audio playback with background support
- **Firebase SDK** - Storage access
- **React Navigation** - Screen navigation
- **TypeScript** - Type safety
- **AsyncStorage** - Optional caching (phase 2+)

---

## File Structure

```
LanguageAudioPlayer/
├── App.tsx                          # Entry point, navigation setup
├── app.json                         # Expo configuration
├── package.json
├── firebaseConfig.ts                # Firebase initialization
│
└── src/
    ├── screens/
    │   ├── DirectoryScreen.tsx      # Browse languages/levels/lessons
    │   └── PlayerScreen.tsx         # Audio player interface
    │
    ├── services/
    │   ├── firebase.ts              # Firebase Storage operations
    │   └── audio.ts                 # expo-av audio player wrapper
    │
    ├── types/
    │   └── index.ts                 # TypeScript interfaces
    │
    └── components/                  # (Optional, for phase 2+)
        └── ListItem.tsx             # Reusable list item
```

---

## Type Definitions

```typescript
// src/types/index.ts

export interface Lesson {
  id: string;
  title: string;
  storagePath: string;  // Firebase Storage path
}

export interface Level {
  id: string;
  name: string;
  lessons: Lesson[];
}

export interface Language {
  id: string;
  name: string;
  levels: Level[];
}

export interface Manifest {
  languages: Language[];
}

// Navigation types
export type RootStackParamList = {
  Directory: undefined;
  Player: {
    lesson: Lesson;
    lessonTitle: string;
  };
};
```

---

## Development Phases

### **Phase 0: Setup & Firebase Connection** ⚡ FIRST

**Goal:** Verify Firebase works, download manifest

**What to build:**
1. Create `firebaseConfig.ts` with Firebase credentials
2. Create `src/services/firebase.ts` with ONE function:
   - `fetchManifest()` - Download and parse manifest.json
3. Temporarily add a button in `App.tsx` to test downloading manifest
4. Console log the result

**Success criteria:**
- Can download manifest.json from Firebase
- Data prints to console correctly
- No errors

**Estimated complexity:** Simple
**Files created:** 2
**Lines of code:** ~50

---

### **Phase 1: Basic Directory Navigation** 🗂️

**Goal:** Show languages, navigate through levels to lessons

**What to build:**

#### 1. DirectoryScreen.tsx
- Display current navigation state (Language list → Level list → Lesson list)
- Use simple FlatList for each view
- Three "modes": showing languages, showing levels, showing lessons
- Back button to go up one level
- Basic styling (just functional, not pretty yet)

**No player yet** - just navigation!

**UI Flow:**
```
┌─────────────────────┐
│  Languages          │
│  ┌───────────────┐  │
│  │ > English     │  │
│  │ > Spanish     │  │
│  └───────────────┘  │
└─────────────────────┘
        ↓ tap English
┌─────────────────────┐
│ ← English           │
│  ┌───────────────┐  │
│  │ > Level 1     │  │
│  │ > Level 2     │  │
│  └───────────────┘  │
└─────────────────────┘
        ↓ tap Level 1
┌─────────────────────┐
│ ← Level 1           │
│  ┌───────────────┐  │
│  │ > Lesson 1... │  │
│  │ > Lesson 2... │  │
│  └───────────────┘  │
└─────────────────────┘
```

**Success criteria:**
- Can browse through all 3 levels (languages → levels → lessons)
- Back button works correctly
- Tapping a lesson does nothing yet (we'll add navigation in Phase 2)

**Estimated complexity:** Medium
**Files modified/created:** 2 (App.tsx, DirectoryScreen.tsx)
**Lines of code:** ~150

---

### **Phase 2: Basic Audio Player** 🎵

**Goal:** Play audio with basic controls

**What to build:**

#### 1. src/services/audio.ts
Create audio player service using expo-av:
```typescript
- setupPlayer() - Configure audio mode for background playback
- loadAudio(firebaseUrl: string) - Load audio from URL
- play() - Start playback
- pause() - Pause playback
- getStatus() - Get current playback status
- cleanup() - Unload audio
```

#### 2. PlayerScreen.tsx
Simple player UI:
- Lesson title at top
- Play/Pause button (large, center)
- Current time / Total duration
- Basic progress indicator
- Back button to return to directory

**No fancy features:**
- No seek bar (just show progress)
- No volume control
- No speed control
- No playlist/next/previous

**Success criteria:**
- Can play audio from Firebase Storage
- Play/Pause works
- Time updates while playing
- Audio continues when screen is off
- Back button returns to directory

**Estimated complexity:** Medium
**Files created:** 2 (audio.ts, PlayerScreen.tsx)
**Lines of code:** ~200

---

### **Phase 3: Connect Navigation** 🔗

**Goal:** Navigate from directory to player

**What to build:**
1. Set up React Navigation stack
2. Wire DirectoryScreen → PlayerScreen navigation
3. Pass lesson data through navigation params
4. Download audio URL from Firebase before playing

**Flow:**
```
Directory (tap lesson) 
  → Get download URL from Firebase Storage
  → Navigate to PlayerScreen with URL
  → PlayerScreen loads and plays audio
```

**Success criteria:**
- Tapping lesson in directory opens player
- Audio loads and plays automatically
- Can go back to directory
- Player state is cleaned up when leaving screen

**Estimated complexity:** Simple
**Files modified:** 3 (App.tsx, DirectoryScreen.tsx, PlayerScreen.tsx)
**Lines of code:** ~100

---

### **Phase 4: Polish & Error Handling** ✨

**Goal:** Handle errors gracefully, add loading states

**What to add:**
1. Loading indicators:
   - While fetching manifest
   - While downloading audio URL
   - While loading audio
2. Error messages:
   - Firebase connection failed
   - Manifest not found
   - Audio file not found
   - Playback failed
3. Basic styling improvements:
   - Consistent spacing
   - Better typography
   - Touch feedback on list items

**Success criteria:**
- No crashes on errors
- User sees helpful messages when things fail
- Loading states show during network operations
- UI looks clean and professional

**Estimated complexity:** Simple-Medium
**Files modified:** All existing files
**Lines of code:** ~150

---

## Firebase Service Implementation Plan

### src/services/firebase.ts

```typescript
// Functions to implement:

1. initializeFirebase()
   - Initialize Firebase app with config
   - Get storage reference

2. fetchManifest(): Promise<Manifest>
   - Download manifest.json from Firebase Storage root
   - Parse JSON
   - Return typed Manifest object
   - Handle errors (file not found, parse errors)

3. getAudioDownloadUrl(storagePath: string): Promise<string>
   - Take a path like "audio-lessons/test.wav"
   - Get Firebase Storage reference
   - Get download URL
   - Return URL string
   - Handle errors (file not found, permission denied)
```

**Why this approach:**
- Simple: Only 3 functions needed
- Direct: Get URLs on-demand (no pre-fetching)
- Reliable: Uses Firebase SDK's built-in error handling

---

## Audio Service Implementation Plan

### src/services/audio.ts

```typescript
// Using expo-av Audio API

1. setupAudioMode()
   - Configure for background playback
   - Set audio category to "playback"
   - Set staysActiveInBackground: true
   - Call once at app startup

2. AudioPlayer class (or functions):
   - currentSound: Audio.Sound | null
   
   - async loadAndPlay(url: string)
     * Unload previous sound if exists
     * Create new sound from URL
     * Set onPlaybackStatusUpdate callback
     * Play immediately
   
   - async play()
     * Resume playback if paused
   
   - async pause()
     * Pause playback
   
   - async cleanup()
     * Unload sound
     * Clear references
   
   - getStatus()
     * Return current playback status
```

**expo-av Configuration:**
```typescript
import { Audio } from 'expo-av';

// Enable background audio
await Audio.setAudioModeAsync({
  staysActiveInBackground: true,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
});
```

**Why this approach:**
- expo-av handles complexity for us
- Simple async/await API
- Built-in background support
- No need for complicated state management

---

## Navigation Setup

### App.tsx Structure

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Two screens:
const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Directory">
        <Stack.Screen 
          name="Directory" 
          component={DirectoryScreen}
          options={{ title: 'Audio Lessons' }}
        />
        <Stack.Screen 
          name="Player" 
          component={PlayerScreen}
          options={({ route }) => ({ 
            title: route.params.lessonTitle 
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Why this approach:**
- Native stack navigator (fastest, most native feel)
- Only 2 screens (simple!)
- Title shows context (lesson name in player)
- Built-in back button

---

## State Management Strategy

**NO Redux, NO Context API, NO MobX**

**Why?** This app is too simple!

### State Storage Plan:

1. **Manifest data:** 
   - Load once in DirectoryScreen
   - Store in component state
   - Pass through navigation params if needed

2. **Directory navigation state:**
   - Track current view (languages/levels/lessons) in DirectoryScreen state
   - Track selected language/level in component state

3. **Audio playback state:**
   - Managed by expo-av Sound object
   - Exposed through callback in PlayerScreen state
   - No global state needed

**Benefits:**
- Simple to understand
- No boilerplate
- Fast to implement
- Easy to debug

---

## Error Handling Strategy

### Categories:

1. **Network Errors:**
   - Firebase connection failed
   - Manifest download failed
   - Audio URL fetch failed
   - Audio download failed

2. **Data Errors:**
   - Manifest parse error
   - Invalid lesson data
   - Missing fields

3. **Playback Errors:**
   - Audio format unsupported
   - File corrupted
   - Playback interrupted

### Handling Approach:

```typescript
// Show error in UI + log to console
try {
  const manifest = await fetchManifest();
  setManifest(manifest);
} catch (error) {
  console.error('Failed to fetch manifest:', error);
  setError('Could not load lessons. Check your internet connection.');
}
```

**User sees:**
- Friendly error message
- Option to retry
- Not technical jargon

**Developer sees:**
- Full error in console
- Stack trace
- Context

---

## Testing Strategy

### Manual Testing Checklist (Per Phase):

**Phase 0:**
- [ ] Manifest downloads successfully
- [ ] JSON parses correctly
- [ ] All languages/levels/lessons appear in console

**Phase 1:**
- [ ] Can see all languages
- [ ] Can tap language → see levels
- [ ] Can tap level → see lessons
- [ ] Back button works at each level
- [ ] Can navigate back to root

**Phase 2:**
- [ ] Audio loads from Firebase
- [ ] Play button starts audio
- [ ] Pause button stops audio
- [ ] Time updates during playback
- [ ] Audio plays with screen off

**Phase 3:**
- [ ] Tap lesson → opens player
- [ ] Audio plays automatically
- [ ] Back to directory works
- [ ] Can select different lesson

**Phase 4:**
- [ ] Loading indicators show
- [ ] Errors display properly
- [ ] App doesn't crash on errors
- [ ] UI looks polished

**No automated tests** - This is MVP, manual testing is sufficient.

---

## UI/UX Principles

**Goal:** Functional, not fancy

### Visual Design:
- **Colors:** Keep it simple - black text, white background, one accent color
- **Typography:** System fonts (no custom fonts)
- **Spacing:** Consistent padding (16px standard)
- **Touchable areas:** Minimum 44x44 pixels
- **Feedback:** Show loading, show errors, show success

### User Flow:
1. App opens → Shows languages immediately (or loading)
2. Tap language → Levels appear
3. Tap level → Lessons appear
4. Tap lesson → Player opens, audio starts
5. Listen → Screen can turn off, audio continues
6. Done → Back button returns to directory

**Total taps to play audio: 3** (language → level → lesson)

---

## Performance Considerations

### What we DON'T need to optimize yet:
- Caching (manifest is small, ~10kb)
- Image optimization (no images!)
- Code splitting (app is tiny)
- Memoization (lists are short)

### What we DO care about:
- Audio loads quickly (Firebase CDN handles this)
- Navigation is smooth (React Navigation handles this)
- No blocking operations on main thread (async/await handles this)

**Principle:** Build it simple first, optimize only if needed.

---

## Known Limitations (Acceptable for MVP)

1. **No offline mode** - Requires internet connection
2. **No progress tracking** - Can't resume from where you left off
3. **No playlist** - Play one lesson at a time
4. **No speed control** - Normal speed only
5. **No sleep timer** - Plays until end or manually stopped
6. **No bookmarks/favorites** - Browse every time
7. **No search** - Must navigate directory structure
8. **No download for offline** - Stream only
9. **No background controls** - Can't control from lock screen (expo-av limitation)

**These are fine!** We can add later if needed.

---

## Risk Assessment

### Potential Issues:

1. **expo-av background playback**
   - Risk: Might not work as expected
   - Mitigation: Test early in Phase 2
   - Fallback: Add warning "Keep app open" if it fails

2. **Firebase Storage CORS**
   - Risk: Browser/app might block requests
   - Mitigation: Firebase handles this automatically for authenticated requests
   - Fallback: Adjust Firebase rules if needed

3. **Large audio files**
   - Risk: Slow to start playback
   - Mitigation: Use compressed audio formats (mp3, not wav)
   - Fallback: Show "Loading..." message

4. **Manifest gets large**
   - Risk: Slow to download/parse
   - Mitigation: Keep structure simple
   - Fallback: Implement caching in later phase

### Low Risk (unlikely to happen):
- Navigation issues (React Navigation is mature)
- TypeScript errors (we'll see them immediately)
- Expo compatibility (we're using stable packages)

---

## Timeline Estimate

**Assuming focused development:**

- **Phase 0:** 30 minutes - 1 hour
- **Phase 1:** 2-3 hours
- **Phase 2:** 2-3 hours
- **Phase 3:** 1 hour
- **Phase 4:** 1-2 hours

**Total: 6-10 hours of development**

**BUT:** This is AI-assisted, so likely faster. Testing/debugging will add time.

---

## Success Criteria (Definition of Done)

The app is "done" when:

✅ User can browse languages → levels → lessons

✅ User can select and play any lesson

✅ Audio plays from Firebase Storage

✅ Audio continues playing with screen off

✅ User can pause/resume playback

✅ User can navigate back to directory

✅ Errors show friendly messages (not crashes)

✅ Loading states show during network operations

✅ Works on Android (minimum)

✅ Code is clean and commented

---

## Next Steps After MVP

**If you want to expand later:**

1. Add progress tracking (AsyncStorage)
2. Add resume playback feature
3. Add seek bar (scrubbing)
4. Add playback speed control
5. Add download for offline playback
6. Add favorites/bookmarks
7. Add search functionality
8. Improve player UI (waveform, better controls)
9. Add playlist/queue feature
10. iOS testing and polish

**But for now:** Keep it minimal!

---

## Questions Before Starting?

Before I start coding, please confirm:

1. ✅ You have Firebase credentials ready?
2. ✅ You've uploaded test.wav and manifest.json to Firebase Storage?
3. ✅ This phased approach makes sense?
4. ✅ The file structure works for you?
5. ✅ You're okay with the limitations listed?

**Once you give the OK, I'll start with Phase 0!** 🚀

