# Subplan — Lesson text generation

_2026-10-23 · Status: LOOSE · Each subtopic about 70 words. Not legal advice. Order: human steps → tests → implementation._

**2026-10-28 update:** MVP spec is in `mvp-lesson-generator.md`. Method rules come from Pimsleur's 1967 paper and public descriptions only. The uploaded lesson transcripts were not used and are not stored in the repo.

## Goal
Generate lesson scripts for any language from one well-written prompt. The scripts must teach as effectively as the audio method we admire while sharing none of its protected expression. Each output is a script in our existing format (`[pause]` markers, quoted target phrases) that the audio pipeline can voice directly. Success means a Greek Level 1 course that a native speaker and you both judge natural, well-paced and clearly ours.

## Your question: transcribe Pimsleur, extract patterns?
Partly legal, partly risky.
- **Probably fine:** the *patterns* themselves (pause lengths, recall timing, prompt types). Methods and ideas aren't copyrightable.
- **Risky:** the *process* of speech-to-text. A transcript is a copy of their text, and you'd be sending it to an AI service.
- **Riskiest:** your purchase licence probably forbids copying or using the material for a competing product. That is a contract problem even where copyright allows it.

## Where the legal line is
**Copyright protects expression, not methods.** Spaced recall and "how would you say…?" prompts are free to use. But the specific *selection and sequence* — which words appear, in what order, in which dialogues, lesson by lesson — can count as protected expression.

Rules:
- Never mirror their vocabulary order, opening dialogues or scenarios.
- Never commit transcripts to the repo, even privately.
- As an open competitor, assume anything we store could be read later.

## The law by region (rough)
- **EU:** a text-and-data-mining exception allows automated analysis of works you accessed lawfully, unless the rightsholder has opted out in a machine-readable way. Large publishers often have.
- **US:** analysis is likely fair use (Authors Guild v. Google; the 2025 AI book-training rulings).

Neither cancels a contract you agreed to when buying. Your country and the exact licence decide this, so check both before choosing a route.

## Recommended route: clean room
Split the work so I never see their text:
1. **You** listen to the lessons yourself and write abstract notes *in your own words*, using a template I provide.
2. **I** combine your notes with public sources into the method prompt.

Public sources include Paul Pimsleur's 1967 paper "A Memory Schedule", his 1980 book *How to Learn a Foreign Language*, and published reviews. No transcripts and no copies. It is slower, but it gives you the clearest legal position and the best story if challenged.

## What to note while listening
Write numbers and categories, never sentences:
- How long the lesson runs and how many new words it introduces.
- The recall intervals: after how many seconds or minutes an old word returns.
- Prompt types: listen, repeat, anticipate ("how would you…?"), answer, role-play.
- How pronunciation is taught; build-ups from the end of a word (backward build-up).
- The instructor/learner ratio and how review lessons differ.
- What feels boring or confusing, so we can improve on it.

## The method prompt (what I'll write)
A single markdown prompt, version-controlled, built from public research plus your notes. It defines:
- the lesson anatomy (opening, new material, review, closing);
- recall-interval rules;
- prompt types with *invented* examples;
- a vocabulary budget per lesson;
- the pause rules;
- the output format the audio pipeline parses.

It names no product and contains no transcribed text. It is reviewed against the legal checklist before first use.

## Curriculum first, lessons second
Don't generate lessons one by one. First have the LLM plan a whole level: everyday situations, a word list with frequency ranks, and which lesson introduces each word and where it recurs. That plan is ours, built from frequency lists and common situations, so it is legally clean. Then each lesson prompt receives its slice of the plan plus the words already learned (`learned_vocab.json` already exists), which keeps recall consistent.

## Adapting to every language
Write a language-neutral master course once, in English: situations, concepts, pacing. Per language, an LLM translates only the target phrases and adapts them for formality, gender, word order and politeness. It flags phrases that don't translate naturally and replaces them with a local equivalent. Add a pronunciation note for any new sound. Each language needs a native-speaker check. Non-Latin alphabets need no special handling, because lessons are audio-only.

## Automatic checks on every script
- **Format:** it parses cleanly for the audio pipeline.
- **Vocabulary:** at most N new words per lesson, and only words from the plan.
- **Recall:** every new word returns at the planned intervals.
- **Length:** the estimated duration is about 30 minutes.
- **Language:** a second model back-translates the target phrases and flags mismatches.
- **Originality:** no named scenario or character that echoes the product we admire.

Failed scripts are regenerated automatically.

## Model and cost
Scripts are short, so cheap models are enough. Use a small model to write and translate. Use a larger one only for the one-off curriculum plan and as the reviewer that checks quality. Cost: roughly one dollar for a whole course in a new language, cents with batch mode. Keep every script, plan and prompt in git, with the model name and prompt version recorded, so results can be reproduced and improved.

## Human steps — before any implementation
1. Find the licence or terms of your Pimsleur purchase and look for clauses about copying, reverse engineering and commercial use.
2. Tell me your country of residence.
3. Decide: clean room (recommended) or automated transcription (only after a 30-minute consult with an IP lawyer).
4. Ask me for the note template, then fill it in for lessons 1, 2, 5, 10, 20 and 30.
5. Download Pimsleur's 1967 "A Memory Schedule" paper.

## Test plan (after human steps)
1. I write the method prompt and a Greek Level 1 curriculum plan.
2. Generate lessons 1–3 and run the automatic checks.
3. You and the native Greek speaker read them and score naturalness, pacing and difficulty.
4. Compare them against your notes on pacing only — never against their text.
5. Repeat for one very different language (Japanese, for example) to test adaptation.
6. Then mark the method DECIDED in `underthetable_PLAN.md`.

## Implementation (only after tests)
1. Add `lesson-text/` inside `AudioGeneration/`, with the method prompt, curriculum plans and a generator script calling a cheap LLM.
2. Have the generator output scripts in today's format, so the audio pipeline needs no changes.
3. Add the automatic checks as a test command.
4. Add the back-translation check.
5. Later, the same generator powers paid custom lessons: a user's word list replaces the curriculum slice.
