# 🚀 Quick Reference

## Common Commands

```bash
# Install dependencies
npm install

# Test connection
npm test

# Generate audio lessons
npm run generate

# Development mode (with auto-reload)
npm run dev

# Build TypeScript
npm run build
```

## Voice Options

```typescript
'alloy'    // Neutral, balanced
'echo'     // Male, clear
'fable'    // British accent
'onyx'     // Deep male
'nova'     // Friendly female
'shimmer'  // Soft female
```

## Lesson Template

```typescript
const lesson: LessonContent = {
  languageId: 'english',      // Unique language ID
  languageName: 'English',    // Display name
  levelId: 'level1',          // Unique level ID
  levelName: 'Level 1',       // Display name
  lessonId: 'lesson1',        // Unique lesson ID
  lessonTitle: 'Lesson 1',    // Display title
  text: 'Your lesson text...',// The content to convert
  voice: 'alloy',             // Optional, defaults to 'alloy'
};
```

## File Structure

```
AudioGeneration/
├── .env                       ← Your API keys (CREATE THIS)
├── firebase-service-account.json ← Firebase credentials (CREATE THIS)
├── package.json
├── README.md                  ← Full documentation
├── WALKTHROUGH.md             ← Step-by-step guide
├── QUICK-START.md             ← This file
└── src/
    ├── index.ts               ← EDIT THIS to add lessons
    ├── config.ts              ← Configuration options
    ├── examples.ts            ← Sample lessons
    └── ...
```

## Environment Variables

```env
OPENAI_API_KEY=sk-...
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_STORAGE_BUCKET=jim-c9df8.firebasestorage.app
```

## API Pricing (2024)

| Model | Price per 1K chars | 500-word lesson |
|-------|-------------------|-----------------|
| tts-1 | $0.015 | ~$0.045 |
| tts-1-hd | $0.030 | ~$0.090 |

## Troubleshooting

| Error | Solution |
|-------|----------|
| "OPENAI_API_KEY is not set" | Create `.env` file with your API key |
| "Firebase service account file not found" | Download from Firebase Console |
| "Failed to upload to Firebase" | Check Firebase Storage rules |
| Rate limiting | Increase delay in `lesson-generator.ts` |

## Getting Help

1. Read `WALKTHROUGH.md` for detailed setup
2. Check `README.md` for comprehensive documentation
3. Review code comments in `src/` files
4. Test with `npm test` to verify configuration

## Typical Workflow

1. Write lesson text
2. Add to `src/index.ts`
3. Run `npm run generate`
4. Copy storage paths to `manifest.json`
5. Upload `manifest.json` to Firebase
6. Test in app

---

**Ready to start? Run:** `npm test`

