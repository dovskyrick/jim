import { readFileSync, writeFileSync, readdirSync, statSync, renameSync } from 'fs';
import { join, parse, dirname, basename } from 'path';
import { LessonContent } from './types.js';

/**
 * Parse YAML frontmatter from lesson file
 * Format:
 * ---
 * voice: alloy
 * speed: 1.0
 * ---
 * Lesson content here...
 */
interface LessonMetadata {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

interface ParsedLesson {
  metadata: LessonMetadata;
  content: string;
}

function parseLessonFile(filePath: string): ParsedLesson {
  const content = readFileSync(filePath, 'utf-8');
  
  // Check for YAML frontmatter
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (match) {
    const [, frontmatter, lessonContent] = match;
    const metadata: LessonMetadata = {};
    
    // Parse simple YAML (key: value pairs)
    const lines = frontmatter.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        const trimmedKey = key.trim();
        
        if (trimmedKey === 'voice') {
          metadata.voice = value as any;
        } else if (trimmedKey === 'speed') {
          metadata.speed = parseFloat(value);
        }
      }
    }
    
    return {
      metadata,
      content: lessonContent.trim(),
    };
  }
  
  // No frontmatter, return plain content
  return {
    metadata: {},
    content: content.trim(),
  };
}

/**
 * Scan lessons-content directory for TODO files
 */
interface LessonFile {
  filePath: string;
  language: string;
  level: string;
  lessonId: string;
  status: 'TODO' | 'DONE';
  parsedContent: ParsedLesson;
}

export function scanLessonsDirectory(contentDir: string = './lessons-content'): LessonFile[] {
  const lessons: LessonFile[] = [];
  
  // Walk through directory structure
  const languages = readdirSync(contentDir).filter(item => {
    const path = join(contentDir, item);
    return statSync(path).isDirectory();
  });
  
  for (const language of languages) {
    const languagePath = join(contentDir, language);
    const levels = readdirSync(languagePath).filter(item => {
      const path = join(languagePath, item);
      return statSync(path).isDirectory();
    });
    
    for (const level of levels) {
      const levelPath = join(languagePath, level);
      const files = readdirSync(levelPath).filter(file => 
        file.endsWith('-TODO.txt') || file.endsWith('-DONE.txt')
      );
      
      for (const file of files) {
        const filePath = join(levelPath, file);
        const parsed = parse(file);
        
        // Extract status from filename
        const status = file.endsWith('-TODO.txt') ? 'TODO' : 'DONE';
        
        // Extract lesson ID (e.g., "lesson1-TODO.txt" -> "lesson1")
        const lessonId = basename(file, status === 'TODO' ? '-TODO.txt' : '-DONE.txt');
        
        try {
          const parsedContent = parseLessonFile(filePath);
          
          lessons.push({
            filePath,
            language,
            level,
            lessonId,
            status,
            parsedContent,
          });
        } catch (error) {
          console.error(`⚠️  Failed to parse ${filePath}:`, error);
        }
      }
    }
  }
  
  return lessons;
}

/**
 * Get only TODO lessons (pending audio generation)
 */
export function getTodoLessons(contentDir: string = './lessons-content'): LessonFile[] {
  const allLessons = scanLessonsDirectory(contentDir);
  return allLessons.filter(lesson => lesson.status === 'TODO');
}

/**
 * Get all lessons (including DONE)
 */
export function getAllLessons(contentDir: string = './lessons-content'): LessonFile[] {
  return scanLessonsDirectory(contentDir);
}

/**
 * Convert LessonFile to LessonContent for generation
 */
export function toLessonContent(lessonFile: LessonFile): LessonContent {
  // Capitalize language name
  const languageName = lessonFile.language.charAt(0).toUpperCase() + 
                       lessonFile.language.slice(1);
  
  // Format level name
  const levelNumber = lessonFile.level.replace('level', '');
  const levelName = `Level ${levelNumber}`;
  
  // Format lesson title
  const lessonNumber = lessonFile.lessonId.replace('lesson', '');
  const lessonTitle = `Lesson ${lessonNumber}`;
  
  return {
    languageId: lessonFile.language,
    languageName,
    levelId: lessonFile.level,
    levelName,
    lessonId: lessonFile.lessonId,
    lessonTitle,
    text: lessonFile.parsedContent.content,
    voice: lessonFile.parsedContent.metadata.voice,
  };
}

/**
 * Mark a lesson as DONE by renaming the file
 */
export function markLessonAsDone(lessonFile: LessonFile): void {
  if (lessonFile.status === 'DONE') {
    console.log(`⚠️  ${lessonFile.filePath} is already marked as DONE`);
    return;
  }
  
  const oldPath = lessonFile.filePath;
  const newPath = oldPath.replace('-TODO.txt', '-DONE.txt');
  
  try {
    renameSync(oldPath, newPath);
    console.log(`✅ Marked as DONE: ${basename(newPath)}`);
    lessonFile.status = 'DONE';
    lessonFile.filePath = newPath;
  } catch (error) {
    console.error(`❌ Failed to rename ${oldPath}:`, error);
  }
}

/**
 * Mark a lesson as TODO (for regeneration)
 */
export function markLessonAsTodo(lessonFile: LessonFile): void {
  if (lessonFile.status === 'TODO') {
    console.log(`⚠️  ${lessonFile.filePath} is already marked as TODO`);
    return;
  }
  
  const oldPath = lessonFile.filePath;
  const newPath = oldPath.replace('-DONE.txt', '-TODO.txt');
  
  try {
    renameSync(oldPath, newPath);
    console.log(`🔄 Marked as TODO: ${basename(newPath)}`);
    lessonFile.status = 'TODO';
    lessonFile.filePath = newPath;
  } catch (error) {
    console.error(`❌ Failed to rename ${oldPath}:`, error);
  }
}

/**
 * Print summary of lessons
 */
export function printLessonsSummary(lessons: LessonFile[]): void {
  const todoCount = lessons.filter(l => l.status === 'TODO').length;
  const doneCount = lessons.filter(l => l.status === 'DONE').length;
  
  console.log('\n📚 Lessons Summary:');
  console.log(`   Total: ${lessons.length} lessons`);
  console.log(`   ✅ DONE: ${doneCount}`);
  console.log(`   📝 TODO: ${todoCount}\n`);
  
  // Group by language
  const byLanguage = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.language]) {
      acc[lesson.language] = { TODO: 0, DONE: 0 };
    }
    acc[lesson.language][lesson.status]++;
    return acc;
  }, {} as Record<string, Record<'TODO' | 'DONE', number>>);
  
  console.log('By Language:');
  for (const [lang, counts] of Object.entries(byLanguage)) {
    console.log(`   ${lang}: ${counts.TODO} TODO, ${counts.DONE} DONE`);
  }
  console.log('');
}

