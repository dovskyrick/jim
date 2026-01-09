import { OpenAITTSService } from './openai-tts.js';
import { FirebaseStorageService } from './firebase-storage.js';
import { AudioConcatenator } from './audio-concatenator.js';
import { VocabManager } from './vocab-manager.js';
import { LessonContent, GeneratedAudio, Manifest } from './types.js';
import { config } from './config.js';
import { mkdirSync, existsSync, unlinkSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { LessonMetadata, SegmentInfo, VocabDependency, SegmentTracker } from './lesson-metadata-types.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

// Set ffmpeg and ffprobe paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
if (ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

/**
 * Lesson Generator
 * Orchestrates the generation of audio lessons from text
 */
export class LessonGenerator {
  private ttsService: OpenAITTSService;
  private storageService: FirebaseStorageService;
  private concatenator: AudioConcatenator;
  private outputDir: string;
  private vocabManager: VocabManager | null;

  constructor(vocabManager?: VocabManager, costTracker?: import('./cost-tracker.js').CostTracker) {
    this.ttsService = new OpenAITTSService(costTracker);
    this.storageService = new FirebaseStorageService();
    this.concatenator = new AudioConcatenator();
    this.outputDir = resolve(config.storage.outputDir);
    this.vocabManager = vocabManager || null;

    // Create output directory if it doesn't exist
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  /**
   * Initialize TTS service for a specific language
   * This enables request tracking and auto-caching
   */
  initializeForLanguage(languageId: string, levelId?: string, lessonId?: string): void {
    this.ttsService.initializeForLanguage(
      languageId,
      this.vocabManager || undefined,
      levelId,
      lessonId
    );
  }

  /**
   * Generate a single audio lesson
   * @param content - Lesson content including text and metadata
   * @param keepLocalFile - Whether to keep the local file after upload (default: false)
   * @returns Generated audio information
   */
  async generateLesson(
    content: LessonContent,
    keepLocalFile: boolean = false
  ): Promise<GeneratedAudio> {
    console.log('\n' + '='.repeat(60));
    console.log(`🎓 Generating Lesson: ${content.lessonTitle}`);
    console.log(`   Language: ${content.languageName} (${content.languageId})`);
    console.log(`   Level: ${content.levelName} (${content.levelId})`);
    console.log('='.repeat(60) + '\n');

    // Initialize TTS service for this language (enables request tracking)
    this.ttsService.initializeForLanguage(
      content.languageId,
      this.vocabManager || undefined,
      content.levelId,
      content.lessonId
    );

    // Step 1: Parse text into phrases and extract pause durations
    const { phrases, pauseDurations } = this.concatenator.parsePhrases(content.text);
    console.log(`📝 Parsed ${phrases.length} phrases with ${pauseDurations.length} pauses`);
    console.log(`   Pause durations: ${pauseDurations.map(d => `${d}s`).join(', ')}`);

    // Step 2: Generate audio for each phrase (with vocab library and caching)
    const phraseFiles: string[] = [];
    const phraseCache = new Map<string, string>(); // Cache: "voice:text" -> filePath
    const segmentTrackers: SegmentTracker[] = []; // Track source of each phrase for metadata
    let cacheHits = 0;
    let vocabHits = 0;
    let cacheMisses = 0;
    
    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i].trim();
      
      // Skip empty phrases or phrases with only punctuation/whitespace
      if (!phrase || phrase.length === 0 || /^[\s\.\!\?\,\;\:]*$/.test(phrase)) {
        console.log(`\n   [${i + 1}/${phrases.length}] Skipping empty phrase`);
        continue;
      }
      
      // Generate cache key (voice + normalized text)
      const normalizedText = phrase.trim().replace(/\s+/g, ' ');
      const cacheKey = `${content.voice || config.tts.defaultVoice}:${normalizedText}`;
      
      // Check if this is a trainee answer (has quotes at start and end)
      // Only trainee answers should be stored in vocab library
      const isTraineeAnswer = /^[""]/.test(normalizedText) && /[""]$/.test(normalizedText);
      
      // For vocab library lookup, strip formatting (quotes and ellipsis)
      // This allows matching "Γεια σου..." with the stored "Γεια σου"
      const strippedText = normalizedText
        .replace(/^[""]/, '')      // Remove leading quote
        .replace(/[""]$/, '')      // Remove trailing quote
        .replace(/\.\.\.$/,'')     // Remove trailing ellipsis
        .trim();
      
      // Priority 1: Check in-memory cache (fastest)
      const cachedPath = phraseCache.get(cacheKey);
      
      if (cachedPath) {
        // Cache hit! Reuse existing audio (need to track each usage)
        console.log(`\n   [${i + 1}/${phrases.length}] ♻️  Session cache: "${phrase.substring(0, 50)}${phrase.length > 50 ? '...' : ''}"`);
        phraseFiles.push(cachedPath);
        
        // Track this segment (source was determined when first cached)
        segmentTrackers.push({
          phraseFile: cachedPath,
          phraseText: phrase,
          normalizedText: strippedText,
          source: 'tts', // Assume TTS for cached items (could be improved)
        });
        
        cacheHits++;
        continue;
      }
      
      // Priority 2: Check vocab library (if available)
      // Only check for trainee answers (those with quotes)
      if (isTraineeAnswer && this.vocabManager && this.vocabManager.hasAudio(strippedText)) {
        const vocabAudioPath = this.vocabManager.getAudioPath(strippedText);
        
        if (vocabAudioPath && existsSync(vocabAudioPath)) {
          // Copy from vocab library to temp
          const tempCopyFileName = `phrase-${phraseCache.size}.${config.tts.format}`;
          const tempCopyPath = join(this.outputDir, 'temp', tempCopyFileName);
          
          // Ensure temp directory exists
          const tempDir = join(this.outputDir, 'temp');
          if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true });
          }
          
          copyFileSync(vocabAudioPath, tempCopyPath);
          
          console.log(`\n   [${i + 1}/${phrases.length}] 📚 Vocab library: "${strippedText}"`);
          
          phraseCache.set(cacheKey, tempCopyPath);
          phraseFiles.push(tempCopyPath);
          
          // Track this vocab segment
          const vocabFilename = this.vocabManager.getFilename(strippedText);
          segmentTrackers.push({
            phraseFile: tempCopyPath,
            phraseText: phrase,
            normalizedText: strippedText,
            source: 'vocab',
            vocabFile: vocabFilename || undefined,
          });
          
          vocabHits++;
          continue;
        }
      }
      
      // Priority 3: Generate new audio via TTS
      console.log(`\n   [${i + 1}/${phrases.length}] 🎙️  Generating: "${phrase.substring(0, 50)}${phrase.length > 50 ? '...' : ''}"`);
      
      const phraseFileName = `phrase-${phraseCache.size}.${config.tts.format}`;
      const phraseFilePath = join(this.outputDir, 'temp', phraseFileName);
      
      // Ensure temp directory exists
      const tempDir = join(this.outputDir, 'temp');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
      
      await this.ttsService.generateAndSave(
        {
          text: phrase,
          voice: content.voice,
        },
        phraseFilePath
      );
      
      // Add to vocab library for future use (if manager is available)
      // Only add trainee answers (those with quotes) to vocab library
      if (isTraineeAnswer && this.vocabManager) {
        try {
          await this.vocabManager.addToLibrary(
            strippedText,
            phraseFilePath,
            content.voice || config.tts.defaultVoice,
            'lesson-generated'
          );
        } catch (error) {
          console.warn(`   ⚠️  Could not add to vocab library: ${error}`);
        }
      }
      
      // Store in cache for future reuse within this lesson
      phraseCache.set(cacheKey, phraseFilePath);
      phraseFiles.push(phraseFilePath);
      
      // Track this TTS segment
      segmentTrackers.push({
        phraseFile: phraseFilePath,
        phraseText: phrase,
        normalizedText: strippedText,
        source: 'tts',
      });
      
      cacheMisses++;
      
      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Log cache performance
    console.log(`\n📊 Performance Summary:`);
    console.log(`   Total phrases: ${phrases.length}`);
    console.log(`   Unique phrases: ${phraseCache.size}`);
    console.log(`   Session cache hits: ${cacheHits}`);
    console.log(`   Vocab library hits: ${vocabHits}`);
    console.log(`   TTS API calls: ${cacheMisses}`);
    const totalReused = cacheHits + vocabHits;
    console.log(`   Savings: ${totalReused > 0 ? Math.round((totalReused / phrases.length) * 100) : 0}% fewer API calls`);

    // Step 3: Concatenate with variable silences based on parsed durations
    const fileName = `${content.languageId}-${content.levelId}-${content.lessonId}.${config.tts.format}`;
    const localPath = join(this.outputDir, fileName);
    
    console.log(`\n🎼 Concatenating ${phraseFiles.length} phrases with variable silences...`);
    await this.concatenator.concatenateWithSilence(
      phraseFiles,
      localPath,
      pauseDurations,  // Use extracted pause durations
      true  // Add silence at beginning and end
    );

    // Step 3.5: Build and save metadata JSON
    console.log(`\n💾 Building lesson metadata...`);
    const metadata = await this.buildMetadata(
      content,
      phraseFiles,
      segmentTrackers,
      pauseDurations,
      fileName
    );
    
    // Save metadata to lessons-audio directory (final destination)
    const contentDir = resolve('lessons-content', content.languageId, content.levelId);
    const audioDir = resolve('lessons-audio', content.languageId, content.levelId);
    
    // Ensure audio directory exists
    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true });
    }
    
    const metadataPath = join(audioDir, `${content.lessonId}.metadata.json`);
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`   ✅ Metadata saved: ${metadataPath}`);
    console.log(`   📊 Total segments: ${metadata.segments.length}`);
    console.log(`   ⏱️  Total duration: ${(metadata.totalDurationMs / 1000).toFixed(1)}s`);
    console.log(`   📚 Vocab dependencies: ${Object.keys(metadata.vocabDependencies).length}`);

    // Step 4: Clean up temporary phrase files (only unique ones)
    const uniqueFiles = Array.from(new Set(phraseFiles));
    this.concatenator.cleanupPhraseFiles(uniqueFiles);

    // Step 5: Upload to Firebase Storage
    const storagePath = `${config.storage.audioLessonsPath}/${fileName}`;
    const firebaseUrl = await this.storageService.uploadAudio(localPath, storagePath);

    // Step 6: Clean up local file if requested
    if (!keepLocalFile) {
      try {
        unlinkSync(localPath);
        console.log(`🗑️  Cleaned up local file: ${localPath}`);
      } catch (error) {
        console.warn(`⚠️  Could not delete local file: ${localPath}`);
      }
    }

    const result: GeneratedAudio = {
      localPath: keepLocalFile ? localPath : '',
      storagePath,
      firebaseUrl,
      metadata: {
        languageId: content.languageId,
        levelId: content.levelId,
        lessonId: content.lessonId,
        title: content.lessonTitle,
        text: content.text,
        voice: content.voice || config.tts.defaultVoice,
        model: config.tts.model,
        generatedAt: new Date().toISOString(),
      },
    };

    console.log('\n✨ Lesson generation complete!\n');

    return result;
  }

  /**
   * Get audio file duration in milliseconds using ffprobe
   * @param filePath - Path to audio file
   * @returns Duration in milliseconds
   */
  private async getAudioDurationMs(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const durationSec = metadata.format.duration || 0;
          resolve(Math.round(durationSec * 1000));
        }
      });
    });
  }

  /**
   * Build comprehensive metadata for the lesson
   * Calculates precise timing for each segment
   */
  private async buildMetadata(
    content: LessonContent,
    phraseFiles: string[],
    segmentTrackers: SegmentTracker[],
    pauseDurations: number[],
    fileName: string
  ): Promise<LessonMetadata> {
    const segments: SegmentInfo[] = [];
    const vocabDeps: Record<string, VocabDependency> = {};
    let currentTimeMs = 0;

    // Starting silence (3 seconds by default, or first pause duration)
    const startingSilenceMs = (pauseDurations[0] || 3) * 1000;
    segments.push({
      index: 0,
      startMs: 0,
      durationMs: startingSilenceMs,
      type: 'silence',
    });
    currentTimeMs = startingSilenceMs;

    // Process each phrase
    for (let i = 0; i < phraseFiles.length; i++) {
      const phraseFile = phraseFiles[i];
      const tracker = segmentTrackers[i];

      // Get actual audio duration
      const phraseDurationMs = await this.getAudioDurationMs(phraseFile);

      // Create segment
      const segment: SegmentInfo = {
        index: segments.length,
        startMs: currentTimeMs,
        durationMs: phraseDurationMs,
        type: tracker.source,
        text: tracker.phraseText,
        normalized: tracker.normalizedText,
      };

      // Add vocab file reference if from vocab library
      if (tracker.source === 'vocab' && tracker.vocabFile) {
        segment.vocabFile = `vocab-audio/${tracker.vocabFile}`;

        // Track vocab dependency
        const vocabKey = segment.vocabFile;
        if (!vocabDeps[vocabKey]) {
          vocabDeps[vocabKey] = {
            text: tracker.normalizedText,
            segments: [],
          };
        }
        vocabDeps[vocabKey].segments.push(segment.index);
      }

      segments.push(segment);
      currentTimeMs += phraseDurationMs;

      // Add pause after this phrase
      const pauseMs = (pauseDurations[i] || 3) * 1000;
      segments.push({
        index: segments.length,
        startMs: currentTimeMs,
        durationMs: pauseMs,
        type: 'silence',
      });
      currentTimeMs += pauseMs;
    }

    return {
      lessonId: content.lessonId,
      languageId: content.languageId,
      levelId: content.levelId,
      audioFile: fileName,
      totalDurationMs: currentTimeMs,
      generatedAt: new Date().toISOString(),
      segments,
      vocabDependencies: vocabDeps,
    };
  }

  /**
   * Generate multiple lessons in batch
   * @param contents - Array of lesson contents
   * @param keepLocalFiles - Whether to keep local files after upload
   * @returns Array of generated audio information
   */
  async generateBatch(
    contents: LessonContent[],
    keepLocalFiles: boolean = false
  ): Promise<GeneratedAudio[]> {
    console.log(`\n📚 Starting batch generation of ${contents.length} lessons...\n`);

    const results: GeneratedAudio[] = [];

    for (let i = 0; i < contents.length; i++) {
      console.log(`\n[${i + 1}/${contents.length}]`);
      
      try {
        const result = await this.generateLesson(contents[i], keepLocalFiles);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to generate lesson ${i + 1}:`, error);
        // Continue with next lesson
      }

      // Small delay between API calls to avoid rate limiting
      if (i < contents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Batch generation complete!`);
    console.log(`   Generated: ${results.length}/${contents.length} lessons`);
    console.log('='.repeat(60) + '\n');

    return results;
  }

  /**
   * Update the manifest with new storage paths
   * This is a helper to show what the manifest should look like
   */
  generateManifestUpdate(results: GeneratedAudio[]): Partial<Manifest> {
    // Group results by language and level
    const grouped = new Map<string, Map<string, GeneratedAudio[]>>();

    for (const result of results) {
      if (!grouped.has(result.metadata.languageId)) {
        grouped.set(result.metadata.languageId, new Map());
      }
      const languageMap = grouped.get(result.metadata.languageId)!;
      
      if (!languageMap.has(result.metadata.levelId)) {
        languageMap.set(result.metadata.levelId, []);
      }
      languageMap.get(result.metadata.levelId)!.push(result);
    }

    console.log('\n📝 Manifest Storage Paths:\n');
    console.log('Copy these paths to your manifest.json:\n');

    for (const [langId, levels] of grouped) {
      console.log(`Language: ${langId}`);
      for (const [levelId, lessons] of levels) {
        console.log(`  Level: ${levelId}`);
        for (const lesson of lessons) {
          console.log(`    ${lesson.metadata.lessonId}: "${lesson.storagePath}"`);
        }
      }
      console.log('');
    }

    return {};
  }
}

