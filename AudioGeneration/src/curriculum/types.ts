/**
 * Data shapes for the lesson text generator.
 * Source of truth lives as JSON in curriculum/<language>/<module>/.
 */

export type Status = 'draft' | 'checked' | 'approved' | 'published';

/** curriculum/<language>/<module>/module.json — written by a human. */
export interface ModuleConfig {
  language: string;          // e.g. "greek"
  languageName: string;      // e.g. "Greek"
  module: string;            // e.g. "module1"
  title: string;             // spoken in each lesson's first line
  lessonCount: number;       // 30
  creativity: number;        // 0..1, see method/creativity.md
  targetMinutes: number;     // 30
  newItemsPerLesson: { min: number; max: number };
  /** Seconds after first presentation when an item is recalled (Pimsleur 1967: ~x5). */
  inLessonRecallSeconds: number[];
  /** Lessons after introduction when an item comes back for review. */
  reviewAfterLessons: number[];
  /** One line per lesson: the situation the lesson is built around. */
  lessonThemes: string[];
  /** Originality guard: lesson 1 may contain at most one of these meanings. */
  avoidInLesson1?: string[];
  status: Status;
  notes?: string;
}

/** One entry in items.json — a word, phrase or structure the learner must produce. */
export interface Item {
  id: string;                // "i001", stable forever
  target: string;            // in the target language, e.g. "Καλημέρα"
  meaning: string;           // English meaning, e.g. "good morning"
  type: 'word' | 'phrase' | 'structure';
  lesson: number;            // lesson that introduces it (1-based)
  /** Other spellings/inflections the learner may hear or say once the item is taught. */
  forms?: string[];
  syllables?: number;        // drives backward build-up (>2 → build-up)
  notes?: string;            // pronunciation, formality, gender
  locked?: boolean;          // humans: regeneration must not change it
}

export type BeatType =
  | 'opening'      // lesson title + what we will do
  | 'dialogue'     // short listening dialogue using only taught items
  | 'new'          // present a new item (with build-up if long)
  | 'recall'       // ask for an item taught earlier in this lesson
  | 'review'       // ask for an item from an earlier lesson
  | 'combine'      // build a new sentence from several known items
  | 'roleplay'     // closing conversation where the learner answers
  | 'closing';

/** One step of a lesson skeleton, produced by the scheduler (plain code). */
export interface Beat {
  id: string;                // "b001"
  type: BeatType;
  items: string[];           // item ids the beat must practise
  buildup?: boolean;         // for 'new': break the word from its end
  atSeconds: number;         // estimated position in the lesson
  note?: string;             // e.g. "recall +25s"
}

/** One spoken segment in a written lesson. Either instructor text or a target phrase. */
export interface Line {
  beat: string;              // beat id this line belongs to
  /** Instructor speech in English (the guiding voice). */
  say?: string;
  /** Target-language speech (the native voice / the expected answer). */
  target?: string;
  /** Item ids used in `target`. */
  items?: string[];
  /** Silence after this line, seconds. */
  pause: number;
  locked?: boolean;
}

/** curriculum/<language>/<module>/lessons/lessonNN.json — written by the LLM writer. */
export interface Lesson {
  lesson: number;
  title: string;
  status: Status;
  /** Who/what wrote it: model name, prompt version, creativity used. */
  generatedBy: { writer: string; promptVersion: string; creativity: number; date: string };
  lines: Line[];
  reviewNotes?: string;      // humans write here
}
