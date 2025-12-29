/**
 * Types for Lesson Metadata Tracking
 * Used for surgical audio repair and dependency tracking
 */

export interface SegmentInfo {
  index: number;
  startMs: number;
  durationMs: number;
  type: 'silence' | 'vocab' | 'tts';
  text?: string;
  vocabFile?: string;
  normalized?: string;
}

export interface VocabDependency {
  text: string;
  segments: number[];
}

export interface LessonMetadata {
  lessonId: string;
  languageId: string;
  levelId: string;
  audioFile: string;
  totalDurationMs: number;
  generatedAt: string;
  segments: SegmentInfo[];
  vocabDependencies: Record<string, VocabDependency>;
  lastRepairedAt?: string;
  repairedSegments?: number[];
}

export interface SegmentTracker {
  phraseFile: string;
  phraseText: string;
  normalizedText: string;
  source: 'vocab' | 'tts';
  vocabFile?: string;
}

