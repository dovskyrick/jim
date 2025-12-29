# 08 - Lesson Metadata & Intelligent Repair System

**Status:** Proposed  
**Priority:** High  
**Date:** December 29, 2025

## Problem Statement

### Current System Limitations

1. **Vocab Repair Doesn't Rebuild Lessons**
   - When `npm run repair-vocab` fixes a silent vocab file, lessons that use that vocab remain broken
   - The repaired audio sits in the vocab library but affected lessons still have the old silent segment
   - No mechanism to identify which lessons are affected

2. **No Timing Information**
   - Lessons are concatenated audio but we have no record of:
     - Where each phrase/word/syllable starts and ends (milliseconds precision)
     - Which source each segment came from (TTS API vs vocab library)
     - Which vocab library files a lesson depends on
   - This makes surgical audio reconstruction impossible

3. **Manual Regeneration Required**
   - After vocab repair, user must:
     - Remember which lessons were generated before the repair
     - Manually rename lesson files from `-DONE` back to `-TODO`
     - Run full regeneration (wastes API calls for unchanged segments)

## Proposed Solution

### Phase 1: Lesson Metadata System

Create a JSON metadata file for each generated lesson that records:

```json
{
  "lessonId": "lesson1",
  "languageId": "greek",
  "levelId": "level1",
  "generatedAt": "2025-12-29T10:30:00.000Z",
  "totalDurationMs": 125430,
  "finalAudioPath": "lessons-audio/greek/level1/lesson1.mp3",
  "segments": [
    {
      "index": 0,
      "type": "silence",
      "startMs": 0,
      "endMs": 3000,
      "durationMs": 3000,
      "source": "generated"
    },
    {
      "index": 1,
      "type": "phrase",
      "text": "Γεια σου",
      "startMs": 3000,
      "endMs": 4250,
      "durationMs": 1250,
      "source": "vocab-library",
      "vocabFile": "vocab-audio/00001.mp3",
      "normalizedText": "Γεια σου"
    },
    {
      "index": 2,
      "type": "silence",
      "startMs": 4250,
      "endMs": 7250,
      "durationMs": 3000,
      "source": "generated"
    },
    {
      "index": 3,
      "type": "phrase",
      "text": "\"Γεια σου...\"",
      "startMs": 7250,
      "endMs": 8900,
      "durationMs": 1650,
      "source": "tts-api",
      "normalizedText": "Γεια σου"
    }
  ],
  "vocabDependencies": [
    {
      "vocabFile": "vocab-audio/00001.mp3",
      "text": "Γεια σου",
      "usedInSegments": [1, 15, 23]
    },
    {
      "vocabFile": "vocab-audio/00005.mp3",
      "text": "Ευχαριστώ",
      "usedInSegments": [8, 42]
    }
  ]
}
```

**Metadata File Location:**  
`lessons-audio/{language}/{level}/{lessonId}.metadata.json`

### Phase 2: Intelligent Lesson Reconstruction

After vocab repair identifies fixed files, automatically:

1. **Scan Lesson Metadata**
   - Read all `.metadata.json` files in the language/level
   - Identify lessons with `vocabDependencies` that match repaired files

2. **Surgical Reconstruction**
   - For each affected lesson:
     - Load the metadata
     - For segments from the repaired vocab file:
       - Copy the newly repaired audio from vocab library
     - For unchanged segments:
       - Extract from the existing lesson audio using precise timestamps
     - Rebuild only the affected portions

3. **Verification**
   - Run silence detection on reconstructed lessons
   - Log what was fixed

### Phase 3: Combined Command with Delay

Create a new workflow command that:

```bash
npm run generate-and-repair
```

**Implementation:**
```json
{
  "scripts": {
    "generate": "tsx src/index.ts",
    "repair-vocab": "tsx src/vocab-repair.ts",
    "reconstruct-lessons": "tsx src/lesson-reconstructor.ts",
    "generate-and-repair": "tsx src/generate-and-repair-workflow.ts"
  }
}
```

**Workflow Steps:**
1. Run vocab generation (Phase 1 from index.ts)
2. **Wait 3 seconds** (let OpenAI TTS settle, prevent empty files)
3. Run lesson generation (Phase 2 from index.ts)
4. **Wait 3 seconds** (give TTS breathing room)
5. Run vocab repair (check for any holes)
6. If holes were found and repaired:
   - **Wait 1 second**
   - Run lesson reconstruction (rebuild affected lessons)
7. Upload updated manifest to Firebase

## Benefits

