#!/usr/bin/env node

import { getAllLessons, printLessonsSummary } from './lesson-scanner.js';

/**
 * View the status of all lessons without generating anything
 */
async function viewStatus() {
  console.log('\n📊 Lesson Status Report\n');
  console.log('='.repeat(60) + '\n');

  const lessons = getAllLessons();
  
  if (lessons.length === 0) {
    console.log('No lessons found in lessons-content directory.\n');
    return;
  }

  printLessonsSummary(lessons);

  // Detailed listing
  console.log('📝 Detailed Listing:\n');
  
  const byLanguage = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.language]) {
      acc[lesson.language] = {};
    }
    if (!acc[lesson.language][lesson.level]) {
      acc[lesson.language][lesson.level] = [];
    }
    acc[lesson.language][lesson.level].push(lesson);
    return acc;
  }, {} as Record<string, Record<string, typeof lessons>>);

  for (const [language, levels] of Object.entries(byLanguage)) {
    console.log(`\n${language.toUpperCase()}:`);
    for (const [level, levelLessons] of Object.entries(levels)) {
      console.log(`  ${level}:`);
      levelLessons.forEach(lesson => {
        const icon = lesson.status === 'DONE' ? '✅' : '📝';
        const wordCount = lesson.parsedContent.content.split(/\s+/).length;
        const hasContent = !lesson.parsedContent.content.includes('[Paste your lesson content here');
        const status = hasContent 
          ? `${icon} ${lesson.status}` 
          : '⚠️  TEMPLATE (needs content)';
        
        console.log(`    ${lesson.lessonId}: ${status}${hasContent ? ` (~${wordCount} words)` : ''}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

viewStatus();

