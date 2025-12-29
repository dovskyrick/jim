#!/usr/bin/env node

import { validateConfig } from './config.js';
import { LessonGenerator } from './lesson-generator.js';
import { ManifestUpdater } from './manifest-updater.js';
import { VocabScanner } from './vocab-scanner.js';
import { VocabGenerator } from './vocab-generator.js';
import { VocabManager } from './vocab-manager.js';
import { VocabDoctor, RepairResult } from './vocab-repair.js';
import { LessonReconstructor } from './lesson-reconstructor.js';
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

  // ========================================
  // PHASE 1: VOCABULARY GENERATION
  // ========================================
  console.log('📚 PHASE 1: VOCABULARY GENERATION');
  console.log('='.repeat(60) + '\n');

  const vocabScanner = new VocabScanner();
  const vocabGenerator = new VocabGenerator();

  // Scan for vocab files
  console.log('🔍 Scanning for vocabulary files...\n');
  const vocabFiles = await vocabScanner.scanVocabFiles();
  const todoVocabFiles = vocabFiles.filter(f => f.status === 'TODO');

  if (vocabFiles.length === 0) {
    console.log('💡 No vocabulary files found. Skipping Phase 1.\n');
  } else {
    console.log(`📊 Vocab Files Summary:`);
    console.log(`   Total: ${vocabFiles.length}`);
    console.log(`   TODO: ${todoVocabFiles.length}`);
    console.log(`   DONE: ${vocabFiles.filter(f => f.status === 'DONE').length}\n`);

    if (todoVocabFiles.length > 0) {
      console.log(`🚀 Processing ${todoVocabFiles.length} vocabulary file(s):\n`);
      
      // Group vocab files by language/level to load correct manifest
      const vocabByLangLevel = new Map<string, typeof todoVocabFiles>();
      for (const vocabFile of todoVocabFiles) {
        const key = `${vocabFile.languageId}/${vocabFile.levelId}`;
        if (!vocabByLangLevel.has(key)) {
          vocabByLangLevel.set(key, []);
        }
        vocabByLangLevel.get(key)!.push(vocabFile);
      }

      // Process each language/level group
      for (const [langLevel, files] of vocabByLangLevel) {
        const [languageId, levelId] = langLevel.split('/');
        
        console.log(`\n📖 Loading vocab manifest for ${languageId}/${levelId}...`);
        const vocabManager = new VocabManager();
        await vocabManager.loadManifest(languageId, levelId);

        // Process each vocab file
        for (const vocabFile of files) {
          try {
            await vocabGenerator.processVocabFile(vocabFile, vocabManager, vocabScanner);
          } catch (error) {
            console.error(`❌ Failed to process vocab file: ${vocabFile.vocabId}`, error);
          }
        }

        // Save final manifest
        await vocabManager.saveManifest();
      }

      console.log('\n✅ Phase 1 Complete: Vocabulary files processed\n');
    } else {
      console.log('✨ All vocabulary files are up to date!\n');
    }
  }

  // ========================================
  // PHASE 2: LESSON GENERATION
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('🎓 PHASE 2: LESSON GENERATION');
  console.log('='.repeat(60) + '\n');

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
    
    // Still update manifest even if no lessons generated
    if (vocabFiles.length > 0 && todoVocabFiles.length > 0) {
      console.log('📋 Updating manifest.json...\n');
      const manifestUpdater = new ManifestUpdater();
      await manifestUpdater.updateAndUpload();
      console.log('✨ Manifest updated and uploaded to Firebase.\n');
    }
    
    return;
  }

  console.log(`🚀 Found ${todoLessons.length} lesson(s) to generate:\n`);
  todoLessons.forEach((lesson, i) => {
    console.log(`   ${i + 1}. ${lesson.language}/${lesson.level}/${lesson.lessonId}`);
  });
  console.log('');

  // Group lessons by language/level to load correct vocab manager
  const lessonsByLangLevel = new Map<string, typeof todoLessons>();
  for (const lesson of todoLessons) {
    const key = `${lesson.language}/${lesson.level}`;
    if (!lessonsByLangLevel.has(key)) {
      lessonsByLangLevel.set(key, []);
    }
    lessonsByLangLevel.get(key)!.push(lesson);
  }

  // Process each language/level group
  for (const [langLevel, lessons] of lessonsByLangLevel) {
    const [languageId, levelId] = langLevel.split('/');
    
    // Load vocab manager for this language/level
    console.log(`\n📖 Loading vocab library for ${languageId}/${levelId}...`);
    const vocabManager = new VocabManager();
    await vocabManager.loadManifest(languageId, levelId);
    
    // Create lesson generator with vocab manager
    const generator = new LessonGenerator(vocabManager);

    // Process each lesson in this group
    for (let i = 0; i < lessons.length; i++) {
      const lessonFile = lessons[i];
      
      console.log(`\n[${i + 1}/${lessons.length}] Processing: ${lessonFile.language}/${lessonFile.level}/${lessonFile.lessonId}`);
      
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
      if (i < lessons.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Save vocab manifest after processing all lessons in this group
    // (in case new words were added during lesson generation)
    await vocabManager.saveManifest();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Batch generation complete!');
  console.log('='.repeat(60) + '\n');

  // ========================================
  // PHASE 3: VOCABULARY REPAIR
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('🩺 PHASE 3: VOCABULARY REPAIR');
  console.log('='.repeat(60) + '\n');

  const doctor = new VocabDoctor();
  const repairResults = new Map<string, RepairResult>();

  // Get unique language/level combinations from processed lessons
  const processedLangLevels = new Set<string>();
  for (const [langLevel] of lessonsByLangLevel) {
    processedLangLevels.add(langLevel);
  }

  // Also check all vocab files that were processed
  for (const vocabFile of vocabFiles) {
    processedLangLevels.add(`${vocabFile.languageId}/${vocabFile.levelId}`);
  }

  if (processedLangLevels.size > 0) {
    console.log(`🔍 Checking ${processedLangLevels.size} language/level for vocab holes...\n`);

    for (const langLevel of processedLangLevels) {
      const [languageId, levelId] = langLevel.split('/');
      
      console.log(`\n📖 Checking ${languageId}/${levelId}...`);
      const result = await doctor.repairVocabLibrary(languageId, levelId);
      repairResults.set(langLevel, result);

      if (result.holesRepaired > 0) {
        console.log(`   ✅ Repaired ${result.holesRepaired} hole(s)`);
      } else if (result.holesFound > 0) {
        console.log(`   ⚠️  Found ${result.holesFound} hole(s) but failed to repair`);
      } else {
        console.log(`   ✨ No holes found, vocab library is healthy`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Vocab repair complete!');
    console.log('='.repeat(60) + '\n');
  } else {
    console.log('ℹ️  No vocab libraries to check (no lessons or vocab files processed).\n');
  }

  // ========================================
  // PHASE 4: LESSON RECONSTRUCTION
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('🔧 PHASE 4: LESSON RECONSTRUCTION');
  console.log('='.repeat(60) + '\n');

  const reconstructor = new LessonReconstructor();
  let anyLessonsReconstructed = false;

  for (const [langLevel, repairResult] of repairResults) {
    if (repairResult.holesRepaired > 0) {
      const [languageId, levelId] = langLevel.split('/');
      console.log(`\n🔍 Checking ${languageId}/${levelId} for lessons needing reconstruction...\n`);
      
      try {
        await reconstructor.reconstructLessons(repairResult, languageId, levelId);
        anyLessonsReconstructed = true;
      } catch (error) {
        console.error(`❌ Reconstruction failed for ${langLevel}:`, error);
      }
    }
  }

  if (!anyLessonsReconstructed && repairResults.size > 0) {
    console.log('✨ No lessons needed reconstruction.\n');
  }

  // Show final summary
  const updatedLessons = getAllLessons();
  printLessonsSummary(updatedLessons);

  // Automatically update and upload manifest.json
  if (todoLessons.length > 0) {
    try {
      console.log('📋 Updating manifest.json...\n');
      const manifestUpdater = new ManifestUpdater();
      await manifestUpdater.updateAndUpload();
      console.log('✨ All done! Manifest updated and uploaded to Firebase.\n');
    } catch (error) {
      console.error('⚠️  Failed to update manifest:', error);
      console.log('\n💡 You can manually update manifest.json if needed.\n');
    }
  } else {
    console.log('💡 No lessons were generated, manifest not updated.\n');
  }
}

// Run the main function
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

