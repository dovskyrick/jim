import OpenAI from 'openai';
import { config } from './config.js';
import { TextToSpeechOptions } from './types.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { TTSRequestTracker } from './tts-request-tracker.js';
import { VocabManager } from './vocab-manager.js';
import { CostTracker } from './cost-tracker.js';

/**
 * OpenAI TTS Service
 * Handles text-to-speech generation using OpenAI's API
 * Automatically tracks requests and caches frequently used phrases
 */
export class OpenAITTSService {
  private client: OpenAI;
  private tracker: TTSRequestTracker | null = null;
  private vocabManager: VocabManager | null = null;
  private costTracker: CostTracker | null = null;
  private currentLanguageId: string = '';
  private currentLevelId: string = '';
  private currentLessonId: string = '';

  constructor(costTracker?: CostTracker) {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.costTracker = costTracker || null;
  }

  /**
   * Initialize tracker and vocab manager for a specific language
   * This should be called before generating audio for a language
   */
  initializeForLanguage(
    languageId: string,
    vocabManager?: VocabManager,
    levelId?: string,
    lessonId?: string
  ): void {
    this.currentLanguageId = languageId;
    this.currentLevelId = levelId || '';
    this.currentLessonId = lessonId || '';
    this.tracker = new TTSRequestTracker();
    this.tracker.loadTracker(languageId);
    this.vocabManager = vocabManager || null;
  }

  /**
   * Generate speech from text using OpenAI's TTS API
   * @param options - Text and voice options
   * @returns Buffer containing the audio data
   * @throws Error if budget limit is exceeded
   */
  async generateSpeech(options: TextToSpeechOptions): Promise<Buffer> {
    const {
      text,
      voice = config.tts.defaultVoice,
      model = config.tts.model,
      speed = config.tts.speed,
    } = options;

    // Check budget before making API call
    if (this.costTracker && !this.costTracker.canAfford(text)) {
      const summary = this.costTracker.getSummary();
      throw new Error(
        `Budget limit exceeded! Cannot generate audio for "${text.substring(0, 50)}...". ` +
        `Current: €${summary.totalSpent.toFixed(4)}, Limit: €${summary.budgetLimit.toFixed(2)}`
      );
    }

    // Track the request if tracker is initialized
    let shouldCache = false;
    if (this.tracker) {
      shouldCache = this.tracker.trackRequest(text, voice);
    }

    console.log(`🎙️  Generating audio with voice: ${voice}, model: ${model}`);
    console.log(`📝 Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    if (this.tracker) {
      const count = this.tracker.getCount(text, voice);
      console.log(`   📊 Request count: ${count}`);
    }
    if (this.costTracker) {
      const cost = this.costTracker.estimateCost(text);
      console.log(`   💰 Estimated cost: €${cost.toFixed(4)}`);
    }

    try {
      const response = await this.client.audio.speech.create({
        model,
        voice,
        input: text,
        speed,
        response_format: config.tts.format,
      });

      // Convert the response to a buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      
      console.log(`✅ Audio generated successfully (${buffer.length} bytes)`);
      
      // Record the cost
      if (this.costTracker) {
        const allowed = this.costTracker.recordRequest(
          text,
          this.currentLanguageId,
          this.currentLevelId || undefined,
          this.currentLessonId || undefined
        );
        if (!allowed) {
          // This shouldn't happen if canAfford() was called, but just in case
          throw new Error('Budget limit exceeded during request recording');
        }
      }
      
      // If this is the 3rd request and we have a vocab manager, cache it
      if (shouldCache && this.vocabManager && this.tracker) {
        try {
          // Normalize text before caching (strip quotes and ellipsis, similar to lesson-generator)
          const normalizedText = text
            .replace(/^[""]/, '')      // Remove leading quote
            .replace(/[""]$/, '')      // Remove trailing quote
            .replace(/\.\.\.$/, '')     // Remove trailing ellipsis
            .trim();

          // Save to a temporary file first
          const tempPath = resolve(config.storage.outputDir, 'temp', `cache-${Date.now()}.${config.tts.format}`);
          const tempDir = dirname(tempPath);
          if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true });
          }
          writeFileSync(tempPath, buffer);
          
          // Add to vocab library (use normalized text)
          await this.vocabManager.addToLibrary(
            normalizedText,
            tempPath,
            voice,
            'auto-cached'
          );
          
          // Mark as cached in tracker
          this.tracker.markAsCached(text, voice);
          
          console.log(`   💾 Auto-cached to vocab library: "${normalizedText.substring(0, 50)}${normalizedText.length > 50 ? '...' : ''}"`);
        } catch (error) {
          console.warn(`   ⚠️  Could not auto-cache audio: ${error}`);
        }
      }
      
      return buffer;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate speech: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate speech and save to a local file
   * @param options - Text and voice options
   * @param outputPath - Where to save the audio file
   * @returns Path to the saved file
   */
  async generateAndSave(options: TextToSpeechOptions, outputPath: string): Promise<string> {
    const audioBuffer = await this.generateSpeech(options);
    
    const fullPath = resolve(outputPath);
    writeFileSync(fullPath, audioBuffer);
    
    console.log(`💾 Audio saved to: ${fullPath}`);
    
    return fullPath;
  }

  /**
   * Get tracker statistics (for debugging/monitoring)
   */
  getTrackerStats() {
    return this.tracker?.getStats() || null;
  }

  /**
   * Test the TTS service with a simple message
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing OpenAI TTS connection...');
      
      const buffer = await this.generateSpeech({
        text: 'Hello! This is a test of the OpenAI text to speech API.',
        voice: 'alloy',
      });
      
      if (buffer.length > 0) {
        console.log('✅ OpenAI TTS connection successful!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ OpenAI TTS connection failed:', error);
      return false;
    }
  }
}

