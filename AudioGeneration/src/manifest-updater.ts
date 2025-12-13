import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Manifest, Lesson, Level, Language } from './types.js';
import { getAllLessons } from './lesson-scanner.js';
import { FirebaseStorageService } from './firebase-storage.js';
import { config } from './config.js';

/**
 * Manifest Updater Service
 * Automatically generates and updates manifest.json based on lessons-content structure
 */
export class ManifestUpdater {
  private storageService: FirebaseStorageService;
  private manifestPath: string;

  constructor() {
    this.storageService = new FirebaseStorageService();
    // Manifest should be in project root (one level up from AudioGeneration/)
    // When running from AudioGeneration/, ../manifest.json points to project root
    this.manifestPath = resolve('../manifest.json');
  }

  /**
   * Read existing manifest or create empty one
   */
  private readOrCreateManifest(): Manifest {
    if (existsSync(this.manifestPath)) {
      try {
        const content = readFileSync(this.manifestPath, 'utf-8');
        return JSON.parse(content) as Manifest;
      } catch (error) {
        console.warn('⚠️  Could not parse existing manifest.json, creating new one');
        return { languages: [] };
      }
    }
    
    return { languages: [] };
  }

  /**
   * Generate manifest from lessons-content directory structure
   */
  async generateManifest(): Promise<Manifest> {
    console.log('\n📋 Generating manifest.json...\n');

    // Read existing manifest to preserve any manual customizations
    const existingManifest = this.readOrCreateManifest();
    
    // Get all lessons from lessons-content (both TODO and DONE)
    const allLessons = getAllLessons();
    
    // Build manifest structure from lessons
    const manifest: Manifest = { languages: [] };
    const languageMap = new Map<string, Language>();
    
    for (const lessonFile of allLessons) {
      // Get or create language
      let language = languageMap.get(lessonFile.language);
      if (!language) {
        // Check if language exists in old manifest
        const existingLang = existingManifest.languages.find(
          l => l.id === lessonFile.language
        );
        
        language = {
          id: lessonFile.language,
          name: existingLang?.name || this.capitalize(lessonFile.language),
          levels: [],
        };
        languageMap.set(lessonFile.language, language);
      }
      
      // Get or create level
      let level = language.levels.find(l => l.id === lessonFile.level);
      if (!level) {
        // Check if level exists in old manifest
        const existingLang = existingManifest.languages.find(
          l => l.id === lessonFile.language
        );
        const existingLevel = existingLang?.levels?.find(
          l => l.id === lessonFile.level
        );
        
        level = {
          id: lessonFile.level,
          name: existingLevel?.name || this.formatLevelName(lessonFile.level),
          lessons: [],
        };
        language.levels.push(level);
      }
      
      // Get or create lesson
      let lesson = level.lessons.find(l => l.id === lessonFile.lessonId);
      if (!lesson) {
        // Check if lesson exists in old manifest
        const existingLang = existingManifest.languages.find(
          l => l.id === lessonFile.language
        );
        const existingLevel = existingLang?.levels?.find(
          l => l.id === lessonFile.level
        );
        const existingLesson = existingLevel?.lessons?.find(
          l => l.id === lessonFile.lessonId
        );
        
        // Generate storage path
        const fileName = `${lessonFile.language}-${lessonFile.level}-${lessonFile.lessonId}.${config.tts.format}`;
        const storagePath = `${config.storage.audioLessonsPath}/${fileName}`;
        
        lesson = {
          id: lessonFile.lessonId,
          title: existingLesson?.title || this.formatLessonTitle(lessonFile.lessonId),
          storagePath: existingLesson?.storagePath || storagePath,
        };
        level.lessons.push(lesson);
      } else {
        // Update storage path if lesson was just generated (DONE status)
        if (lessonFile.status === 'DONE') {
          const fileName = `${lessonFile.language}-${lessonFile.level}-${lessonFile.lessonId}.${config.tts.format}`;
          lesson.storagePath = `${config.storage.audioLessonsPath}/${fileName}`;
        }
      }
    }
    
    // Convert map to array and sort
    manifest.languages = Array.from(languageMap.values()).sort((a, b) => 
      a.id.localeCompare(b.id)
    );
    
    // Sort levels and lessons
    for (const language of manifest.languages) {
      language.levels.sort((a, b) => a.id.localeCompare(b.id));
      for (const level of language.levels) {
        level.lessons.sort((a, b) => a.id.localeCompare(b.id));
      }
    }
    
    return manifest;
  }

  /**
   * Save manifest to local file
   */
  async saveManifest(manifest: Manifest): Promise<void> {
    try {
      const jsonContent = JSON.stringify(manifest, null, 2);
      writeFileSync(this.manifestPath, jsonContent, 'utf-8');
      console.log(`✅ Manifest saved to: ${this.manifestPath}`);
    } catch (error) {
      throw new Error(`Failed to save manifest: ${error}`);
    }
  }

  /**
   * Upload manifest to Firebase Storage
   */
  async uploadManifest(): Promise<string> {
    try {
      console.log('\n☁️  Uploading manifest.json to Firebase Storage...');
      
      const storagePath = 'manifest.json';
      const publicUrl = await this.storageService.uploadFile(
        this.manifestPath,
        storagePath,
        'application/json'
      );
      
      console.log(`✅ Manifest uploaded successfully!`);
      console.log(`🔗 Public URL: ${publicUrl}\n`);
      
      return publicUrl;
    } catch (error) {
      throw new Error(`Failed to upload manifest: ${error}`);
    }
  }

  /**
   * Generate, save, and upload manifest
   */
  async updateAndUpload(): Promise<void> {
    const manifest = await this.generateManifest();
    await this.saveManifest(manifest);
    await this.uploadManifest();
  }

  /**
   * Helper: Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Helper: Format level name (e.g., "level1" -> "Level 1")
   */
  private formatLevelName(levelId: string): string {
    const number = levelId.replace('level', '');
    return `Level ${number}`;
  }

  /**
   * Helper: Format lesson title (e.g., "lesson1" -> "Lesson 1")
   */
  private formatLessonTitle(lessonId: string): string {
    const number = lessonId.replace('lesson', '');
    return `Lesson ${number}`;
  }
}

