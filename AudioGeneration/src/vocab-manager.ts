import { VocabManifest, VocabManifestEntry } from './types.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';

/**
 * VocabManager
 * Manages the persistent vocabulary audio library and manifest
 */
export class VocabManager {
  private manifest: VocabManifest | null = null;
  private manifestPath: string = '';
  private vocabAudioDir: string = '';
  private languageId: string = '';
  private levelId: string = '';

  /**
   * Load manifest from disk for a specific language/level
   */
  async loadManifest(languageId: string, levelId: string): Promise<VocabManifest> {
    this.languageId = languageId;
    this.levelId = levelId;
    
    // Construct paths
    const contentDir = resolve('lessons-content', languageId, levelId);
    const vocabTextDir = join(contentDir, 'vocab-text');
    this.vocabAudioDir = join(contentDir, 'vocab-audio');
    this.manifestPath = join(vocabTextDir, 'vocab-manifest.json');

    // Ensure directories exist
    if (!existsSync(vocabTextDir)) {
      mkdirSync(vocabTextDir, { recursive: true });
    }
    if (!existsSync(this.vocabAudioDir)) {
      mkdirSync(this.vocabAudioDir, { recursive: true });
    }

    // Load existing manifest or create new one
    if (existsSync(this.manifestPath)) {
      const manifestData = readFileSync(this.manifestPath, 'utf-8');
      this.manifest = JSON.parse(manifestData);
      console.log(`📖 Loaded vocab manifest: ${this.manifest!.entries.length} entries`);
    } else {
      this.manifest = {
        version: '1.0',
        language: languageId,
        level: levelId,
        lastUpdated: new Date().toISOString(),
        nextFilenameNumber: 1,
        entries: [],
      };
      console.log(`📝 Created new vocab manifest for ${languageId}/${levelId}`);
    }

    return this.manifest;
  }

  /**
   * Save manifest to disk
   */
  async saveManifest(): Promise<void> {
    if (!this.manifest) {
      throw new Error('No manifest loaded. Call loadManifest() first.');
    }

    this.manifest.lastUpdated = new Date().toISOString();
    writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2), 'utf-8');
    console.log(`💾 Saved vocab manifest: ${this.manifest.entries.length} entries`);
  }

  /**
   * Check if a word/phrase exists in the library
   */
  hasAudio(text: string): boolean {
    if (!this.manifest) return false;
    
    const normalizedText = this.normalizeText(text);
    return this.manifest.entries.some(entry => 
      this.normalizeText(entry.text) === normalizedText
    );
  }

  /**
   * Get audio file path for a word/phrase (absolute path)
   */
  getAudioPath(text: string): string | null {
    if (!this.manifest) return null;

    const normalizedText = this.normalizeText(text);
    const entry = this.manifest.entries.find(e => 
      this.normalizeText(e.text) === normalizedText
    );

    if (!entry) return null;

    // Return absolute path to the audio file
    const contentDir = resolve('lessons-content', this.languageId, this.levelId);
    return join(contentDir, entry.audioPath);
  }

  /**
   * Get the filename (e.g., "00001.mp3") for a word/phrase
   */
  getFilename(text: string): string | null {
    if (!this.manifest) return null;

    const normalizedText = this.normalizeText(text);
    const entry = this.manifest.entries.find(e => 
      this.normalizeText(e.text) === normalizedText
    );

    return entry ? entry.filename : null;
  }

  /**
   * Get vocab manifest entry for a word/phrase
   */
  getEntry(text: string): VocabManifestEntry | null {
    if (!this.manifest) return null;

    const normalizedText = this.normalizeText(text);
    return this.manifest.entries.find(e => 
      this.normalizeText(e.text) === normalizedText
    ) || null;
  }

  /**
   * Add new word to library and manifest
   * @param text - The word/phrase text
   * @param audioFilePath - Path to the audio file to copy/move
   * @param voice - TTS voice used
   * @param source - Source identifier (e.g., "vocab1" or "lesson-generated")
   * @returns The filename assigned to this audio
   */
  async addToLibrary(
    text: string,
    audioFilePath: string,
    voice: string,
    source: string
  ): Promise<string> {
    if (!this.manifest) {
      throw new Error('No manifest loaded. Call loadManifest() first.');
    }

    // Check if already exists
    if (this.hasAudio(text)) {
      console.log(`⚠️  Audio for "${text}" already exists in library`);
      return this.getEntry(text)!.filename;
    }

    // Generate next sequential filename
    const filename = this.getNextFilename();
    const destPath = join(this.vocabAudioDir, filename);

    // Copy audio file to vocab library
    const audioBuffer = readFileSync(audioFilePath);
    writeFileSync(destPath, audioBuffer);

    // Add to manifest
    const entry: VocabManifestEntry = {
      text,
      filename,
      audioPath: `vocab-audio/${filename}`,
      voice,
      generatedAt: new Date().toISOString(),
      source,
    };

    this.manifest.entries.push(entry);
    this.manifest.nextFilenameNumber++;

    console.log(`   ✅ Added to vocab library: "${text}" → ${filename}`);

    return filename;
  }

  /**
   * Get the current manifest (read-only)
   */
  getManifest(): VocabManifest | null {
    return this.manifest;
  }

  /**
   * Get all entries in the manifest
   */
  getAllEntries(): VocabManifestEntry[] {
    return this.manifest?.entries || [];
  }

  /**
   * Generate next sequential filename (00001.mp3, 00002.mp3, etc.)
   */
  private getNextFilename(): string {
    if (!this.manifest) {
      throw new Error('No manifest loaded.');
    }

    const number = this.manifest.nextFilenameNumber;
    const paddedNumber = number.toString().padStart(5, '0');
    return `${paddedNumber}.mp3`;
  }

  /**
   * Normalize text for comparison (trim, lowercase, remove extra spaces)
   */
  private normalizeText(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}

