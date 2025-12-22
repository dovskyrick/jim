import { VocabManager } from './vocab-manager.js';
import { OpenAITTSService } from './openai-tts.js';
import { VocabEntry, VocabFileInfo } from './types.js';
import { VocabScanner } from './vocab-scanner.js';
import { config } from './config.js';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';

/**
 * VocabGenerator
 * Generates audio for vocabulary entries and manages the vocab library
 */
export class VocabGenerator {
  private ttsService: OpenAITTSService;
  private tempDir: string;

  constructor() {
    this.ttsService = new OpenAITTSService();
    this.tempDir = resolve('lessons-audio', 'vocab-temp');
    
    // Ensure temp directory exists
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate audio for a single vocab entry
   */
  async generateVocabAudio(
    entry: VocabEntry,
    vocabManager: VocabManager,
    voice: string = config.tts.defaultVoice,
    source: string
  ): Promise<void> {
    // Check if already in library
    if (vocabManager.hasAudio(entry.text)) {
      console.log(`   ♻️  Already in library: "${entry.text}"`);
      entry.status = 'GENERATED';
      return;
    }

    // Generate temporary audio file
    const tempFileName = `temp-${Date.now()}.${config.tts.format}`;
    const tempFilePath = join(this.tempDir, tempFileName);

    try {
      // Format the text for TTS: add quotes and ellipsis for better pronunciation
      // This prevents truncation and ensures full expression
      const formattedText = `"${entry.text}..."`;
      
      console.log(`   🎤 Generating: "${entry.text}" → ${formattedText}`);
      
      await this.ttsService.generateAndSave(
        {
          text: formattedText,
          voice: voice as any,
        },
        tempFilePath
      );

      // Add to vocab library
      await vocabManager.addToLibrary(entry.text, tempFilePath, voice, source);
      
      // Update status
      entry.status = 'GENERATED';

      // Clean up temp file
      if (existsSync(tempFilePath)) {
        unlinkSync(tempFilePath);
      }
    } catch (error) {
      console.error(`   ❌ Failed to generate audio for "${entry.text}":`, error);
      throw error;
    }
  }

  /**
   * Process an entire vocab file
   */
  async processVocabFile(
    fileInfo: VocabFileInfo,
    vocabManager: VocabManager,
    vocabScanner: VocabScanner
  ): Promise<void> {
    console.log(`\n📚 Processing vocab file: ${fileInfo.vocabId}`);
    console.log(`   Language: ${fileInfo.languageId}, Level: ${fileInfo.levelId}`);
    console.log(`   Status: ${fileInfo.status}`);

    // Parse vocab file
    const entries = vocabScanner.parseVocabFile(fileInfo.filePath);
    console.log(`   Found ${entries.length} vocabulary entries\n`);

    if (entries.length === 0) {
      console.log(`   ⚠️  No entries found in vocab file\n`);
      return;
    }

    // Filter entries that need generation
    const newEntries = entries.filter(e => e.status === 'NEW');
    const generatedCount = entries.length - newEntries.length;

    if (newEntries.length === 0) {
      console.log(`   ✅ All ${entries.length} entries already generated\n`);
      return;
    }

    console.log(`   📊 Status: ${generatedCount} already generated, ${newEntries.length} to generate\n`);

    // Get voice from YAML frontmatter or use default
    // For now, just use default voice
    const voice = config.tts.defaultVoice;

    // Generate audio for each new entry
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < newEntries.length; i++) {
      const entry = newEntries[i];
      console.log(`   [${i + 1}/${newEntries.length}]`);
      
      try {
        await this.generateVocabAudio(entry, vocabManager, voice, fileInfo.vocabId);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error processing entry: ${entry.text}`);
      }
    }

    // Save manifest after all entries are processed
    await vocabManager.saveManifest();

    // Update status markers in the vocab file
    vocabScanner.updateVocabFileStatus(fileInfo.filePath, entries);

    // Mark file as complete if it was TODO
    if (fileInfo.status === 'TODO') {
      vocabScanner.markVocabFileComplete(fileInfo.filePath);
    }

    console.log(`\n   ✨ Vocab file processing complete!`);
    console.log(`   Success: ${successCount}, Errors: ${errorCount}\n`);
  }

  /**
   * Clean up temporary files
   */
  cleanup(): void {
    // Clean up temp directory if needed
    if (existsSync(this.tempDir)) {
      // Could implement cleanup logic here
    }
  }
}

