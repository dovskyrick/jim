# Language Learning Audio Player - Initial Setup Guide

## Project Overview

This is a minimal React Native mobile app that allows users to:
- Browse audio lessons organized hierarchically: **Language → Level → 25 Lessons**
- Select and play audio lessons using react-native-track-player
- Download lessons from Firebase Storage

**Key Design Principle:** Minimal viable product - no progress tracking, no resume functionality, just browse and play.

---

## What YOU Need to Do: Initial Setup

### 1. Prerequisites Installation

Before we start, you need to install the following:

#### a) Node.js (if not already installed)
- Download and install Node.js from: https://nodejs.org/
- Recommended: LTS version (20.x or later)
- This includes npm (node package manager)

#### b) Choose Your Development Path: **Expo (RECOMMENDED for beginners)**

Since you're new to React Native, I **strongly recommend using Expo**. Here's why:
- No need to install Android Studio or Xcode initially
- Much faster to get started
- Can test on your phone immediately using the Expo Go app
- Handles most configuration automatically

**If you choose Expo (recommended):**
- No additional installation needed! We'll use npx to create the project

**Alternative: React Native CLI (NOT recommended for beginners):**
- Requires Android Studio + Android SDK setup (or Xcode on Mac for iOS)
- More complex configuration
- Only choose this if you have specific native requirements

### 2. Install the Expo Go App on Your Phone (for testing)

- **Android:** Download "Expo Go" from Google Play Store
- **iOS:** Download "Expo Go" from App Store

This lets you test your app by scanning a QR code - no emulator needed!

### 3. Create the Project (Run these commands in your terminal)

```bash
# Navigate to where you want to create the project
cd C:\Dev\jim

# Create a new Expo app with TypeScript template
npx create-expo-app@latest LanguageAudioPlayer --template blank-typescript

# Navigate into the project
cd LanguageAudioPlayer
```

### 4. Install Required Dependencies

Once the project is created, install the necessary libraries:

```bash
# Install react-native-track-player (audio playback)
npx expo install react-native-track-player

# Install Firebase SDK
npx expo install firebase

# Install React Navigation (for navigating between screens)
npx expo install @react-navigation/native @react-navigation/native-stack

# Install required dependencies for React Navigation
npx expo install react-native-screens react-native-safe-area-context

# Install AsyncStorage for caching lesson data locally
npx expo install @react-native-async-storage/async-storage
```

### 5. Set Up Firebase Project

You'll need to create a Firebase project and configure it:

1. Go to https://console.firebase.google.com/
2. Click "Add Project" and follow the wizard
3. Once created, click the **web icon** (`</>`) to add a web app
4. Copy the Firebase configuration object - it will look like:
   ```javascript
   {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   }
   ```
5. Enable **Firebase Storage**:
   - Go to "Storage" in the left sidebar
   - Click "Get Started"
   - Choose "Start in test mode" (we can secure it later)

### 6. Organize Your Audio Files in Firebase Storage

Upload your audio lessons to Firebase Storage with this structure:

```
/audio-lessons/
  /English/
    /Level1/
      lesson1.mp3
      lesson2.mp3
      ...
      lesson25.mp3
    /Level2/
      lesson1.mp3
      ...
  /Spanish/
    /Level1/
      ...
```

**Important:** You'll also need a `manifest.json` file at `/audio-lessons/manifest.json` that describes your lesson structure. Example:

```json
{
  "languages": [
    {
      "id": "english",
      "name": "English",
      "levels": [
        {
          "id": "level1",
          "name": "Level 1",
          "lessons": [
            {
              "id": "lesson1",
              "title": "Lesson 1: Greetings",
              "filename": "lesson1.mp3",
              "path": "audio-lessons/English/Level1/lesson1.mp3"
            },
            // ... 24 more lessons
          ]
        },
        // ... more levels
      ]
    },
    // ... more languages
  ]
}
```

### 7. Create Configuration File

Once you have your Firebase config, create a file called `firebaseConfig.ts` in your project (we'll do this together, but you need the config values ready).

---

## What Happens Next

Once you complete these steps:
1. Let me know you're done
2. I'll create the app structure with:
   - **DirectoryScreen.tsx** - Browse languages/levels/lessons
   - **PlayerScreen.tsx** - Audio player interface
   - **Firebase service** - Handle downloads and data fetching
   - **Audio service** - Manage react-native-track-player
   - **Navigation setup** - Connect the two screens

---

## Quick Start Testing (after setup)

To run your app after setup:

```bash
# Start the development server
npx expo start
```

This will show a QR code. Scan it with:
- **Android:** Expo Go app
- **iOS:** Camera app (it will open in Expo Go)

---

## Questions?

- **Do I need a Mac for iOS testing?** No, if you use Expo Go on your iPhone, you can test on iOS from Windows
- **Can I use an emulator instead of my phone?** Yes, but requires Android Studio setup (more complex)
- **What if I get stuck?** Just let me know at which step, and I'll help troubleshoot

---

## Summary Checklist

- [ ] Install Node.js
- [ ] Install Expo Go app on your phone
- [ ] Run `npx create-expo-app@latest LanguageAudioPlayer --template blank-typescript`
- [ ] Run all the `npx expo install` commands for dependencies
- [ ] Create Firebase project and get configuration
- [ ] Enable Firebase Storage
- [ ] Upload audio files with proper structure
- [ ] Create manifest.json describing your lessons
- [ ] Run `npx expo start` to verify it works

**Once you've completed these steps, let me know and I'll start building the app!**

