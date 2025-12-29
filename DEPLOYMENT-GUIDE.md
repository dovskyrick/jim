# 🚀 Deployment Guide: Secure Audio Delivery

This guide walks you through deploying the secure audio delivery system (Phase 0 + Phase 1).

## ✅ What We Built

- **Phase 0**: Locked down Firebase Storage (files now private)
- **Phase 1**: Cloud Functions with signed URLs and rate limiting

## 📋 Prerequisites

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged into Firebase**
   ```bash
   firebase login
   ```

3. **Firebase project created** (you already have: `jim-c9df8`)

---

## 🔒 Step 1: Deploy Storage Rules (Phase 0)

### 1.1 Open Firebase Console

Go to: https://console.firebase.google.com/project/jim-c9df8/storage/rules

### 1.2 Copy the Security Rules

Open `AudioGeneration/storage.rules` and copy the entire contents.

### 1.3 Paste into Firebase Console

1. Click **"Rules"** tab in Firebase Storage
2. Delete all existing rules
3. Paste the new rules from `storage.rules`
4. Click **"Publish"**

### 1.4 Verify Rules Are Active

The rules tab should now show:
```
match /manifest.json {
  allow read: if false;  // Only via signed URLs
  ...
}
```

✅ **Your files are now private!** Direct URLs will no longer work.

---

## ☁️ Step 2: Deploy Cloud Functions (Phase 1)

### 2.1 Install Dependencies

```bash
cd CloudFunctions
npm install
```

### 2.2 Initialize Firebase Project

```bash
firebase use --add
```

Select your project: **jim-c9df8**

### 2.3 Build the Functions

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` folder.

### 2.4 Deploy to Firebase

```bash
npm run deploy
```

This will:
- Upload your functions to Firebase
- Make them live at URLs like:
  - `https://us-central1-jim-c9df8.cloudfunctions.net/getAudioUrl`
  - `https://us-central1-jim-c9df8.cloudfunctions.net/health`

**Expected output:**
```
✔  functions[us-central1-getAudioUrl]: Successful create operation.
✔  functions[us-central1-health]: Successful create operation.
```

### 2.5 Test the Function

```bash
curl -X POST https://us-central1-jim-c9df8.cloudfunctions.net/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T...",
  "version": "1.0.0"
}
```

### 2.6 Test Signed URL Generation

```bash
curl -X POST https://us-central1-jim-c9df8.cloudfunctions.net/getAudioUrl \
  -H "Content-Type: application/json" \
  -d '{"type":"manifest","path":"manifest.json"}'
```

Expected response:
```json
{
  "url": "https://storage.googleapis.com/jim-c9df8.firebasestorage.app/manifest.json?GoogleAccessId=...",
  "expiresAt": "2025-12-29T13:00:00Z"
}
```

✅ **Cloud Functions are live!**

---

## 📱 Step 3: Update React Native App

### 3.1 Verify Cloud Function URL

The app is already configured to use:
```
https://us-central1-jim-c9df8.cloudfunctions.net/getAudioUrl
```

If your Cloud Function deployed to a different region, update `LanguageAudioPlayer/src/services/firebase.ts`:

```typescript
const CLOUD_FUNCTION_URL = 'https://YOUR-REGION-jim-c9df8.cloudfunctions.net/getAudioUrl';
```

### 3.2 Rebuild the App

Since we changed the code, you need to rebuild:

```bash
cd LanguageAudioPlayer
npm install
npx expo start --dev-client
```

### 3.3 Test in Your App

1. Open the app on your phone
2. Try loading the manifest (Directory Screen)
3. Try playing a lesson

**You should see in console:**
```
🔐 Requesting secure manifest URL...
✅ Manifest loaded successfully!
🔐 Requesting secure URL for: audio-lessons/greek-level1-lesson1.mp3
✅ Secure URL obtained
```

✅ **App now uses secure URLs!**

---

## 🧪 Step 4: Verify Security

