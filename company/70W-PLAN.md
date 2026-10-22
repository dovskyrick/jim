# 70W-PLAN — every subtopic in about 70 words

_Short version of `PLAN.md` (2026-10-22). If the two disagree, `PLAN.md` wins._

## Vision
A free, open-source Android app teaching languages through Pimsleur-style audio: the method, never their content. LLMs write the lessons and TTS voices them. It is funded by donations and an optional paid tier. Key insight: a lesson is just a timeline of reusable phrase clips, and the growing phrase library is the real asset. So turning anyone's flashcards into a spoken course costs almost nothing. Pitch: "Turn your flashcards into spoken lessons."

## Where we are
`AudioGeneration/` turns lesson scripts into audio with OpenAI `tts-1`. It caches vocabulary clips, repairs silence glitches with a "doctor" tool, and enforces a €10 budget (about €0.04 spent). Content: four Greek, four English and one French lesson. `LanguageAudioPlayer/` is an Expo/React Native app on Firebase Storage. Its Cloud Function for handing out audio links is deployed but blocked by permissions. Next was App Check, which this plan may make unnecessary.

## LLM
Don't write a separate script per language. Write each lesson once as a template with slots for target-language phrases. A cheap small model then fills in only those phrases per language: a few thousand output tokens per lesson. Batch mode halves the price. A full course in a new language costs under one dollar. The real cost is quality, so plan native-speaker review, perhaps through community pull requests on scripts kept in git.

## TTS
The English instructor lines are the same in every language, so generate them once. Pauses are silence made locally, never TTS. Each target language needs only its unique phrases: about 3,000 phrases, or 50,000 characters, roughly $0.75 per course on `tts-1`. Google's free tier covers about four million standard characters monthly. Open-source models like Kokoro or Piper cost nothing if run ourselves. Spend on premium voices only for target-language pronunciation.

## Storage
Store reusable phrase clips, not finished lessons: a thirty-minute mp3 is about 14 MB, its unique clips one or two. Encode in Opus at 24 kbps. Host on Cloudflare R2, which has no download fees and ten free gigabytes. The content is free and open, so serve it publicly. That removes most anti-bot work (signed links, Cloud Function, App Check), since downloads cost nothing. Offer whole language packs for offline listening.

## Database
Three layers; free users need no server database. First, a phrase table: id, language, text, hash, voice, clip URL, duration. Second, lessons stored as versioned JSON timelines in git, like `[{clip}, {pause:3}, …]`, plus a static manifest on the CDN. Third, user data kept on the phone in SQLite: known words and review schedule. Sync it to Supabase or Firestore only for paying users who want backups or multiple devices.

## Revenue
Keep the core lessons free forever. Charge for custom lessons: the user picks a topic or pastes words, the LLM writes the script, and only new phrases go to TTS. Each costs us about one to five cents, so €3–5 monthly or credits leaves a wide margin. Google takes fifteen percent, and Play billing is mandatory. Every custom lesson also grows the shared library. Add donations, open-source grants, schools, NGOs and neglected languages.

## Integrations
RemNote can export notes in several formats, has a raw JSON export with no documented schema, and exports flashcards as Anki-friendly text or CSV. Build import and export around Anki-style CSV first, since RemNote, Anki and Quizlet all accept it. A RemNote plugin can come later: I believe it has a plugin SDK, but that's unverified. This is also personally useful: your own RemNote cards could become audio lessons you listen to while walking.

## Q1 — Clean audio from pieces
Short words and syllables from TTS often come out clipped, breathy, uneven in loudness or oddly intoned. Ideas to test:
- Generate each word inside a full carrier sentence, then cut it out using word timestamps from Whisper.
- Never request bare syllables; ask for slow speech.
- Trim silence, normalize loudness, add tiny fades at cuts.
- Have Whisper check every clip and regenerate failures.

Measure what fraction passes without human listening.

## Q2 — Smooth, low-latency player
Goal: one load at the start, then instant, glitch-free scrubbing. Leaning towards building each lesson into one file on the server and caching it on the CDN, so the phone plays a single file. That makes seeking smooth and keeps the player simple, and storage is cheap. Custom lessons get built the same way, on demand. Alternative: assembling clips on the phone, which is harder. Compare `react-native-track-player` with `expo-audio`.

## Next steps
- **Tomorrow:** research. Run the clean-audio experiment on twenty Greek phrases, comparing carrier sentences with bare words and checking results with Whisper. Compare TTS price and quality across `tts-1`, `gpt-4o-mini-tts`, Google and Kokoro. Test seeking in the current player.
- **This week:** decide both hard problems and define the minimum excellent delivery: one language, one level, about ten flawless lessons.
- **Next week:** start building, move hosting to R2 and simplify the backend.

## Agent brief
You are helping one founder ship a free, open audio-language app. Read `PLAN.md` first. Priorities when they conflict: low running cost, then audio quality, then simple code. But never ship audio that clicks or is cut off. Never copy Pimsleur material; check ideas against the legal checklist. If an open question blocks the work, research and propose an answer rather than guessing. Record findings as one line each with a status. Talk briefly: outcome first, then recommendation.
