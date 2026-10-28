# curriculum/ — lesson text generator

Turns a module plan into 30 lesson scripts the audio pipeline can voice. Spec: `company/mvp-lesson-generator.md`.

```
curriculum/
├── RUNBOOK.md            ← step-by-step for the AI session writing lessons
├── method/
│   ├── method.md         ← how a lesson is written (the "big prompt", method-v1)
│   └── planner.md        ← how a module's items are planned
└── greek/module1/
    ├── module.json       ← settings + 30 lesson themes (humans edit)
    ├── items.json        ← every word/phrase, which lesson teaches it (planner writes; humans may edit/lock)
    ├── lessons/lessonNN.json  ← written lessons, source of truth (status: draft → checked → approved → published)
    ├── scripts/lessonNN.txt   ← rendered scripts, easy to read and review
    ├── reports/coverage.json  ← derived: where each item is heard
    └── briefs/           ← generated per lesson, not committed
```

## Flow
`items.json` → **scheduler** (code: Pimsleur 1967 recall intervals → skeleton of beats) → **brief** → **writer** (LLM fills the beats) → **checker** (code: every recall present, no untaught words, pauses, 27–33 min) → **render** → human **approve** → **publish** to `lessons-content/` → `npm run generate` voices it.

## Commands (from `AudioGeneration/`)
| Command | What it does |
|---|---|
| `npm run curriculum -- status greek/module1` | One line per lesson: items, status, theme |
| `npm run curriculum -- plan-check greek/module1` | Validates items.json |
| `npm run curriculum -- brief greek/module1 N` | Writes the brief for lesson N |
| `npm run curriculum -- check greek/module1 N` | Validates lesson N; draft → checked |
| `npm run curriculum -- render greek/module1 N` | Writes scripts/lessonNN.txt |
| `npm run curriculum -- coverage greek/module1` | Writes reports/coverage.json |
| `npm run curriculum -- approve greek/module1 N` | **Human only.** checked → approved |
| `npm run curriculum -- publish greek/module1 N` | **Human only.** Copies to lessons-content as TODO |
| `npm run test:curriculum` | Unit tests for scheduler, checker, renderer |

## Creativity (module.json → `creativity`, 0–1)
- **≤ 0.2:** fixed cue wording.
- **0.2–0.8:** natural variation and short tips (default 0.5).
- **≥ 0.8:** also small reordering and invented scenes.

The checker enforces the same structure at every level. With an API writer later, the same value maps to the model's temperature.
