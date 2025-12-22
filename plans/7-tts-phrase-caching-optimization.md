# TTS Phrase Caching Optimization

## Problem Statement

When generating audio lessons, many phrases repeat multiple times within the same lesson:
- `"Γεια σου..."` might appear 5+ times
- `"Repeat it again."` appears frequently
- Same Greek/French words taught multiple times

**Current Behavior:** Generate new audio via OpenAI TTS API for each occurrence  
**Cost:** 5 occurrences = 5 API calls = 5x cost  
**Time:** 5 occurrences = 5+ seconds of generation time

## Solution: In-Memory Phrase Caching

Cache generated audio within a single lesson generation session and reuse when the same text appears again.

## Implementation Method

### 1. **Data Structure**

```typescript
interface PhraseCacheEntry {
  text: string;           // The exact phrase text
  audioFilePath: string;  // Path to generated MP3
  voice: string;          // Voice used (for cache key)
}

// Cache: Map<cacheKey, audioFilePath>
// cacheKey = `${voice}:${text}`
```

**Why this structure:**
- Key combines voice + text (same text with different voice = different cache entry)
- Value is just the file path (lightweight)
- Map lookup is O(1) - very fast

### 2. **Cache Scope**

**Per-Lesson Cache (Chosen Approach):**
- ✅ Cache exists only during one lesson generation
- ✅ Clears automatically when lesson completes
- ✅ No stale data between lessons
- ✅ No disk persistence needed
- ✅ Simple implementation

**Not Using Global Cache Because:**
- Different lessons might want different pronunciations
- Cache invalidation becomes complex
- Memory concerns for long-running processes
- Not needed - most repetition is within lessons

### 3. **Implementation Flow**

```
For each phrase in lesson:
  │
  ├─► 1. Generate cache key: `${voice}:${phraseText}`
  │
  ├─► 2. Check if key exists in cache
  │     │
  │     ├─► YES: Reuse existing audio file
  │     │         - Log: "Reusing cached audio"
  │     │         - Skip TTS API call
  │     │         - Add cached file path to phraseFiles array
  │     │
  │     └─► NO: Generate new audio
  │               - Call OpenAI TTS API
  │               - Save to unique temp file
  │               - Store in cache: cache.set(key, filePath)
  │               - Add file path to phraseFiles array
  │
  └─► 3. Continue to next phrase
```

### 4. **File Naming Strategy**

**Problem:** If we reuse the same filename, ffmpeg concat might break

**Solution:** Generate audio with unique base filenames, but reuse the file path reference

```typescript
// First occurrence of "Γεια σου..."
phrase-0.mp3 → Generated via TTS
cache["alloy:Γεια σου..."] = "phrase-0.mp3"

// Second occurrence of "Γεια σου..."
Use cached "phrase-0.mp3" → No new file created
phraseFiles.push(cachedPath)

// Third occurrence with different text
phrase-1.mp3 → Generated via TTS (new unique number)
```

### 5. **Cache Key Normalization**

To maximize cache hits, normalize text before creating key:

```typescript
function normalizeText(text: string): string {
  return text
    .trim()                    // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ')      // Normalize multiple spaces to single
    .toLowerCase();            // Case-insensitive (optional)
}

cacheKey = `${voice}:${normalizeText(text)}`
```

**Note:** Case-insensitive caching is optional - might want to keep case sensitivity for proper nouns

### 6. **Logging & Metrics**

Track cache performance:

```typescript
let cacheHits = 0;
let cacheMisses = 0;
let apiCallsSaved = 0;

// After lesson generation:
console.log(`📊 Cache Performance:`);
console.log(`   Cache hits: ${cacheHits}`);
console.log(`   Cache misses: ${cacheMisses}`);
console.log(`   API calls saved: ${apiCallsSaved}`);
console.log(`   Cost savings: ~$${(apiCallsSaved * 0.000015 * avgCharsPerPhrase).toFixed(4)}`);
```

### 7. **Edge Cases Handled**

**Empty/Invalid Phrases:**
- Already filtered out before reaching cache logic
- No cache pollution with invalid entries

**Voice Changes Mid-Lesson:**
- Cache key includes voice
- Different voice = different cache entry
- Correct behavior preserved

**Very Long Lessons:**
- Cache is Map (efficient memory usage)
- Cleared after lesson completes
- No memory leak concerns

**Concurrent Generations:**
- Each lesson generation has its own cache instance
- No race conditions
- Thread-safe by design

## Benefits

### Cost Savings

**Example Lesson:**
- 63 phrases total
- 15 unique phrases
- 48 cache hits

**Without Caching:**
- 63 TTS API calls
- ~3,000 characters average
- Cost: 63 × 3000 × $0.000015 = **$2.835**

**With Caching:**
- 15 TTS API calls (only unique phrases)
- Cost: 15 × 3000 × $0.000015 = **$0.675**
- **Savings: $2.16 (76% reduction!)**

### Time Savings

**Without Caching:**
- 63 phrases × 2 seconds per TTS call = 126 seconds
- Plus 0.5s delay between calls = 31.5s
- **Total: ~157 seconds**

**With Caching:**
- 15 phrases × 2 seconds per TTS call = 30 seconds
- Plus 0.5s delay between 15 calls = 7.5s
- **Total: ~37 seconds**
- **Savings: 120 seconds (76% reduction!)**

### Quality Benefits

- ✅ Identical pronunciation for repeated words (consistency)
- ✅ Better for language learning (same voice, same pronunciation)
- ✅ Faster iteration during lesson development

## Implementation Location

**File:** `src/lesson-generator.ts`  
**Method:** `generateLesson()`  
**Changes:**
1. Add cache Map at start of method
2. Modify phrase loop to check cache before TTS call
3. Add cache metrics logging at end

**Complexity:** ~30 lines of code  
**Risk:** Low (only affects performance, not functionality)

## Testing Strategy

1. **Create test lesson with repeated phrases**
2. **Run generation and verify:**
   - Only unique phrases call TTS API
   - Cache hit/miss counts are accurate
   - Generated audio is correct (listen test)
   - File count matches unique phrases (not total phrases)
3. **Verify cleanup:**
   - Temp files cleaned up properly
   - No orphaned cache entries

## Future Enhancements (Not Implemented Now)

### Persistent Disk Cache
- Cache across lesson generations
- Faster regeneration of existing lessons
- Requires cache invalidation strategy

### Voice Cloning Detection
- Detect when multiple voices sound identical
- Share cache entries across similar voices
- Advanced optimization

### Distributed Cache
- Redis/Memcached for multi-instance deployments
- Share cache across multiple generation servers
- Production-scale optimization

## Conclusion

This optimization provides significant cost and time savings with minimal implementation complexity. The per-lesson cache scope keeps the implementation simple while capturing the majority of benefits, as most phrase repetition occurs within lessons rather than across them.

**Estimated Impact:**
- 🎯 **70-80% reduction in TTS API calls** for typical lessons
- 💰 **70-80% cost savings** per lesson generation
- ⚡ **70-80% faster generation** for lessons with repetition
- ✨ **Better audio consistency** for repeated phrases

