# 🎉 Automated Manifest Update Feature

## What's New

The system now **automatically generates and uploads** `manifest.json` after generating audio lessons!

## How It Works

When you run `npm run generate`:

1. ✅ Scans `lessons-content/` for TODO lessons
2. ✅ Generates audio using OpenAI TTS
3. ✅ Uploads audio to Firebase Storage
4. ✅ Renames files from `-TODO.txt` to `-DONE.txt`
5. ✅ **NEW:** Automatically generates updated `manifest.json`
6. ✅ **NEW:** Saves `manifest.json` to project root
7. ✅ **NEW:** Uploads `manifest.json` to Firebase Storage

**Zero manual steps required!** 🚀

---

## What Gets Generated

The manifest is built from your `lessons-content/` folder structure:

```
lessons-content/
├── english/
│   ├── level1/
│   │   ├── lesson1-DONE.txt  →  manifest: english/level1/lesson1
│   │   └── lesson2-TODO.txt  →  manifest: english/level1/lesson2
│   └── level2/
│       └── lesson1-TODO.txt  →  manifest: english/level2/lesson1
├── greek/
└── french/
```

**The manifest mirrors your folder structure exactly!**

---

## Smart Features

### 1. **Preserves Manual Changes**
- Language names (e.g., "Español" instead of "Spanish")
- Custom lesson titles
- Any custom fields you added

### 2. **Auto-Updates Storage Paths**
- Generates correct paths: `audio-lessons/english-level1-lesson1.mp3`
- Updates paths for newly generated lessons
- Keeps existing paths for unchanged lessons

### 3. **Handles All Lessons**
- Includes both TODO and DONE lessons in manifest
- Even if audio isn't generated yet, lesson appears in manifest
- You control what's visible to users via the app logic

---

## Example Output

After running `npm run generate`, you'll see:

```
✅ Batch generation complete!

📚 Lessons Summary:
   Total: 8 lessons
   ✅ DONE: 8
   📝 TODO: 0

📋 Generating manifest.json...

✅ Manifest saved to: C:\Dev\jim\manifest.json

☁️  Uploading manifest.json to Firebase Storage...
✅ Upload successful!
🔗 Public URL: https://storage.googleapis.com/jim-c9df8.firebasestorage.app/manifest.json

✨ All done! Manifest updated and uploaded to Firebase.
```

---

## Generated Manifest Structure

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
              "title": "Lesson 1",
              "storagePath": "audio-lessons/english-level1-lesson1.mp3"
            },
            {
              "id": "lesson2",
              "title": "Lesson 2",
              "storagePath": "audio-lessons/english-level1-lesson2.mp3"
            }
          ]
        }
      ]
    },
    {
      "id": "french",
      "name": "French",
      "levels": [...]
    },
    {
      "id": "greek",
      "name": "Greek",
      "levels": [...]
    }
  ]
}
```

---

## Customizing Manifest

### Default Names
The system auto-generates names from folder/file names:
- `english` → "English"
- `level1` → "Level 1"
- `lesson1` → "Lesson 1"

### Custom Names
Edit the `manifest.json` file manually to customize:

```json
{
  "id": "spanish",
  "name": "Español 🇪🇸",  ← Custom name preserved!
  "levels": [...]
}
```

The system will preserve your custom names on next generation.

---

## Complete Workflow Now

1. **Paste lesson content** into TODO.txt files
2. **Run:** `npm run generate`
3. **Done!** Audio generated, manifest updated, everything uploaded to Firebase
4. **Your app automatically picks up the new lessons!**

That's it! No manual manifest editing needed. 🎉

---

## Technical Details

### New File: `src/manifest-updater.ts`

Handles:
- Reading existing manifest (preserves customizations)
- Scanning `lessons-content/` directory structure
- Building complete manifest with correct storage paths
- Saving to project root
- Uploading to Firebase Storage

### Updated Files:
- `src/index.ts` - Now calls manifest updater after generation
- `src/firebase-storage.ts` - Added generic file upload method

---

## Troubleshooting

### "Failed to update manifest"
- Check that `manifest.json` exists in project root
- Verify Firebase credentials are correct
- Script continues even if manifest update fails

### "Manifest has wrong structure"
- Delete `manifest.json` and run generation again
- System will create a fresh one from your folder structure

### "Need to regenerate manifest without generating audio"
Just run `npm run generate` with no TODO lessons. The manifest will still update based on your folder structure.

---

## Benefits

✅ **No manual work** - Set it and forget it
✅ **Always in sync** - Manifest matches your content folder
✅ **No mistakes** - No typos in paths or structure
✅ **Fast iteration** - Add lessons, generate, done!
✅ **Preserves customization** - Your manual changes stay

---

**This was very doable! 🎯 The system is now fully automated.**