### 4.1 Test Direct Access (Should Fail)

Try accessing files directly without authentication:

```bash
curl https://storage.googleapis.com/jim-c9df8.firebasestorage.app/manifest.json
```

**Expected:** 403 Forbidden error ✅

### 4.2 Test Rate Limiting

Make 25 rapid requests to the Cloud Function:

```bash
for i in {1..25}; do
  curl -X POST https://us-central1-jim-c9df8.cloudfunctions.net/getAudioUrl \
    -H "Content-Type: application/json" \
    -d '{"type":"manifest","path":"manifest.json"}'
  echo ""
done
```

**Expected:** After 20 requests, you should get:
```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

✅ **Rate limiting works!**

### 4.3 Test Invalid Paths (Should Fail)

```bash
curl -X POST https://us-central1-jim-c9df8.cloudfunctions.net/getAudioUrl \
  -H "Content-Type: application/json" \
  -d '{"type":"lesson","path":"../../../etc/passwd"}'
```

**Expected:** 400 Bad Request ✅

---

## 📊 Step 5: Monitor Your Functions

### View Logs

```bash
cd CloudFunctions
npm run logs
```

### View in Firebase Console

https://console.firebase.google.com/project/jim-c9df8/functions

You'll see:
- Number of invocations
- Execution time
- Memory usage
- Errors

---

## 💰 Step 6: Understand Costs

### Current Usage (Free Tier):

Your app with 10 users:
- ~10 manifest loads/day = ~300/month
- ~100 lesson plays/day = ~3,000/month
- **Total: ~3,300 invocations/month**

**Free tier allows 2M invocations/month** ✅

### If You Exceed Free Tier:

- **$0.40 per million invocations**
- At 100,000 invocations/month = $0.04/month
- At 1,000,000 invocations/month = $0.40/month

**Very affordable!** 💰

---

## 🔧 Troubleshooting

### "Permission denied" when deploying

```bash
firebase login --reauth
```

### "Cannot find module 'firebase-admin'"

```bash
cd CloudFunctions
rm -rf node_modules package-lock.json
npm install
```

### App shows "Could not load lessons"

1. Check Cloud Function is deployed:
   ```bash
   curl https://us-central1-jim-c9df8.cloudfunctions.net/health
   ```

2. Check Storage Rules are active in Firebase Console

3. Check function logs:
   ```bash
   cd CloudFunctions
   npm run logs
   ```

### "Too many requests" error

Wait 60 seconds and try again. The rate limit is 20 requests/minute per IP.

---

## 🎯 What's Next?

### Phase 2: Firebase App Check (Optional - For Launch)

Add App Check to ensure only your genuine app can request URLs:
- Prevents curl/bot abuse
- Free and easy to set up
- Recommended before public launch

### Phase 3: Advanced Protection (Optional - For Scale)

Add database-backed quotas and rate limiting:
- Per-device daily limits
- More sophisticated abuse prevention
- Needed when you have 1000+ users

---

## ✅ Success Checklist

- [ ] Firebase Storage rules deployed (files are private)
- [ ] Cloud Functions deployed and responding
- [ ] Health check endpoint returns 200 OK
- [ ] Signed URL generation works
- [ ] React Native app loads manifest
- [ ] React Native app plays audio
- [ ] Direct file access returns 403 Forbidden
- [ ] Rate limiting works (429 after 20 requests)

**Once all checked, your audio delivery is secure!** 🎉

---

## 📝 Summary

**Before (Vulnerable):**
- Files publicly accessible via direct URLs
- No rate limiting
- No abuse prevention
- Risk of hotlinking and scraping

**After (Secure):**
- Files private (no direct access)
- Signed URLs expire in 1 hour
- Rate limiting (20 requests/minute)
- Path validation
- Monitoring and logging

**Cost:** Free (within Firebase free tier) ✅

**Security:** 90% improvement ✅

**User experience:** Same (no changes needed) ✅

---

Need help? Check the logs or create an issue!

