import { OpenAITTSService } from './openai-tts.js';
import { FirebaseStorageService } from './firebase-storage.js';
import { AudioConcatenator } from './audio-concatenator.js';
import { LessonContent, GeneratedAudio, Manifest } from './types.js';
import { config } from './config.js';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Lesson Generator
 * Orchestrates the generation of audio lessons from text
 */
export class LessonGenerator {
  private ttsService: OpenAITTSService;
  private storageService: FirebaseStorageService;
  private concatenator: AudioConcatenator;
  private outputDir: string;

  constructor() {
    this.ttsService = new OpenAITTSService();
    this.storageService = new FirebaseStorageService();
    this.concatenator = new AudioConcatenator();
    this.outputDir = resolve(config.storage.outputDir);

    // Create output directory if it doesn't exist
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
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

    // Step 1: Parse text into phrases (split by pause markers)
    const phrases = this.concatenator.parsePhrases(content.text);
    console.log(`📝 Parsed ${phrases.length} phrases from lesson text`);

    // Step 2: Generate audio for each phrase
    const phraseFiles: string[] = [];
    
    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      console.log(`\n   [${i + 1}/${phrases.length}] Generating: "${phrase.substring(0, 50)}${phrase.length > 50 ? '...' : ''}"`);
      
      const phraseFileName = `phrase-${i}.${config.tts.format}`;
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
      
      phraseFiles.push(phraseFilePath);
      
      // Small delay between API calls to avoid rate limiting
      if (i < phrases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 3: Concatenate with 3-second silences
    const fileName = `${content.languageId}-${content.levelId}-${content.lessonId}.${config.tts.format}`;
    const localPath = join(this.outputDir, fileName);
    
    console.log(`\n🎼 Concatenating ${phraseFiles.length} phrases with 3s silences...`);
    await this.concatenator.concatenateWithSilence(
      phraseFiles,
      localPath,
      3,  // 3 seconds of silence
      true  // Add silence at beginning and end
    );

    // Step 4: Clean up temporary phrase files
    this.concatenator.cleanupPhraseFiles(phraseFiles);

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

