# RUNBOOK — writing a module with the session model as the LLM

For the AI session that writes lessons. Follow the steps in order. All commands run from `AudioGeneration/`.
Module in this run: `greek/module1`. Branch: the one you are on (do not switch).

## 0. Read first (once)
1. `curriculum/method/method.md`: how a lesson is written. **Most important.**
2. `curriculum/method/planner.md`: how items are planned.
3. `curriculum/greek/module1/module.json`: themes and settings. Do not edit it.
4. Run `npm install` if `node_modules/` is missing, then `npm run test:curriculum` (must pass).

## 1. Plan the module (skip if `items.json` exists and `plan-check` passes)
1. Write `curriculum/greek/module1/items.json` for all 30 lessons, following planner.md.
2. Run `npm run curriculum -- plan-check greek/module1`. Fix and repeat until it passes.
3. Show the human a short table: lesson number, theme, item count, 3 example items. Ask: "Plan OK to continue?" **Wait for yes.**
4. Commit: `Plan Greek module 1 items`.

## 2. Write each lesson, 1 → 30, in order
For lesson N:
1. `npm run curriculum -- brief greek/module1 N` → read `curriculum/greek/module1/briefs/lessonNN.md`.
2. Write `curriculum/greek/module1/lessons/lessonNN.json` (format in method.md). Set `generatedBy.writer` to your model name, `promptVersion` to `method-v1`, `creativity` to the value in module.json, `status` to `draft`.
3. `npm run curriculum -- check greek/module1 N`. Fix **every** reported problem and run it again. Typical fixes:
   - "not taught yet": rephrase using known items only. Never add items to `items.json` during lesson writing.
   - "too short": raise the pause to the minimum shown.
   - "estimated length": add or remove combine/recall *practice inside existing beats*.
4. After 5 failed attempts: add `"reviewNotes": "needs-human: <what fails>"`, keep `status: draft`, move on.
5. `npm run curriculum -- render greek/module1 N` (creates `scripts/lessonNN.txt` for humans to read).
6. After lessons 5, 10, 15, 20, 25 and 30: commit (`Write Greek module 1 lessons X-Y`) and push.

Long lessons: write the JSON in parts if needed, but the final file must be one valid JSON object.

## 3. Finish
1. `npm run curriculum -- coverage greek/module1`. Report any unused items to the human.
2. `npm run curriculum -- status greek/module1`.
3. Commit, push, and tell the human: how many lessons passed, which need a human, and any concerns about naturalness.

## Never
- Run `approve` or `publish`. Those are for humans.
- Edit `module.json`, the method files, the code in `src/curriculum/`, or any line with `"locked": true`.
- Use or recall text from any commercial language course. Write everything fresh.
- Run `npm run generate` (it spends money on audio).
