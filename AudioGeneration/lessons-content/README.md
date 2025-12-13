# 📝 Lessons Content Directory

This folder contains the source text for all your language lessons.

## 📁 Structure

```
lessons-content/
├── english/
│   ├── level1/
│   │   ├── lesson1-TODO.txt
│   │   └── lesson2-TODO.txt
│   └── level2/
│       └── ...
├── greek/
│   └── level1/
│       └── ...
└── french/
    └── level1/
        └── ...
```

## 🏷️ File Naming Convention

- `lessonX-TODO.txt` - Lesson text ready to be converted to audio
- `lessonX-DONE.txt` - Audio has been generated for this lesson

**The script automatically renames files from TODO to DONE after generating audio.**

## 📄 File Format

**All lesson files start completely empty!** Just paste your content directly.

### Simple Format (Recommended):
```
Your lesson content goes here...
Just paste directly from ChatGPT!
```

### Optional: Advanced Format with Custom Voice/Speed

If you want to override the default voice or speed for a specific lesson, you can add YAML frontmatter:

```yaml
---
voice: shimmer
speed: 1.2
---

Your lesson content goes here...
```

**Note:** If you don't add frontmatter, the system uses defaults:
- Voice: `alloy` (can be changed in `src/config.ts`)
- Speed: `1.0` (can be changed in `src/config.ts`)

### Voice Options (if using frontmatter):
- `alloy` - Neutral, balanced (default)
- `echo` - Male, clear
- `fable` - British accent
- `onyx` - Deep male
- `nova` - Friendly female
- `shimmer` - Soft female

### Speed Options (if using frontmatter):
- `0.25` to `4.0` (default: `1.0`)

## ✍️ How to Add Content

**Super Simple Workflow:**

1. Open any `lessonX-TODO.txt` file (it's empty!)
2. **Ctrl+A** (select all) - nothing to delete since it's empty
3. **Ctrl+V** (paste your ChatGPT content)
4. Save the file
5. Run `npm run generate`

That's it! No formatting needed, just pure text.

## 🤖 Prompt Engineering Tips

When asking ChatGPT to generate lesson content:

**Example Prompt:**
```
Create a 500-word audio lesson script for English Level 1, Lesson 1.
Topic: Basic Greetings and Introductions
Target audience: Complete beginners
Format: Conversational, as if speaking to a student
Include: 
- Warm welcome
- Clear explanations
- Examples and practice phrases
- Encouraging closing
```

**Good practices:**
- Ask for "audio lesson script" or "spoken lesson"
- Specify word count (500-1000 words = 3-7 minutes audio)
- Request conversational tone, not written style
- Include natural pauses (use periods and commas)
- Ask for pronunciation guides when needed

## 📊 Current Lessons

- **English**: 4 lessons (Level 1: 2, Level 2: 2)
- **Greek**: 3 lessons (Level 1: 3)
- **French**: 1 lesson (Level 1: 1)

---

**Happy content creation! 📚**

