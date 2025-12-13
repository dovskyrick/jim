# 🎵 Audio Lesson Generator

Generate high-quality TTS (Text-to-Speech) audio lessons using OpenAI's TTS API and automatically upload them to Firebase Storage.

## 📋 Overview

This system allows you to:
- Convert lesson text into natural-sounding audio using OpenAI's TTS
- Choose from 6 different voices (alloy, echo, fable, onyx, nova, shimmer)
- Automatically upload generated audio to Firebase Storage
- Organize lessons by language, level, and lesson ID
- Generate single lessons or batch process multiple lessons

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (it starts with `sk-`)

### 3. Set Up Firebase Admin SDK

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `jim-c9df8`
3. Click the gear icon ⚙️ > **Project Settings**
4. Go to **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Save the downloaded JSON file as `firebase-service-account.json` in this directory

### 4. Create `.env` File

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_STORAGE_BUCKET=jim-c9df8.firebasestorage.app
```

### 5. Test Your Setup

```bash
npm test
```

This will verify:
- ✅ Configuration is valid
- ✅ OpenAI API connection works
- ✅ Firebase Storage connection works

### 6. Generate Your First Lesson

```bash
npm run generate
```

## 📝 How to Use

### Generate a Single Lesson

Edit `src/index.ts` and modify the `singleLesson` object:

```typescript
const singleLesson: LessonContent = {
  languageId: 'english',
  languageName: 'English',
  levelId: 'level1',
  levelName: 'Level 1',
  lessonId: 'lesson1',
  lessonTitle: 'Lesson 1: Introduction',
  text: 'Your lesson text goes here...',
  voice: 'alloy', // or: echo, fable, onyx, nova, shimmer
};
```

Then run:

```bash
npm run generate
```

### Generate Multiple Lessons (Batch)

Edit `src/index.ts` and uncomment the batch mode section:

```typescript
const myLessons: LessonContent[] = [
  {
    languageId: 'spanish',
    languageName: 'Spanish',
    levelId: 'level1',
    levelName: 'Nivel 1',
    lessonId: 'lesson1',
    lessonTitle: 'Lección 1',
    text: 'Tu texto aquí...',
    voice: 'nova',
  },
  // Add more lessons...
];

const results = await generator.generateBatch(myLessons, false);
```

### Update Your Manifest

After generation, the script will output storage paths like:

```
Language: english
  Level: level1
    lesson1: "audio-lessons/english-level1-lesson1.mp3"
```

Copy these paths to your `manifest.json`:

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
              "title": "Lesson 1: Introduction",
              "storagePath": "audio-lessons/english-level1-lesson1.mp3"
            }
          ]
        }
      ]
    }
  ]
}
```

## 🎤 Available Voices

OpenAI TTS offers 6 different voices:

| Voice | Description |
|-------|-------------|
| `alloy` | Neutral, balanced voice |
| `echo` | Male voice, clear and straightforward |
| `fable` | British accent, warm and expressive |
| `onyx` | Deep male voice, authoritative |
| `nova` | Female voice, friendly and energetic |
| `shimmer` | Female voice, soft and gentle |

**Tip:** Listen to samples at [OpenAI's TTS documentation](https://platform.openai.com/docs/guides/text-to-speech) to choose the best voice for your lessons!

## ⚙️ Configuration Options

Edit `src/config.ts` to customize:

```typescript
tts: {
  defaultVoice: 'alloy',     // Default voice
  model: 'tts-1',            // tts-1 (faster) or tts-1-hd (higher quality)
  format: 'mp3',             // mp3, opus, aac, flac, wav
  speed: 1.0,                // 0.25 to 4.0
}
```

## 💰 Pricing

OpenAI TTS pricing (as of 2024):
- **tts-1**: $0.015 per 1,000 characters (~$15 per 1M characters)
- **tts-1-hd**: $0.030 per 1,000 characters (~$30 per 1M characters)

Example: A 500-word lesson (≈3,000 characters) costs about $0.045 with tts-1.

## 📁 Project Structure

```
AudioGeneration/
├── src/
│   ├── config.ts              # Configuration management
│   ├── types.ts               # TypeScript type definitions
│   ├── openai-tts.ts          # OpenAI TTS service
│   ├── firebase-storage.ts    # Firebase upload service
│   ├── lesson-generator.ts    # Main generator orchestrator
│   ├── examples.ts            # Example lesson content
│   ├── index.ts               # Main entry point
│   └── test.ts                # Connection test script
├── output/                     # Temporary local audio files
├── .env                       # Environment variables (create this)
├── .env.example               # Environment template
├── firebase-service-account.json  # Firebase credentials (create this)
├── package.json
├── tsconfig.json
└── README.md
```

## 🐛 Troubleshooting

### "OPENAI_API_KEY is not set"

Make sure your `.env` file exists and contains:
```
OPENAI_API_KEY=sk-your-actual-key
```

### "Firebase service account file not found"

1. Download the service account JSON from Firebase Console
2. Save it as `firebase-service-account.json` in the AudioGeneration folder
3. Make sure the path in `.env` is correct

### "Failed to upload to Firebase"

Check your Firebase Storage rules. They should allow writes:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audio-lessons/{filename} {
      allow read: if true;
      allow write: if true; // Or add authentication
    }
  }
}
```

### Rate Limiting

If you're generating many lessons, the script includes a 1-second delay between API calls. If you still hit rate limits, increase the delay in `src/lesson-generator.ts`.

## 🔒 Security Notes

- **Never commit** `.env` or `firebase-service-account.json` to version control
- These files are already in `.gitignore`
- Keep your API keys secure
- Consider adding Firebase authentication for production use

## 📚 Additional Resources

- [OpenAI TTS Documentation](https://platform.openai.com/docs/guides/text-to-speech)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)

## 🎯 Next Steps

1. ✅ Set up OpenAI API key
2. ✅ Set up Firebase credentials
3. ✅ Run test script
4. ✅ Generate your first lesson
5. 📝 Create lesson content for your languages
6. 🚀 Generate all lessons in batch
7. 📱 Update manifest.json
8. 🎵 Test in your app!

---

**Happy lesson generation! 🎉**

