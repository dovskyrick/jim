# MVP — Lesson text generator

_2026-10-28 · Status: PROPOSED, waiting for the founder's go · About 70 words per subtopic._

## MVP in one sentence
A command that takes a language, a module number and a creativity setting, and produces: a frozen curriculum of about 300 items, 30 lesson scripts of about 30 minutes each in the format the audio pipeline already reads, and a vocabulary record saying which lesson introduces and revisits each item. First target: Greek, Module 1, fully original. Each script carries a review status, so a human approves it before audio is generated.

## Sources of the method
The method rules come only from public sources:
- **Pimsleur's 1967 paper:** recall at intervals that grow about ×5 (5 s, 25 s, ~2 min, ~10 min, then days); ask the learner, pause, then give the confirming answer; spread repetitions out instead of massing them.
- **Widely published descriptions of the method:** backward build-up for long words, a short dialogue at the start, a role-play at the end.

No transcript of any commercial course goes into the prompts, the repo or the checks.

## Originality guardrails
- **Our own curriculum:** a different scenario and characters, built from frequency lists and everyday travel situations.
- **Different openings:** Module 1 must not open with the "excuse me / do you understand English / are you American" sequence typical of older courses.
- **Our own instructor wording:** a phrase library we write; generic cues like "listen and repeat" are fine.
- **A record per lesson:** model, prompt version and creativity, for audit.

## Pipeline: four steps
1. **Planner** (LLM, once per module): proposes the item list (words *and* structures) and assigns items to lessons, about ten new per lesson. A human can edit it, then it is frozen.
2. **Scheduler** (plain code, no LLM): builds each lesson's skeleton of beats from the paper's intervals.
3. **Writer** (LLM): turns the beats into natural instructor lines and target phrases.
4. **Checker** (plain code): verifies everything, then writes the script.

## The skeleton (rigid part)
Each lesson is a list of *beats*:
- an opening dialogue made only of items known by the end of the lesson;
- an introduction of each new item, with backward build-up when it has more than two syllables;
- recall prompts placed about 5 s, 25 s, 2 min and 10 min after first presentation, measured using estimated speaking time;
- reviews of older items that are due (1, 2, 5, 10 and 25 lessons later);
- items combined into new sentences;
- a closing role-play.

The scheduler is plain code, so it is predictable and testable.

## The creativity dial (flexible part)
One setting from 0 to 1 controls both the LLM temperature and how much freedom the writer has:
- **0:** fill fixed templates; the LLM only supplies the target phrases.
- **0.5 (default):** the LLM rewrites instructor lines naturally and may add short pronunciation or culture notes.
- **1:** it may also reorder beats within a section and invent mini-scenes.

At every level, the checker still requires every scheduled recall and forbids unknown words.

## Checker rules
- Every scheduled recall is present.
- Every target phrase is tagged with the item IDs it uses, and none uses an item not yet taught.
- No more than the planned number of new items.
- The estimated duration is 27–33 minutes.
- Pauses follow the rules: answer gaps scale with phrase length.
- The script parses for the audio pipeline.

Failed beats are rewritten up to three times; if they still fail, the lesson is marked `needs-human`.

## Data and storage
JSON files in git, as the data subplan decided; no database yet. Folder `AudioGeneration/curriculum/greek/module1/`:
- `module.json`: settings, status, versions.
- `items.json`: id, Greek text, meaning, type, gender/formality notes, the lesson that introduces it, review lessons.
- `lessons/lesson01.json`: beats, final lines, status, generation metadata.

The rendered `.txt` scripts go to `lessons-content/` as today. "Learned vocabulary up to lesson N" is computed from `items.json`, never stored twice.

## LLM provider and running it
The writer and planner use one small adapter, so the model is a config value. The default is your OpenAI key, which the pipeline already uses; Anthropic or Google can be added later. Writing a whole module costs about one or two dollars with a small model. This cloud session has no LLM key. So either you run the command locally, or you add the key as an environment secret, or I write the 30 scripts myself through the same skeleton and checker.

## Built in now so the back office is easy later
About 10% of the effort:
- Stable IDs for items, lessons and beats.
- Every file has a `status` (draft, review, approved, published) and an edit history in git.
- A human can **lock** any item, beat or line; regeneration keeps locked parts.
- Generation can rerun a single lesson or beat.
- A validated JSON schema for every file (zod), which a future editor can reuse.

The full roadmap is in `roadmap-back-office.md`.

## Done means
- All 30 Greek Module 1 lessons pass the checker at creativity 0.5.
- A native Greek speaker reviews lessons 1, 10 and 30 and finds them natural.
- You confirm none of them feels like a copy of any existing course.
- Lesson 1 renders to audio through the existing pipeline without manual fixes.
- Statuses are set to `approved`, and the result is recorded as DECIDED in `underthetable_PLAN.md`.
