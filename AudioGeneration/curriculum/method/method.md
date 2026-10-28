# Method — how a lesson is written (method-v1)

Read this once before writing any lesson. The brief for each lesson says *what* to teach; this file says *how*.

## Who is speaking
- **Guide** (`"say"` lines): a warm, brief English-speaking teacher. Talks to the learner as "you". Never speaks the target language.
- **Native voice** (`"target"` lines): speaks only the target language: models words, answers prompts, plays characters in dialogues.

One line = one voice. Never mix English and Greek in a line.

## The learning cycle (from Pimsleur, "A Memory Schedule", 1967)
1. **Hear it.** The native voice models a phrase.
2. **Say it.** The learner repeats in the pause.
3. **Be asked for it.** The guide asks for it later; the learner answers in the pause *before* the native voice confirms.
4. **Recall at growing gaps:** about 5 s, 25 s, 2 min and 10 min later, then in later lessons. The skeleton already places these; your job is to make each one feel natural, not repetitive.

The learner is always *producing*, not just listening. Most of the lesson is: guide prompt → pause → native answer → short pause to repeat.

## Beat types
- **opening:** one or two guide lines. Say the lesson's situation in one sentence. No Greek.
- **dialogue:** a short scene (4–8 target lines) between two characters using this lesson's items. Introduce it with one guide line ("Listen to this conversation at a café."). The learner only listens. Uses the lesson's items in natural context.
- **new:** introduce one item.
  1. Guide gives the meaning and the situation ("To ask for the bill, say:").
  2. Native voice says it; learner repeats (pause ≥ repeat time).
  3. **BUILD-UP** (when marked): native voice says the word in pieces *from the end*, each repeated by the learner, growing to the full word. Example for `ευχαριστώ`: `στώ` → `ριστώ` → `χαριστώ` → `ευχαριστώ`. At least 3 pieces plus the whole word.
  4. Optional one-sentence tip (stress, a sound English lacks, formality).
  5. Native voice says it once more.
- **recall:** the guide asks for an item taught earlier in this lesson. Vary the cue: "How do you say…?", "Ask her…", "Tell him…", "What's the word for…?", "Answer: …". Pause long enough for the learner to answer, then the native answer, then a short pause.
- **review:** same as recall, for an item from an earlier lesson. Frame it as a small situation when possible ("The waiter asks if you want water. Say yes.").
- **combine:** the learner builds a *new* sentence from the listed items (and other known words) that they have never heard as a whole. Prompt in English, pause, native answer. This is where learning happens: make the sentences useful and varied.
- **roleplay:** a closing conversation. A native character speaks; the guide prompts the learner's replies in English ("She asks how you are. Answer that you're well."); pause; native gives the model reply. Use at least half of the listed items.
- **closing:** one or two guide lines. Congratulate briefly; say what comes next. No Greek.

## Pauses (seconds, after the line)
- After a guide **prompt** that expects an answer: answer time = 2.5 + 0.6 × words in the answer (max 8). The checker enforces this.
- After a **target** line: repeat time = 1.5 + 0.5 × words (max 6). The checker enforces this.
- After plain guide talk with no answer expected: 0.5–1.5.

## Cue library (use word-for-word at creativity ≤ 0.2; vary freely above)
Introduce: "Here is how to say \"…\"." · "To say \"…\", you use:" · "Listen, then repeat:"
Repeat: "Say it again." · "Once more, copying the rhythm." · "Repeat after the speaker."
Ask: "How do you say \"…\"?" · "What's the word for \"…\"?" · "Do you remember how to say \"…\"?"
Situations: "Ask the waiter…" · "Tell her…" · "He asks you… Answer yes." · "Now speaking for yourself, say…"
Combine: "Try to say: \"…\"" · "Put it together: \"…\"" · "Now a new sentence: \"…\""
Feedback: "Did your stress fall on the same syllable?" · "Notice how the words flow into each other."

## Rules the checker enforces
- Every skeleton beat appears, in order (creativity ≥ 0.8 allows small moves).
- Every `target` line lists its item ids in `items`; build-up pieces don't need ids.
- A target line may only use words from items taught so far (or forms listed in `forms`). Dialogue and roleplay may use any item of this lesson.
- Recall/review beats contain a target line tagged with their item; combine beats use all their items; build-up beats have ≥ 4 target lines.
- Length: 27–33 minutes (speech plus pauses). If short, add combine practice and situational recalls inside existing beats; never add new vocabulary.

## Originality rules (non-negotiable)
- Never reproduce text, dialogues, scenarios or word order from any commercial course, even if you remember them.
- The characters live in *our* setting: a traveller in Thessaloniki (café, bakery, kiosk, bus, taverna, market).
- Write instructor lines yourself; the cue library above is ours.

## Output: `lessons/lessonNN.json`
```json
{
  "lesson": 1,
  "title": "At the café",
  "status": "draft",
  "generatedBy": { "writer": "<model name>", "promptVersion": "method-v1", "creativity": 0.5, "date": "YYYY-MM-DD" },
  "lines": [
    { "beat": "b001", "say": "Today you're at a café by the sea, ordering your first Greek coffee.", "pause": 1 },
    { "beat": "b003", "say": "To greet someone politely, you say:", "pause": 1 },
    { "beat": "b003", "target": "Γεια σας", "items": ["i001"], "pause": 3 },
    { "beat": "b004", "say": "How do you greet the waiter politely?", "pause": 4 },
    { "beat": "b004", "target": "Γεια σας", "items": ["i001"], "pause": 3 }
  ]
}
```
Each line: `beat`, exactly one of `say`/`target`, `pause`, and `items` on target lines. Use Greek punctuation (`;` for questions). No quotes or brackets inside `target`. Never change lines marked `"locked": true`.
