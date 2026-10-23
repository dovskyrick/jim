# company/

How the project is planned and decided over time, kept separate from the code.

| File | Purpose |
|---|---|
| `underthetable_PLAN.md` | Living plan: vision, decisions, open questions, next steps. **Start here.** |
| `70W-PLAN.md` | Same plan, every subtopic in about 70 words. Fastest skim. |
| `subplan-audio-generation.md` | Cleaner, cheaper TTS pipeline: steps for you, tests, then building. |
| `subplan-data-distribution.md` | Audio on Cloudflare R2, user data on Firebase: steps for you, tests, then building. |
| `legal-checklist.md` | Legal points to keep checking as we build. |

**Rules for humans and AI agents**
- Read `underthetable_PLAN.md` before starting any planning or development session.
- Every decision gets a status: `LOOSE` (direction we lean towards), `DECIDED` (committed) or `DROPPED` (with a one-line reason).
- Keep it short. One line per idea. Put details in a new file and link to it.
- Update the date at the top of `underthetable_PLAN.md` whenever you change it.