### For the User
- ✅ **Set It and Forget It**: One command does everything
- ✅ **No Wasted API Calls**: Only regenerate what's actually broken
- ✅ **Automatic Fix**: Repaired vocab automatically updates lessons
- ✅ **Full Traceability**: Know exactly what's in each lesson

### For the System
- ✅ **Precise Reconstruction**: Millisecond-level accuracy
- ✅ **Dependency Tracking**: Know which lessons use which vocab
- ✅ **Partial Rebuild**: Replace only broken segments
- ✅ **Verification**: Automated silence detection after repair

### For Debugging
- ✅ **Audio Timeline**: See exactly when each phrase plays
- ✅ **Source Attribution**: Know if segment came from TTS or vocab
- ✅ **Diff Capability**: Compare metadata between versions

## Implementation Details

### Files to Create/Modify

1. **NEW: `src/lesson-reconstructor.ts`**
   - Reads lesson metadata
   - Identifies lessons using repaired vocab
   - Extracts audio segments using ffmpeg
   - Rebuilds lessons surgically

2. **NEW: `src/generate-and-repair-workflow.ts`**
   - Orchestrates the full workflow
   - Adds timing delays between stages
   - Logs progress clearly

3. **MODIFY: `src/lesson-generator.ts`**
   - Track segment timing during concatenation
   - Record source for each segment
   - Save metadata JSON alongside lesson audio

4. **MODIFY: `src/audio-concatenator.ts`**
   - Return timing information from concatenation
   - Track cumulative duration as segments are added

5. **MODIFY: `src/vocab-repair.ts`**
   - Return list of repaired file paths
   - Export results for lesson reconstructor

### Timing Precision

Use ffmpeg to get exact audio durations:
```typescript
ffmpeg.ffprobe(audioFile, (err, metadata) => {
  const durationMs = metadata.format.duration * 1000;
  // Store in metadata
});
```

Build cumulative timing:
```typescript
let currentPositionMs = 0;

// Starting silence
segments.push({
  startMs: currentPositionMs,
  endMs: currentPositionMs + 3000,
  type: 'silence'
});
currentPositionMs += 3000;

// Each phrase
for (const phrase of phraseFiles) {
  const durationMs = await getAudioDuration(phrase);
  segments.push({
    startMs: currentPositionMs,
    endMs: currentPositionMs + durationMs,
    type: 'phrase',
    // ... other data
  });
  currentPositionMs += durationMs;
  
  // Add pause
  currentPositionMs += pauseDurationMs;
}
```

## Risks & Considerations

### Storage Overhead
- Each lesson gets an additional JSON file (~5-20KB)
- For 100 lessons: ~500KB-2MB (negligible)
- **Acceptable tradeoff for the functionality gained**

### FFmpeg Complexity
- Need precise audio extraction by timestamp
- Command: `ffmpeg -i lesson.mp3 -ss 00:00:03.000 -to 00:00:04.250 -c copy segment.mp3`
- **Already using ffmpeg, just extending usage**

### Race Conditions
- 3-second delays between stages should prevent issues
- Can increase if needed based on testing
- **OpenAI API has rate limits anyway, so delays are good**

## Testing Plan

1. **Generate a lesson with mixed sources** (vocab + TTS)
2. **Verify metadata JSON** is created with correct timing
3. **Manually corrupt a vocab file** (make it silent)
4. **Run vocab repair** to fix it
5. **Verify lesson is automatically reconstructed**
6. **Check that repaired lesson plays correctly**

## Alternative Approaches Considered

### ❌ Full Regeneration
- Simple but wasteful
- Burns API credits unnecessarily
- Slower for large lessons

### ❌ Manual Tracking
- Error-prone
- Requires user to remember dependencies
- Doesn't scale

### ✅ Metadata + Surgical Repair (CHOSEN)
- Efficient
- Automated
- Scalable
- Precise

## Timeline Estimate

- **Phase 1** (Metadata System): 2-3 hours
- **Phase 2** (Reconstruction): 3-4 hours
- **Phase 3** (Workflow Command): 1-2 hours
- **Testing & Polish**: 1-2 hours
- **Total**: ~8-11 hours of development

## Success Metrics

- ✅ Metadata JSON created for every lesson
- ✅ Timing accuracy within ±50ms
- ✅ Lesson reconstruction works without re-calling TTS API
- ✅ Combined workflow command runs smoothly
- ✅ No silent audio in final lessons after repair

---

**Ready to implement?** This system will make the audio generation pipeline truly production-ready and maintainable.

