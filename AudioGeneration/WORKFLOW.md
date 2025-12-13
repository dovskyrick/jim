# 🎯 New File-Based Workflow

## Overview

Your audio generation system now works with a simple file-based workflow using TODO/DONE labels.

## 📁 Directory Structure

```
AudioGeneration/
├── lessons-content/          ← Your text files (tracked in git)
│   ├── english/
│   │   ├── level1/
│   │   │   ├── lesson1-TODO.txt
│   │   │   └── lesson2-TODO.txt
│   │   └── level2/
│   │       ├── lesson1-TODO.txt
│   │       └── lesson2-TODO.txt
│   ├── greek/
│   │   └── level1/
│   │       ├── lesson1-TODO.txt
│   │       ├── lesson2-TODO.txt
│   │       └── lesson3-TODO.txt
│   └── french/
│       └── level1/
│           └── lesson1-TODO.txt
│
└── lessons-audio/            ← Generated MP3s (NOT in git)
    ├── english/
    │   ├── level1/
    │   │   ├── lesson1.mp3
    │   │   └── lesson2.mp3
    └── ...
```

## 🔄 Complete Workflow

### 1. **Create Lesson Content**

Get text from ChatGPT using your prompts, then create a file:

**File:** `lessons-content/english/level1/lesson1-TODO.txt`

```yaml
---
voice: alloy
speed: 1.0
---

Welcome to English Level 1, Lesson 1!

Today we're going to learn about basic greetings...
```

### 2. **Run Generation Script**

```bash
cd AudioGeneration
npm run generate
```

**What happens:**
- ✅ Scans `lessons-content/` for all `*-TODO.txt` files
- ✅ Skips files with template placeholders
- ✅ Generates audio using OpenAI TTS
- ✅ Saves to `lessons-audio/{language}/{level}/{lesson}.mp3`
- ✅ Uploads to Firebase Storage
- ✅ Automatically renames `lesson1-TODO.txt` → `lesson1-DONE.txt`

### 3. **Review & Update Manifest**

Check the generated audio, then update your manifest.json

### 4. **Upload Manifest to Firebase**

Upload the updated manifest.json to Firebase Storage

## 🎯 Key Features

### **Smart Batch Processing**
- Only processes `-TODO.txt` files
- Skips `-DONE.txt` files automatically
- Prevents duplicate generation

### **Auto Status Updates**
- File automatically renamed to `-DONE.txt` after successful generation
- Your content "encyclopedia" stays organized

### **Per-Lesson Voice Settings**
```yaml
---
voice: shimmer    # Override default voice for this lesson
speed: 1.2        # Speak 20% faster
---
```

### **Safe & Reversible**
Want to regenerate a lesson? Just rename:
```bash
lesson1-DONE.txt → lesson1-TODO.txt
```

## 📊 Example Run

```
🔍 Scanning lessons-content directory...

📚 Lessons Summary:
   Total: 8 lessons
   ✅ DONE: 3
   📝 TODO: 5

By Language:
   english: 2 TODO, 2 DONE
   greek: 3 TODO, 0 DONE
   french: 0 TODO, 1 DONE

🚀 Found 5 lesson(s) to generate:

   1. english/level1/lesson1
   2. english/level1/lesson2
   3. greek/level1/lesson1
   4. greek/level1/lesson2
   5. greek/level1/lesson3

[1/5] Processing: english/level1/lesson1
🎓 Generating Lesson: Lesson 1
🎙️  Generating audio with voice: alloy, model: tts-1
✅ Audio generated successfully (45678 bytes)
☁️  Uploading to Firebase Storage: audio-lessons/english-level1-lesson1.mp3
✅ Upload successful!
✅ Marked as DONE: lesson1-DONE.txt

[2/5] Processing: english/level1/lesson2
...
```

## 🛠️ Useful Commands

```bash
# Generate audio for all TODO lessons
npm run generate

# Test connections only (doesn't generate)
npm test

# Development mode (if you're editing the code)
npm run dev
```

## 📝 File Format Details

### **Option 1: With Metadata (Recommended)**
```yaml
---
voice: alloy
speed: 1.0
---

Your lesson content here...
```

### **Option 2: Plain Text (Uses Defaults)**
```
Your lesson content here...
No metadata needed!
```

Both formats work! Metadata is optional.

## 🎤 Voice Recommendations by Language

```yaml
# English - Neutral
voice: alloy

# Greek - Friendly female
voice: nova

# French - Soft feminine
voice: shimmer

# Spanish - Warm and expressive
voice: fable
```

## 🚨 Troubleshooting

### "No TODO lessons found"
- Make sure files end with `-TODO.txt`
- Check that files are in correct directory structure

### "Skipping: File contains template placeholder"
- Replace the `[Paste your lesson content here...]` placeholder with actual content

### "Failed to generate lesson"
- Check your OpenAI API key in `.env`
- Verify you have API credits
- Check lesson text isn't empty

## 💡 Pro Tips

1. **Build Your Encyclopedia First**
   - Create all `-TODO.txt` files with ChatGPT content
   - Review and edit them
   - Then generate all at once

2. **Use Different Voices**
   - Try different voices for different languages
   - Use different voices for different speakers in dialogues

3. **Regenerate Selectively**
   - Rename specific `-DONE.txt` back to `-TODO.txt`
   - Only those lessons will be regenerated

4. **Keep Text Organized**
   - `lessons-content/` is your source of truth
   - Commit these to git
   - Never commit `lessons-audio/` (too large)

---

**Happy lesson generation! 🎵**

