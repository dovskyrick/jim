# 8. Persistent Vocabulary Audio Library System

## Problem Statement

Current TTS generation has inconsistencies:
- Some words come with unintended silence breaks
- Each lesson generation uses a temporary cache that's discarded after completion
- The same word/phrase might be generated differently across multiple lessons
- No way to manually curate or fix problematic audio clips

## Proposed Solution

Create a **persistent vocabulary audio library** system:

1. **Vocabulary Files**: Text files containing words/phrases to pre-generate (e.g., `vocab1-TODO.txt`)
2. **Audio Library**: Organized folders storing generated audio clips
3. **Vocab Manifest**: JSON mapping Greek text to filenames
4. **Reuse During Lessons**: When generating lessons, check the library first before calling TTS API

---

## Directory Structure

```
lessons-content/
  greek/
    level1/
      vocab-text/           # Vocabulary source files
        vocab1-TODO.txt     # Words to generate (status: TODO/DONE)
        vocab2-TODO.txt
        vocab-manifest.json # Maps Greek text → filename
      vocab-audio/          # Generated vocabulary audio clips
        00001.mp3           # Individual word audio files
        00002.mp3
        00003.mp3
        ...
      lesson1-DONE.txt      # Lesson files (existing)
      lesson2-TODO.txt
```

---

## Vocab File Format

**Format**: `vocab1-TODO.txt` / `vocab1-DONE.txt`

```
Γεια σου — NEW
Γεια σας — NEW
Αντίο — NEW

Παρακαλώ — NEW
Ευχαριστώ — NEW
```

- Each line contains: `Greek Text — Status`
- Status markers:
  - `NEW` = Not yet generated
  - `GENERATED` = Audio exists in library
- Empty lines are ignored
- After processing, file is renamed from `-TODO.txt` to `-DONE.txt`

---

## Vocab Manifest Format

**File**: `lessons-content/greek/level1/vocab-text/vocab-manifest.json`

```json
{
  "version": "1.0",
  "language": "greek",
  "level": "level1",
  "lastUpdated": "2025-12-22T10:30:00Z",
  "entries": [
    {
      "text": "Γεια σου",
      "filename": "00001.mp3",
      "audioPath": "vocab-audio/00001.mp3",
      "voice": "alloy",
      "generatedAt": "2025-12-22T10:25:00Z",
      "source": "vocab1"
    },
    {
      "text": "Γεια σας",
      "filename": "00002.mp3",
      "audioPath": "vocab-audio/00002.mp3",
      "voice": "alloy",
      "generatedAt": "2025-12-22T10:25:00Z",
      "source": "vocab1"
    }
  ]
}
```

- **`text`**: The exact Greek text (used for lookup)
- **`filename`**: Simple numbered filename (avoids accented character issues)
- **`audioPath`**: Relative path from language level directory
- **`voice`**: TTS voice used
- **`source`**: Which vocab file it came from

---

## Generation Flow (Updated)

### Phase 1: Vocabulary Generation

1. **Scan for vocab files**: Find all `*-TODO.txt` files in `vocab-text/` folders
2. **Load vocab manifest**: Read existing `vocab-manifest.json` (if exists)
3. **Process each vocab file**:
   - Parse lines to extract Greek text and status
   - Check if text already exists in manifest
   - If `NEW` and not in manifest:
     - Generate TTS audio
     - Save to `vocab-audio/` with sequential filename
     - Add entry to manifest
     - Update status marker to `GENERATED`
   - If `GENERATED` and in manifest:
     - Skip (already done)
4. **Save vocab manifest**: Write updated `vocab-manifest.json`
5. **Rename vocab file**: `vocab1-TODO.txt` → `vocab1-DONE.txt`

### Phase 2: Lesson Generation

1. **Scan for lesson files**: Find all `lesson*-TODO.txt` files (existing behavior)
2. **Load vocab manifest**: Read the vocab library for this language/level
3. **Process each lesson**:
   - Parse phrases from lesson text
   - For each phrase:
     - **Check vocab library first** (exact match lookup in manifest)
     - If found: Copy/reuse audio file from vocab library
     - If not found:
       - Generate via TTS API
       - **Add to vocab library** (new entry in manifest)
   - Concatenate phrases with silences (existing behavior)
   - Upload to Firebase Storage
4. **Save vocab manifest**: Write updated manifest with any new words
5. **Rename lesson file**: `lesson1-TODO.txt` → `lesson1-DONE.txt`

---

## Code Changes Required

### 1. New File: `src/vocab-manager.ts`

**Purpose**: Manage vocabulary library and manifest

**Key Methods**:
```typescript
class VocabManager {
  // Load manifest from disk
  async loadManifest(languageId: string, levelId: string): Promise<VocabManifest>
  
  // Save manifest to disk
  async saveManifest(manifest: VocabManifest): Promise<void>
  
  // Check if a word/phrase exists in the library
  hasAudio(text: string): boolean
  
  // Get audio file path for a word/phrase
  getAudioPath(text: string): string | null
  
  // Add new word to library and manifest
  async addToLibrary(text: string, audioBuffer: Buffer, voice: string, source: string): Promise<string>
  
  // Generate next sequential filename (00001.mp3, 00002.mp3, etc.)
  private getNextFilename(): string
}
```

