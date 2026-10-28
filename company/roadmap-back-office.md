# Roadmap — Back office for supervising lessons

_2026-10-28 · Status: LOOSE · About 70 words per subtopic. Builds on `mvp-lesson-generator.md`._

## Purpose
Let one or more human operators supervise the LLM-assisted lesson factory: review, edit, lock, regenerate, approve and publish lessons and modules across many languages. The rule is that **humans decide and the LLM proposes**: nothing reaches users without a human status change. Each phase below is usable on its own, so the project never waits for a big build. Move to the next phase only when the current one hurts.

## Phase 0: Git is the back office (MVP, now)
- Operators edit the JSON files directly or via pull requests.
- Statuses are changed by hand.
- Locks are a field in the JSON.
- A command line regenerates a module, lesson or beat, and prints a readable diff.
- Git keeps history, blame and rollback for free.

This works for one founder plus one or two reviewers who can handle GitHub. Cost: zero.

## Phase 1: Local review editor
A small web page (Vite + React) that reads the same JSON files.
- It shows a lesson as a timeline of beats, with the Greek, the English meaning and the recall markers.
- Operators can edit a line, lock it, regenerate one beat with a chosen creativity, play the audio preview and change the status.
- Saving writes the JSON back to disk.

No server and no accounts. Trigger: when hand-editing JSON becomes painful.

## Phase 2: Shared back office
Move the curriculum data to Firestore (or Postgres) behind a hosted version of the editor, with sign-in. Roles:
- **author:** generates and edits;
- **native reviewer:** comments and approves the language;
- **publisher:** releases.

Statuses flow draft → review → approved → published. Comments attach to beats. Publishing triggers audio rendering and upload to R2. Trigger: the first outside reviewer who shouldn't need GitHub.

## Phase 3: LLM assistant inside the back office
Operators give instructions in plain words:
- "make lesson 12 easier";
- "replace this item everywhere in the module";
- "add a café scene to lesson 7";
- "check politeness consistency".

The assistant proposes a diff, the checker validates it, and a human accepts or rejects it. Every action is logged with the prompt, model and result. Trigger: more than three languages in production.

## Phase 4: Learning from learners
The app reports anonymous signals: replays, skips, lessons abandoned, self-rated difficulty. The back office shows, per item and per lesson, where learners struggle. The scheduler then adjusts review intervals per item (the paper's point: hard non-cognates need more recalls). Operators approve these changes like any other edit. Trigger: about 1,000 active learners.

## What stays fixed across all phases
- One schema and stable IDs, from the MVP onwards.
- The checker is the single gate: no lesson skips it, whoever edited it.
- Locks are always respected.
- Every published lesson is traceable to its inputs, model, prompt version, creativity and approver.
- Original content only: no transcript of any commercial course enters the system, in any phase.
