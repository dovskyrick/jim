# PLAN — Jim (open audio language lessons)

_Last updated: 2026-10-23 · Stage: loose planning. Development starts within ~1 week._

## Vision
A free, open-source Android app that teaches languages through Pimsleur-*style* audio lessons (the method, never their content). Lessons are written by LLMs and voiced by text-to-speech (TTS). Free for everyone, funded by donations and an optional paid tier.

**Key insight:** a lesson is *data*: a timeline of reusable phrase clips. The phrase library is the real asset. So turning any user's flashcards (Anki/RemNote) into a spoken course costs almost nothing.
**Pitch:** "Turn your flashcards into spoken lessons."

## Where we are (2026-10-22)
- `AudioGeneration/`: generates lessons from scripts with OpenAI `tts-1`, caches vocabulary audio, has a repair "doctor" and a budget cap. Spent about €0.04.
- Content: Greek (4 lessons), English (4), French (1).
- `LanguageAudioPlayer/`: Expo/React Native app on Firebase. The Cloud Function that hands out audio links is deployed but blocked by permissions (see `RESUME-HERE.md`).

## Direction (all LOOSE until marked)
| Area | Direction | Why |
|---|---|---|
| LLM | Write each lesson once as a template with slots for target-language phrases; have a cheap small model fill in only the phrases per language. Use batch mode. | Under $1 per course per language. |
| TTS | Generate English instructor lines once for all languages. Pauses are silence made locally. Only unique target phrases go to TTS. Use a premium voice only for target phrases. Try open-source voices (Kokoro, Piper). | About $0.75 per course on `tts-1`; $0 with open-source voices. |
| Storage | Cloudflare R2: no download fees. Opus at 24 kbps. Public CDN, because the content is open. | Makes most of the anti-bot work unnecessary (signed links, App Check). |
| Database | Phrase table (id, language, text, hash, voice, url, duration) + lessons as JSON timelines in git + user data in SQLite on the phone. Sync only for paying users. | No server database for the free tier. |
| Revenue | Free core. Paid custom lessons (€3–5/month or credits; each costs us about $0.01–0.05). Donations, open-source grants, schools and NGOs. | Uses Play billing (Google takes 15%). |
| Integrations | Anki-style CSV import/export first. RemNote plugin later. | CSV works with Anki, RemNote and Quizlet. |

## Hard problems (open questions — research these first)
### Q1. Building clean audio from pieces
Short words and syllables from TTS come out clipped, with cut-off starts, breaths, uneven loudness and odd intonation. **How do we get seamless lessons from fragments?**
Ideas to test:
- Generate the word inside a *carrier sentence*, then cut it out using word timestamps (forced alignment with Whisper, or the TTS provider's timepoints).
- Never ask the TTS for a bare syllable. Use "speak slowly" instructions (`gpt-4o-mini-tts`) or slowed-down full words.
- Trim silence automatically, normalize loudness (EBU R128), add 5–10 ms fades at every cut, and use one sample rate and codec everywhere.
- Automated quality checks: transcribe each clip and compare it to the text; flag clips whose duration looks wrong; reject and regenerate. This extends the existing doctor.
- Measure: what % of clips pass with no human listening?

### Q2. Smooth, low-latency player
Goal: one load at the start, then instant, glitch-free scrubbing along the timeline.
Options:
- **A (leaning):** build each lesson into **one file on the server** and cache it on the CDN; the phone plays a single file. Simplest player, smooth seeking, and storage is cheap.
- **B:** assemble clips on the phone. Smaller downloads and fully personalized lessons, but much harder (gapless playback, accurate seeking).
- Check: `react-native-track-player` vs `expo-audio` for seeking, background playback, lock-screen controls and offline files.
- Custom lessons: build them on the server on demand (option A), so there is still only one player code path.

## Next steps
**2026-10-23 priority:** the audio pipeline and data/distribution come first; the player is clunky but good enough, so it waits. See `subplan-audio-generation.md` and `subplan-data-distribution.md`.

- [ ] **Tomorrow (research):** Q1 experiments on 20 Greek phrases (carrier sentence vs bare word; check with Whisper). Compare TTS prices and quality (`tts-1`, `gpt-4o-mini-tts`, Google, Kokoro). Test seeking in the RN player.
- [ ] **This week:** Decide Q1 and Q2 → mark them DECIDED here. Define the "minimum excellent delivery": one language, one level, about 10 lessons, flawless audio and player.
- [ ] **Next week:** Start building. Move hosting to R2 and simplify the backend (drop the signed-link function if the content is public).

## Agent brief (for AI sessions)
You are helping one founder ship a free, open audio-language app. Read this file first.
- Optimize for low running cost, audio quality and simple code. In that order when they conflict, except never ship audio that clicks or is cut off.
- Never copy Pimsleur material. Check new ideas against `legal-checklist.md`.
- Before building, check whether an open question above blocks the work. If it does, research it and propose an answer; don't guess.
- Write findings back here, one line each, with a status. Put long notes in a separate file and link it.
- Talk to the human in short, skimmable lines: outcome first, then options with a recommendation.
