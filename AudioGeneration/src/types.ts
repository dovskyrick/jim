/**
 * Type definitions for the audio generation system
 */

export interface Lesson {
  id: string;
  title: string;
  storagePath: string;
}

export interface Level {
  id: string;
  name: string;
  lessons: Lesson[];
}

export interface Language {
  id: string;
  name: string;
  levels: Level[];
}

export interface Manifest {
  languages: Language[];
}

export interface TextToSpeechOptions {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number;
}

export interface GeneratedAudio {
  localPath: string;
  storagePath: string;
  firebaseUrl: string;
  metadata: {
    languageId: string;
    levelId: string;
    lessonId: string;
    title: string;
    text: string;
    voice: string;
    model: string;
    generatedAt: string;
  };
}

export interface LessonContent {
  languageId: string;
  languageName: string;
  levelId: string;
  levelName: string;
  lessonId: string;
  lessonTitle: string;
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

