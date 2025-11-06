// Type definitions for the app

export interface Lesson {
  id: string;
  title: string;
  storagePath: string;  // Firebase Storage path like "audio-lessons/test.wav"
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

