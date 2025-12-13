#!/usr/bin/env node

import { validateConfig } from './config.js';
import { LessonGenerator } from './lesson-generator.js';
import { exampleLessons, customLesson } from './examples.js';
import { LessonContent } from './types.js';

/**
 * Main entry point for the audio generation system
 */
async function main() {
  console.log('\n' + '🎵'.repeat(30));
  console.log('   TTS Audio Lesson Generator');
  console.log('   Powered by OpenAI TTS');
  console.log('🎵'.repeat(30) + '\n');

  // Validate configuration
  validateConfig();

  // Create the lesson generator
  const generator = new LessonGenerator();

  // ========================================
  // CHOOSE YOUR GENERATION MODE:
  // ========================================

  // MODE 1: Generate a single lesson
  console.log('📝 Mode: Single Lesson Generation\n');
  
  const singleLesson: LessonContent = {
    languageId: 'english',
    languageName: 'English',
    levelId: 'level1',
    levelName: 'Level 1',
    lessonId: 'lesson1',
    lessonTitle: 'Lesson 1: Introduction',
    text: 'Hello! Welcome to your first English lesson. Today we will learn basic greetings. Good morning, good afternoon, and good evening are common ways to greet people throughout the day.',
    voice: 'alloy',
  };

  const result = await generator.generateLesson(singleLesson, false);
  
  console.log('\n📋 Result:');
  console.log(`   Firebase URL: ${result.firebaseUrl}`);
  console.log(`   Storage Path: ${result.storagePath}`);

  // ========================================
  // MODE 2: Generate multiple lessons (uncomment to use)
  // ========================================
  
  /*
  console.log('📝 Mode: Batch Generation\n');
  
  const results = await generator.generateBatch(exampleLessons, false);
  
  // Show the storage paths for updating manifest.json
  generator.generateManifestUpdate(results);
  */

  // ========================================
  // MODE 3: Generate from your own lesson data (uncomment to use)
  // ========================================
  
  /*
  // Define your lessons here
  const myLessons: LessonContent[] = [
    {
      languageId: 'french',
      languageName: 'French',
      levelId: 'level1',
      levelName: 'Niveau 1',
      lessonId: 'lesson1',
      lessonTitle: 'Leçon 1: Introduction',
      text: 'Bonjour! Bienvenue à votre première leçon de français...',
      voice: 'shimmer',
    },
    // Add more lessons...
  ];

  const results = await generator.generateBatch(myLessons, false);
  generator.generateManifestUpdate(results);
  */

  console.log('\n✅ All done!\n');
}

// Run the main function
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

