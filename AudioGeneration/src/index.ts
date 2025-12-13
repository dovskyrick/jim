#!/usr/bin/env node

import { validateConfig } from './config.js';
import { LessonGenerator } from './lesson-generator.js';
import { 
  getTodoLessons, 
  getAllLessons, 
  toLessonContent, 
  markLessonAsDone,
  printLessonsSummary 
} from './lesson-scanner.js';

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

  // Scan for lessons
  console.log('🔍 Scanning lessons-content directory...\n');
  const allLessons = getAllLessons();
  const todoLessons = getTodoLessons();
  
  printLessonsSummary(allLessons);

  if (todoLessons.length === 0) {
    console.log('✨ No TODO lessons found! All lessons are up to date.\n');
    console.log('💡 To generate audio for a lesson:');
    console.log('   1. Create a new file: lessons-content/{language}/{level}/lessonX-TODO.txt');
    console.log('   2. Add your lesson content');
    console.log('   3. Run this script again\n');
    return;
  }

  console.log(`🚀 Found ${todoLessons.length} lesson(s) to generate:\n`);
  todoLessons.forEach((lesson, i) => {
    console.log(`   ${i + 1}. ${lesson.language}/${lesson.level}/${lesson.lessonId}`);
  });
  console.log('');

  // Create the lesson generator
  const generator = new LessonGenerator();

  // Process each TODO lesson
  for (let i = 0; i < todoLessons.length; i++) {
    const lessonFile = todoLessons[i];
    
    console.log(`\n[${ i + 1}/${todoLessons.length}] Processing: ${lessonFile.language}/${lessonFile.level}/${lessonFile.lessonId}`);
    
    // Check if file is empty or only whitespace
    const trimmedContent = lessonFile.parsedContent.content.trim();
    if (!trimmedContent || trimmedContent.length === 0) {
      console.log('⚠️  Skipping: File is empty. Please add lesson content.');
      continue;
    }

    try {
      // Convert to LessonContent format
      const lessonContent = toLessonContent(lessonFile);
      
      // Generate audio
      const result = await generator.generateLesson(lessonContent, false);
      
      // Mark as done
      markLessonAsDone(lessonFile);
      
      console.log(`✅ Success! Audio available at: ${result.storagePath}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate lesson:`, error);
      console.log('   Skipping to next lesson...');
    }

    // Small delay between API calls
    if (i < todoLessons.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Batch generation complete!');
  console.log('='.repeat(60) + '\n');
  
  // Show final summary
  const updatedLessons = getAllLessons();
  printLessonsSummary(updatedLessons);

  console.log('💡 Next steps:');
  console.log('   1. Check lessons-audio/ folder for generated MP3 files');
  console.log('   2. Verify audio quality');
  console.log('   3. Update manifest.json with new storage paths');
  console.log('   4. Upload manifest.json to Firebase Storage\n');
}

// Run the main function
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

