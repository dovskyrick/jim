# 🎯 Step-by-Step Setup Guide

Follow these steps to start generating TTS audio lessons!

## ✅ Step 1: Install Dependencies

Open a terminal in the `AudioGeneration` folder and run:

```bash
npm install
```

This will install:
- `openai` - For text-to-speech generation
- `firebase-admin` - For uploading to Firebase Storage
- `dotenv` - For managing environment variables
- `typescript` & `tsx` - For TypeScript support

---

## 🔑 Step 2: Get Your OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign in or create an account
3. Click on your profile picture (top right)
4. Select **"API keys"** or go to https://platform.openai.com/api-keys
5. Click **"+ Create new secret key"**
6. Give it a name (e.g., "Audio Lesson Generator")
7. Copy the key (starts with `sk-...`)
   ⚠️ **Important:** Save it now! You won't be able to see it again

**Cost:** ~$0.045 per 500-word lesson with `tts-1` model

---

## 🔥 Step 3: Get Your Firebase Service Account Key

1. Go to https://console.firebase.google.com/
2. Select your project: **jim-c9df8**
3. Click the ⚙️ **Settings** icon > **Project Settings**
4. Go to the **"Service Accounts"** tab
5. Click **"Generate New Private Key"**
6. Click **"Generate Key"** in the confirmation dialog
7. A JSON file will download (e.g., `jim-c9df8-firebase-adminsdk-xxxxx.json`)
8. Rename it to: `firebase-service-account.json`
9. Move it to your `AudioGeneration` folder

---

## 📝 Step 4: Create Your .env File

In the `AudioGeneration` folder, create a file called `.env` (no extension) with this content:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Firebase Admin SDK Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Firebase Storage Configuration
FIREBASE_STORAGE_BUCKET=jim-c9df8.firebasestorage.app
```

Replace `sk-proj-your-actual-key-here` with your actual OpenAI API key from Step 2.

---

## 🧪 Step 5: Test Your Setup

Run the test script to verify everything is configured correctly:

```bash
npm test
```

You should see:
```
✅ Configuration validated successfully
✅ OpenAI TTS connection successful!
✅ Firebase Storage connection successful!
✅ All tests passed! You're ready to generate audio lessons!
```

If you see errors, check the troubleshooting section in README.md

---

## 🎵 Step 6: Generate Your First Audio Lesson

Run the generator:

```bash
npm run generate
```

This will:
1. Generate an audio file from the sample lesson text
2. Upload it to Firebase Storage
3. Print the Firebase URL and storage path

Example output:
```
🎓 Generating Lesson: Lesson 1: Introduction
   Language: English (english)
   Level: Level 1 (level1)

🎙️  Generating audio with voice: alloy, model: tts-1
✅ Audio generated successfully (45678 bytes)
💾 Audio saved to: C:\Dev\jim\AudioGeneration\output\english-level1-lesson1.mp3
☁️  Uploading to Firebase Storage: audio-lessons/english-level1-lesson1.mp3
✅ Upload successful!
🔗 Public URL: https://storage.googleapis.com/jim-c9df8.firebasestorage.app/audio-lessons/english-level1-lesson1.mp3
```

---

## 📚 Step 7: Create Your Own Lessons

Open `src/index.ts` and modify the lesson content:

```typescript
const singleLesson: LessonContent = {
  languageId: 'english',
  languageName: 'English',
  levelId: 'level1',
  levelName: 'Level 1',
  lessonId: 'lesson1',
  lessonTitle: 'Lesson 1: Greetings',
  text: `
    Welcome to your first lesson! 
    Today we'll learn basic greetings.
    Hello means to greet someone.
    Good morning is used before noon.
    Good afternoon is from noon to evening.
    Good evening is after 6 PM.
  `,
  voice: 'alloy', // Try: alloy, echo, fable, onyx, nova, shimmer
};
```

Then run `npm run generate` again!

---

## 🔢 Step 8: Generate Multiple Lessons (Batch Mode)

To generate many lessons at once, edit `src/index.ts`:

1. Comment out the single lesson mode (lines ~30-46)
2. Uncomment the batch mode section (lines ~52-58)
3. Add your lessons to the array:

```typescript
const myLessons: LessonContent[] = [
  {
    languageId: 'english',
    languageName: 'English',
    levelId: 'level1',
    levelName: 'Level 1',
    lessonId: 'lesson1',
    lessonTitle: 'Lesson 1: Introduction',
    text: 'Your lesson content here...',
    voice: 'alloy',
  },
  {
    languageId: 'english',
    languageName: 'English',
    levelId: 'level1',
    levelName: 'Level 1',
    lessonId: 'lesson2',
    lessonTitle: 'Lesson 2: Numbers',
    text: 'Let\'s count: one, two, three...',
    voice: 'nova',
  },
  // Add more lessons...
];
```

Run: `npm run generate`

---

## 📋 Step 9: Update Your Manifest

After generating lessons, the script will output storage paths:

```
Language: english
  Level: level1
    lesson1: "audio-lessons/english-level1-lesson1.mp3"
    lesson2: "audio-lessons/english-level1-lesson2.mp3"