### 2. New File: `src/vocab-scanner.ts`

**Purpose**: Scan and parse vocabulary files

**Key Methods**:
```typescript
class VocabScanner {
  // Find all vocab-text directories and vocab files
  async scanVocabFiles(): Promise<VocabFileInfo[]>
  
  // Parse a single vocab file
  parseVocabFile(filePath: string): VocabEntry[]
  
  // Update status markers in vocab file
  updateVocabFileStatus(filePath: string, entries: VocabEntry[]): void
  
  // Rename TODO → DONE
  markVocabFileComplete(filePath: string): void
}
```

### 3. New File: `src/vocab-generator.ts`

**Purpose**: Generate audio for vocabulary entries

**Key Methods**:
```typescript
class VocabGenerator {
  constructor(private vocabManager: VocabManager, private ttsService: OpenAITTSService)
  
  // Generate audio for a single vocab entry
  async generateVocabAudio(entry: VocabEntry, voice: string): Promise<void>
  
  // Process an entire vocab file
  async processVocabFile(fileInfo: VocabFileInfo): Promise<void>
}
```

### 4. Update: `src/lesson-generator.ts`

**Changes**:
- Add `vocabManager: VocabManager` to constructor
- In `generateLesson()`, before calling TTS:
  ```typescript
  // Check vocab library first
  const cachedAudioPath = this.vocabManager.getAudioPath(normalizedText);
  if (cachedAudioPath) {
    // Copy from vocab library instead of generating
    phraseLocalPath = await this.copyFromVocabLibrary(cachedAudioPath);
    console.log(`   ♻️  Reused from vocab library: "${normalizedText}"`);
  } else {
    // Generate via TTS (existing code)
    await this.ttsService.generateAndSave(...);
    // Add to vocab library for future use
    await this.vocabManager.addToLibrary(normalizedText, audioBuffer, voice, 'lesson-generated');
  }
  ```

### 5. Update: `src/index.ts`

**Changes**:
```typescript
async function main() {
  console.log('🎵 Audio Generation System Starting...\n');
  
  // Phase 1: Vocabulary Generation
  console.log('📚 Phase 1: Processing Vocabulary Files...\n');
  const vocabScanner = new VocabScanner();
  const vocabGenerator = new VocabGenerator();
  
  const vocabFiles = await vocabScanner.scanVocabFiles();
  for (const vocabFile of vocabFiles) {
    await vocabGenerator.processVocabFile(vocabFile);
  }
  
  // Phase 2: Lesson Generation (existing code)
  console.log('\n🎓 Phase 2: Processing Lesson Files...\n');
  const lessonScanner = new LessonScanner();
  const lessonGenerator = new LessonGenerator(vocabManager); // Pass vocab manager
  
  // ... existing lesson generation logic
}
```

### 6. Update: `src/types.ts`

**Add new interfaces**:
```typescript
interface VocabEntry {
  text: string;           // Greek text
  status: 'NEW' | 'GENERATED';
}

interface VocabFileInfo {
  filePath: string;       // Full path to vocab file
  languageId: string;
  levelId: string;
  vocabId: string;        // e.g., "vocab1"
  status: 'TODO' | 'DONE';
}

interface VocabManifestEntry {
  text: string;
  filename: string;
  audioPath: string;
  voice: string;
  generatedAt: string;
  source: string;         // Which vocab file or "lesson-generated"
}

interface VocabManifest {
  version: string;
  language: string;
  level: string;
  lastUpdated: string;
  entries: VocabManifestEntry[];
}
```

---

## Benefits

1. **Consistency**: Same word always uses the same audio clip
2. **Quality Control**: Problematic clips can be manually replaced
3. **Efficiency**: Fewer TTS API calls over time
4. **Reusability**: Build a comprehensive audio library per language
5. **Debugging**: Easy to identify which words have issues
6. **Cost Savings**: Significant reduction in API usage

---

## Migration Strategy

1. Implement vocab system (new files)
2. Keep existing lesson generation working
3. Test vocab generation with `vocab1-TODO.txt`
4. Update lesson generator to use vocab library
5. Regenerate existing lessons to benefit from vocab library

---

## Testing Plan

1. **Test vocab generation**:
   - Create `vocab1-TODO.txt` with 5 words
   - Run `npm run generate`
   - Verify audio files created in `vocab-audio/`
   - Verify `vocab-manifest.json` created correctly
   - Verify file renamed to `vocab1-DONE.txt`

2. **Test lesson generation with vocab reuse**:
   - Create a lesson using words from vocab
   - Verify console shows "Reused from vocab library"
   - Verify audio quality is consistent

3. **Test adding new words during lesson generation**:
   - Create a lesson with a new word not in vocab
   - Verify word is added to vocab library
   - Verify manifest is updated

---

## Future Enhancements

1. **Vocab Editor**: Web UI to browse/edit/regenerate vocab audio
2. **Version Control**: Track changes to vocab audio over time
3. **Alternative Pronunciations**: Support multiple audio clips per word
4. **Voice Variants**: Different voices for same word
5. **Phrase Library**: Extend beyond single words to common phrases

