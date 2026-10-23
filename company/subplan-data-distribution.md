# Subplan — Data and distribution

_2026-10-23 · Status: LOOSE · Each subtopic about 70 words. Order: human steps → tests → implementation._

## Decision summary
- **Audio files:** Cloudflare R2, served publicly through a CDN.
- **Lesson catalog:** a static JSON file published by the pipeline next to the audio.
- **User data:** Firebase (Auth plus Firestore), because it changes all the time and Firebase handles login, offline use and per-user security.

That split matches what each tool does best: R2 is cheap, never charges for downloads and suits large files. Firebase suits small, frequently changing records. Status: LOOSE until tested.

## What lives where
| Data | Place | Changes when |
|---|---|---|
| Lesson audio (mp3/Opus) | R2 | A lesson is published |
| Catalog (`manifest.json`) | R2, with a version number | Publishing |
| Lesson scripts, phrase list | Git | Writing |
| User profile, progress, known words, settings | Firestore, per user | Every use |
| App crashes and usage events | Firebase Analytics, Crashlytics | Automatically |

## JSON now, or a database now?
Your instinct is right: systems change as they grow, and the book is correct. Firestore already stores JSON documents, so "JSON in Firebase" is a real database, not a shortcut. It's free up to about 50,000 reads and 20,000 writes per day, plenty for 1,000 users. Postgres isn't needed yet. What matters now is stable IDs and a written schema, so a later migration is just one script.

## When to move to Postgres
Move only when one of these becomes true:
- You need questions across many users ("which words do most learners forget?").
- You need paid-tier accounting with strict consistency.
- Firestore bills grow past about $25 a month.

Supabase (hosted Postgres) is the likely target. Before that, Firebase can export analytics to BigQuery for free-ish queries. Don't build for this today. Write it down and wait.

## Catalog design
`manifest.json` lists languages → levels → lessons. Each lesson has an id, title, duration, file URL, file size and content hash. The pipeline rebuilds it on every publish, gives it a version number and uploads it to R2 under a short cache time, while audio files get a long one. The app downloads the manifest once at startup, then only the lessons a user opens. Reading it costs nothing.

## User data design
One Firestore document per user (`users/{uid}`) holds settings and current position. A subcollection `users/{uid}/progress/{lessonId}` holds done, last position and date. Later, `users/{uid}/words/{wordId}` holds known words and review dates. Sign users in anonymously at first install: no signup screen, but a real ID. They can link Google sign-in later to keep data across phones. Firestore's offline cache makes the app work without network.

## Security model
- **R2:** public read for audio and the catalog only; writes only from the pipeline using a bucket-scoped API token kept in `.env`.
- **Firestore:** rules let each signed-in user read and write only their own documents.
- **App Check:** optional now, useful later to stop bots from creating fake accounts.

The signed-URL Cloud Function becomes unnecessary, because public downloads cost nothing on R2. Cancelling it simplifies everything and removes the blocking permissions issue.

## Cost at 0–1,000 users
- **R2 storage:** 10 GB free, then $0.015 per gigabyte monthly. About 100 lessons per language fit comfortably; 30 languages would cost about one dollar a month.
- **R2 downloads:** free.
- **Requests:** millions free.
- **Firestore and anonymous Auth:** fit inside the free quotas.
- **Domain:** about $10 a year.
- **Google Play:** $25 once.

Total: roughly zero to two dollars a month, plus the domain and the Play fee. Set budget alerts anyway.

## Migrating off Firebase Storage
1. Copy existing audio from Firebase Storage to R2. A one-off script, or download and re-upload, since there are only a few files.
2. Change the pipeline's upload step to R2's S3-compatible API.
3. Point the manifest URLs at the new domain.
4. Update the app to read the manifest from R2.
5. Keep Firebase Storage for two weeks as a backup, then delete its files.

The app change is small and can wait.

## Human steps — Cloudflare
1. Create a Cloudflare account and add a payment method (R2 requires one even for the free tier).
2. Buy a cheap domain through Cloudflare Registrar, about $10 a year.
3. Create an R2 bucket, `jim-audio`, with location hint Europe.
4. Under bucket settings → Custom Domains, connect `audio.<yourdomain>`.
5. Create an R2 API token with Object Read & Write, scoped to that bucket.
6. Save the Access Key ID, Secret and Account ID into `AudioGeneration/.env`.

## Human steps — Firebase
1. In project `jim-c9df8`, open Authentication → Sign-in method and enable Anonymous (and Google for later).
2. Open Firestore Database → Create database, production mode, region `europe-west`.
3. Paste the own-documents-only rules that I'll write.
4. In Google Cloud Billing, set a $5 budget alert.
5. Leave the existing Cloud Functions alone; we'll delete them after migration.
6. Tell me when this is done.

## Test plan (after human steps)
1. Upload one lesson to R2 by hand. Check it plays on your phone over mobile data, and that seeking works.
2. Measure the first-byte time from your location.
3. Run a script that creates an anonymous test user, writes progress and reads it back.
4. Confirm the security rules block reading another user's data.
5. Record the result as DECIDED in `underthetable_PLAN.md`.

Only then change the pipeline and the app.