```

Copy these paths to `manifest.json` in your project root:

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
            },
            {
              "id": "lesson2",
              "title": "Lesson 2: Numbers",
              "storagePath": "audio-lessons/english-level1-lesson2.mp3"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 🎉 Step 10: Test in Your App

1. Upload the updated `manifest.json` to Firebase Storage
2. Open your LanguageAudioPlayer app
3. The new audio lessons should appear!
4. Test playback to ensure everything works

---

## 🎤 Voice Recommendations

Choose the right voice for your content:

| Voice | Best For | Description |
|-------|----------|-------------|
| **alloy** | General lessons | Neutral, clear, balanced |
| **echo** | Male preference | Clear male voice |
| **fable** | English lessons | British accent, expressive |
| **onyx** | Authority/News | Deep, authoritative |
| **nova** | Beginner lessons | Friendly female, energetic |
| **shimmer** | Children/Relaxed | Soft, gentle female |

**Tip:** Use different voices for different lesson types or levels!

---

## 💡 Pro Tips

### 1. Writing Good Lesson Text

- Use natural, conversational language
- Add pauses with punctuation (periods, commas)
- Break long sentences into shorter ones
- Include pronunciation guides: "Hello (heh-LOH)"

### 2. Optimizing Costs

- Use `tts-1` model instead of `tts-1-hd` (50% cheaper)
- Batch generate lessons to save time
- Keep local copies if you need to regenerate the manifest

### 3. Quality Control

- Listen to generated audio before uploading to production
- Use `keepLocalFile: true` to review before deleting
- Test different voices to find the best fit

### 4. Organization

- Follow consistent naming: `{language}-{level}-{lesson}`
- Keep text files separate from code for easier editing
- Consider using a spreadsheet to plan lessons before generating

---

## ❓ Common Questions

**Q: How long does it take to generate a lesson?**
A: Usually 2-5 seconds per lesson, depending on text length.

**Q: What's the maximum text length?**
A: OpenAI TTS supports up to 4096 characters per request.

**Q: Can I regenerate a lesson?**
A: Yes! Just run the generator again. It will overwrite the old file in Firebase.

**Q: How do I use a different voice for different languages?**
A: Set the `voice` property when creating each lesson:
```typescript
{ languageId: 'spanish', voice: 'nova' },
{ languageId: 'french', voice: 'shimmer' },
```

**Q: The audio sounds too fast/slow. How do I change it?**
A: Edit `src/config.ts` and change `speed: 1.0` (range: 0.25 to 4.0)

---

## 🚀 You're Ready!

You now have everything you need to generate professional TTS audio lessons. Start creating content and building your language learning app!

**Need help?** Check the README.md or the inline code comments.

---

**Happy lesson generation! 🎵**

