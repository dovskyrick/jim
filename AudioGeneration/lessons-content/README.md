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

Each lesson file can have optional metadata using YAML frontmatter:

```yaml
---
voice: alloy
speed: 1.0
---

Your lesson content goes here...
```

### Voice Options:
- `alloy` - Neutral, balanced (default)
- `echo` - Male, clear
- `fable` - British accent
- `onyx` - Deep male
- `nova` - Friendly female
- `shimmer` - Soft female

### Speed Options:
- `0.25` to `4.0` (default: `1.0`)

## ✍️ How to Add Content

1. Create a new file following the naming pattern: `lesson1-TODO.txt`
2. Add the YAML header (optional)
3. Paste your lesson content from ChatGPT
4. Save the file
5. Run the generation script

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

