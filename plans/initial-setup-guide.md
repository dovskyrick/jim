# Language Learning Audio Player - Initial Setup Guide

## Project Overview

This is a minimal React Native mobile app that allows users to:
- Browse audio lessons organized hierarchically: **Language → Level → 25 Lessons**
- Select and play audio lessons using react-native-track-player
- Download lessons from Firebase Storage

**Key Design Principle:** Minimal viable product - no progress tracking, no resume functionality, just browse and play.

---

## Check What's Already Installed

Before starting, run these commands to see what you have:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check if project exists
cd C:\Dev\jim\LanguageAudioPlayer
dir package.json

# Check if EAS CLI is installed
eas --version
```

---

## What YOU Need to Do: Initial Setup

### 1. Prerequisites Installation

Before we start, you need to install the following:

#### a) Node.js (if not already installed)
- Download and install Node.js from: https://nodejs.org/
- Recommended: LTS version (20.x or later)
- This includes npm (node package manager)

#### b) EAS CLI (for building the app)

You'll install this in step 6 after creating the project.

**Note about Expo Go:** We won't be using Expo Go because react-native-track-player requires a custom development build. Don't worry - it's easier than it sounds!

### 2. Create the Project (Run these commands in your terminal)

```bash
# Navigate to where you want to create the project
cd C:\Dev\jim

# Create a new Expo app with TypeScript template
npx create-expo-app@latest LanguageAudioPlayer --template blank-typescript

# Navigate into the project
cd LanguageAudioPlayer
```

### 3. Install Required Dependencies

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

### 4. Disable New Architecture (Required for react-native-track-player)

**IMPORTANT:** react-native-track-player doesn't support Expo's new architecture yet.

1. Open `LanguageAudioPlayer/app.json`
2. Find the line that says `"newArchEnabled": true,`
3. Change it to `"newArchEnabled": false,`

**Note:** This setting only affects custom development builds (next step), not Expo Go.

### 5. Set Up EAS Development Build (REQUIRED - Expo Go Won't Work)

Since react-native-track-player doesn't work with Expo Go, you need to create a custom development build. This is like making your own version of Expo Go with the new architecture disabled.

**Don't worry!** This builds in the cloud - no Android Studio needed!

#### Step 5.1: Install EAS CLI

```bash
# Install EAS CLI globally (one-time setup)
npm install -g eas-cli
```

#### Step 5.2: Login to Expo

```bash
# Login (you'll need an Expo account - free to create)
eas login
```

If you don't have an Expo account, create one at: https://expo.dev/signup

#### Step 5.3: Configure EAS for Your Project

```bash
# Make sure you're in the project directory
cd C:\Dev\jim\LanguageAudioPlayer

# Initialize EAS configuration
eas build:configure
```

This creates an `eas.json` file. When asked:
- Choose **"All"** (to configure for both Android and iOS)

#### Step 5.4: Build Your Development APK

```bash
# Build development version for Android (in the cloud)
eas build --profile development --platform android
```

**What happens:**
1. Your code uploads to Expo's servers
2. They build it (takes 15-20 minutes first time)
3. You get a download link for an APK file
4. Download and install the APK on your Android phone

**Important:** 
- First build is free on Expo's free tier
- You only need to rebuild when you add/remove native packages
- Regular code changes don't require rebuilding!

#### Step 5.5: Install on Your Phone

1. After the build completes, EAS will show a download URL
2. Open that URL on your phone (or scan the QR code)
3. Download the APK
4. Install it (you may need to allow "Install from unknown sources")
5. Open the installed app

#### Step 5.6: Start Development

```bash
# Start the Expo development server
npx expo start --dev-client
```

The `--dev-client` flag tells Expo to work with your custom build instead of Expo Go.

**Your development build app** will automatically connect when you scan the QR code!

### 6. Set Up Firebase Project

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

### 7. Organize Your Audio Files in Firebase Storage

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

### 8. Create Configuration File

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
# Start the development server with dev client
npx expo start --dev-client
```

This will show a QR code. Open your **custom development build app** (the one you installed from EAS) and it will automatically connect.

**Note:** Don't use Expo Go - use the custom app you built with EAS!

---

## Questions?

- **Do I need a Mac for iOS testing?** No! You can build iOS development builds with EAS from Windows (though you'll need an iOS device to test on)
- **Can I use an emulator instead of my phone?** Yes, but requires Android Studio setup (more complex)
- **Why can't I use Expo Go?** react-native-track-player doesn't support Expo Go's new architecture, so we need a custom build
- **How often do I need to rebuild?** Only when adding/removing native packages. Regular code changes work instantly with hot reload!
- **Is EAS Build free?** Yes, the free tier includes builds. Plenty for development
- **What if I get stuck?** Just let me know at which step, and I'll help troubleshoot

---

## Summary Checklist

### Initial Setup
- [x] Install Node.js ✓ (You have v22.14.0)
- [x] Run `npx create-expo-app@latest LanguageAudioPlayer --template blank-typescript` ✓
- [x] Run all the `npx expo install` commands for dependencies ✓

### Configuration
- [ ] Change `newArchEnabled: true` to `false` in `app.json`
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to Expo: `eas login`
- [ ] Configure EAS: `eas build:configure`
- [ ] Build development APK: `eas build --profile development --platform android`
- [ ] Download and install the APK on your phone

### Firebase Setup
- [ ] Create Firebase project and get configuration
- [ ] Enable Firebase Storage
- [ ] Upload test audio file: `audio-lessons/test.wav`
- [ ] Upload manifest.json to Firebase Storage root
- [ ] Create firebaseConfig.ts with your Firebase credentials

### Testing
- [ ] Run `npx expo start --dev-client`
- [ ] Open your custom dev build app (not Expo Go!)
- [ ] Verify the app connects and runs

**Once you've completed these steps, let me know and I'll start building the app!**

