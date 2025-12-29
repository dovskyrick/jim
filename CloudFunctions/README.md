# Jim Cloud Functions

Secure audio delivery system using Firebase Cloud Functions and signed URLs.

## 🎯 Purpose

These Cloud Functions provide secure, rate-limited access to audio files stored in Firebase Storage. Instead of making files publicly accessible, the app requests short-lived signed URLs that expire after 1 hour.

## 🔒 Security Features

### Phase 1 (Current):
- ✅ Private Firebase Storage (no direct public access)
- ✅ Signed URLs (1-hour expiration)
- ✅ Simple IP-based rate limiting (20 requests/minute)
- ✅ Path validation (prevents directory traversal)

### Phase 2 (Coming Soon):
- 🔄 Firebase App Check integration
- 🔄 Only genuine app instances can request URLs

### Phase 3 (Coming Soon):
- 🔄 Database-backed rate limiting
- 🔄 Per-device daily quotas
- 🔄 Advanced abuse prevention

## 📦 Setup

### 1. Install Dependencies

```bash
cd CloudFunctions
npm install
```

### 2. Initialize Firebase CLI

If you haven't already:

```bash
npm install -g firebase-tools
firebase login
```

### 3. Link to Your Firebase Project

```bash
firebase use --add
# Select your project: jim-c9df8
```

### 4. Build the Functions

```bash
npm run build
```

## 🚀 Deployment

### Deploy All Functions

```bash
npm run deploy
```

### Deploy Specific Function

```bash
firebase deploy --only functions:getAudioUrl
```

### Deploy Storage Rules

```bash
firebase deploy --only storage
```

## 🧪 Testing Locally

### Start Emulators

```bash
npm run serve
```

This will start local emulators on:
- Functions: http://localhost:5001

### Test the Function

```bash
curl -X POST http://localhost:5001/jim-c9df8/us-central1/getAudioUrl \
  -H "Content-Type: application/json" \
  -d '{
    "type": "manifest",
    "path": "manifest.json"
  }'
```

## 📡 API Reference

### GET Audio URL

**Endpoint:** `https://us-central1-jim-c9df8.cloudfunctions.net/getAudioUrl`

**Method:** `POST`

**Request Body:**
```json
{
  "type": "manifest" | "lesson" | "vocab",
  "path": "audio-lessons/greek-level1-lesson1.mp3"
}
```

**Response (200 OK):**
```json
{
  "url": "https://storage.googleapis.com/...",
  "expiresAt": "2025-12-30T12:00:00Z"
}
```

**Error Responses:**
- `400` - Invalid request (missing fields, invalid type, invalid path)
- `429` - Rate limit exceeded (too many requests)
- `500` - Internal server error

### Health Check

**Endpoint:** `https://us-central1-jim-c9df8.cloudfunctions.net/health`

**Method:** `GET`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-30T12:00:00Z",
  "version": "1.0.0"
}
```

## 📊 Monitoring

### View Logs

```bash
npm run logs
```

### View Logs for Specific Function

```bash
firebase functions:log --only getAudioUrl
```

## 💰 Cost Estimates

### Firebase Spark (Free Tier):
- ✅ 2M function invocations/month
- ✅ 5GB outbound networking/month
- ✅ 400K GB-seconds compute time/month

### Typical Usage:
- Opening app + loading manifest: 1 invocation
- Playing a lesson: 1 invocation
- 100 users playing 10 lessons/day = ~30K invocations/month
- **Well within free tier** ✅

### If You Exceed Free Tier:
- $0.40 per million invocations
- $0.12 per GB outbound data
- Estimated: $5-20/month for 1000+ active users

## 🔧 Development

### File Structure

```
CloudFunctions/
├── src/
│   └── index.ts          # Main Cloud Functions
├── lib/                  # Compiled JS (generated)
├── package.json
├── tsconfig.json
├── firebase.json
└── README.md
```

### Adding New Functions

1. Add function to `src/index.ts`
2. Build: `npm run build`
3. Deploy: `npm run deploy`

## 🐛 Troubleshooting

### "Permission denied" when deploying

Make sure you're logged in:
```bash
firebase login
```

### "Invalid service account"

The functions automatically use Firebase Admin SDK with default credentials when deployed. No manual service account needed!

### Rate limit errors during testing

The rate limit is 20 requests/minute per IP. Wait a minute or adjust `maxRequests` in `src/index.ts` during development.

---

**🎉 Your audio files are now secure!**

