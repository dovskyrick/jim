# Dual-App Architecture: User App + QA App

**Date:** December 29, 2025  
**Status:** Architecture Planning  
**Priority:** High

## Executive Summary

Expanding the system to address partial audio cuts and quality control:

1. **Main User App** - Clean, protected, read-only learning experience
2. **Employee QA App** - Audio quality control and correction workflow
3. **Shared Backend** - Firebase infrastructure with approval pipeline
4. **TTS Optimization** - Formatting techniques to prevent cut words

## The Problem

### Current Issue: Partial Audio Cuts

Unlike complete silence (which we detect), some words are **partially cut**:
- First syllable missing: "μέρα" instead of "Καλημέρα"
- Last syllable cut: "Ευχαρι" instead of "Ευχαριστώ"
- Mid-word truncation: "Κα...μέρα" with a gap

**Causes:**
1. OpenAI TTS API issues (formatting, tokens, timeouts)
2. Concatenation problems (segment boundaries)
3. FFmpeg processing artifacts
4. Text formatting issues (quotes, ellipsis, special chars)

**Detection Challenge:**
- Not silent (passes volumedetect)
- Requires human ear to identify
- Needs context (knowing what word SHOULD be)

## Proposed Solution: Two-App System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FIREBASE BACKEND                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Storage:                                                     │
│  - audio-lessons/                (production audio)          │
│  - audio-qa-staging/             (pending approval)          │
│  - audio-qa-rejected/            (disputed for review)       │
│                                                               │
│  Firestore:                                                   │
│  - audioReports (quality issues)                             │
│  - audioApprovals (approval workflow)                        │
│  - users (auth + roles)                                      │
│                                                               │
│  Functions:                                                   │
│  - onReportCreated (notify QA team)                          │
│  - onApproval (move to production)                           │
│  - onRejection (notify admin)                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
        ▲                                    ▲
        │                                    │
        │                                    │
┌───────┴────────┐                  ┌────────┴────────┐
│   USER APP     │                  │    QA APP       │
│ (React Native) │                  │ (React Native)  │
├────────────────┤                  ├─────────────────┤
│ ✓ CAPTCHA      │                  │ ✓ Auth Required │
│ ✓ Playback     │                  │ ✓ Report Tool   │
│ ✓ Clean UI     │                  │ ✓ Regen Preview │
│ ✓ Lessons Only │                  │ ✓ Approval UI   │
│ ✗ No Editing   │                  │ ✓ Admin Panel   │
└────────────────┘                  └─────────────────┘
```

## Key Differences: User vs QA App

| Feature | User App | QA App |
|---------|----------|--------|
| **Auth** | Optional (CAPTCHA only) | Required (Firebase Auth) |
| **Access** | Public | Internal team only |
| **Audio Source** | Production (`audio-lessons/`) | Staging + Production |
| **UI Complexity** | Simple, clean | Power tools, detailed |
| **Audio Control** | Play, pause, seek | + Report, preview, approve |
| **Permissions** | Read-only | Write (with approval) |
| **Target Users** | Language learners | QA team, admins |

## Data Flow: Audio Correction Workflow

```
1. QA DISCOVERS ISSUE
   Employee plays lesson3, hears cut word at 50.2s
   
2. REPORT CREATION
   Tap "Report Issue" → Modal appears
   - Auto-filled: lesson3, segment #45, timestamp 50200ms
   - Select issue type: "Cut/Truncated Audio"
   - Add note: "σμέ syllable is cut short"
   
3. REGENERATION REQUEST
   Backend triggers:
   - Extract text from metadata (segment #45)
   - Call OpenAI TTS with improved formatting
   - Save to audio-qa-staging/lesson3-segment45-v2.mp3
   
4. QA PREVIEW
   Employee sees notification
   - Play original segment (bad)
   - Play regenerated segment (hopefully good)
   
5. DECISION
   Option A: APPROVE
   - Move to audio-qa-staging/lesson3-v2.mp3 (full lesson)
   - Run lesson reconstructor (inject fixed segment)
   - Update metadata with repair info
   - Move to production after final check
   
   Option B: REJECT
   - Archive to audio-qa-rejected/
   - Create admin review ticket
   - Add to manual review queue for you
```

## Roles & Permissions

### User (Main App)
- No account needed
- CAPTCHA verification
- Read-only access
- Can play lessons
- Cannot report issues
- No data collection

### QA Employee (QA App)
- Firebase Auth account required
- Role: `qa_tester`
- Permissions:
  - Report audio issues
  - Preview regenerated audio
  - Approve/reject fixes
  - View QA dashboard
- Cannot:
  - Delete production audio
  - Access admin panel
  - Override rejections

### Admin (QA App)
- Firebase Auth account
- Role: `admin`
- Permissions:
  - All QA permissions
  - View rejected queue
  - Override decisions
  - Delete/rollback changes
  - Manage QA team accounts
  - Access analytics

## Technical Architecture

### Shared Components
- React Native (both apps)
- Firebase SDK
- Audio player (same core)
- Lesson fetching logic
- Metadata parsing

### User App Specific
- Cloudflare Turnstile CAPTCHA
- Simplified navigation
- No Firebase Auth
- Minimal UI
- Offline capable

### QA App Specific
- Firebase Authentication
- Admin panel
- Report creation UI
- Audio diff player (A/B compare)
- Approval workflow UI
- Real-time notifications
- Analytics dashboard

## OpenAI TTS: Preventing Cut Words

### Common Causes & Solutions

#### 1. Ellipsis Issues
**Problem:** `"Γεια..."` might get cut after "Γεια"
```typescript
// BAD:
text: "Γεια σου..."

// BETTER:
text: '"Γεια σου" (pause)'
// Or use silence marker: "Γεια σου[pause 1s]"
```

#### 2. Quote Placement
**Problem:** Quotes can confuse TTS prosody
```typescript
// BAD:
text: '"Καλημέρα..."'  // Trailing ellipsis + quote

// BETTER:
text: 'Καλημέρα'       // Clean text
// Add pauses separately via [pause Xs]
```

#### 3. Special Characters
**Problem:** Greek accents + punctuation can cause issues
```typescript
// SAFER:
- Remove trailing punctuation before TTS
- Add it back in text display only
- Let [pause Xs] markers handle timing
```

#### 4. Text Length
**Problem:** Very short or very long texts
```typescript
// TOO SHORT (might truncate):
text: "Γ"  // Single character

// BETTER:
text: "Γ (gamma)"  // Add context
// Or minimum 2-3 characters

// TOO LONG (might timeout):
text: "Very long paragraph..."  // >500 chars

// BETTER:
// Split into smaller chunks
```

#### 5. Token Boundaries
**Problem:** API might cut at token boundary
```typescript
// SAFER FORMATTING:
const formattedText = text
  .trim()                    // Remove whitespace
  .replace(/\.\.\.$/,'')     // Remove trailing ellipsis
  .replace(/[!?]+$/,'')      // Remove trailing punctuation
  
// Generate audio
await generateTTS(formattedText, { 
  voice: 'alloy',
  speed: 0.95,  // Slightly slower = less cutting
  format: 'mp3'
});
```

### Recommended TTS Settings

```typescript
const TTS_CONFIG = {
  // Use slower speed for clearer pronunciation
  speed: 0.90,  // 10% slower than default
  
  // Format text before sending
  preProcess: (text) => {
    return text
      .trim()
      .replace(/\.\.\.$/,'')   // Remove ellipsis
      .replace(/^["']|["']$/g,'')  // Remove quotes
      .normalize('NFC');       // Normalize Unicode
  },
  
  // Add padding silence to prevent edge cuts
  addPadding: true,
  paddingMs: 100,  // 100ms silence before/after
  
  // Retry on suspicious lengths
  retryIfShorterThan: (expectedDuration) => {
    return expectedDuration * 0.8;  // Retry if <80% expected
  }
};
```

## Database Schema

### Firestore: `audioReports` Collection

```typescript
interface AudioReport {
  id: string;                    // Auto-generated
  reportedBy: string;            // QA employee user ID
  reportedAt: Timestamp;
  
  // Location info
  lessonId: string;              // "lesson3"
  languageId: string;            // "greek"
  levelId: string;               // "level1"
  segmentIndex: number;          // 45
  timestampMs: number;           // 50200
  
  // Issue details
  issueType: 'cut' | 'silent' | 'wrong_audio' | 'quality' | 'other';
  description: string;           // "σμέ syllable is cut short"
  originalText: string;          // From metadata
  
  // Workflow status
  status: 'pending' | 'regenerating' | 'ready_for_review' | 'approved' | 'rejected' | 'archived';
  
  // Regenerated audio
  stagingAudioUrl?: string;      // Temp regenerated audio
  regeneratedAt?: Timestamp;
  regenerationAttempts: number;  // Track retries
  
  // Resolution
  reviewedBy?: string;           // QA or admin user ID
  reviewedAt?: Timestamp;
  decision?: 'approve' | 'reject';
  reviewNotes?: string;
  
  // Admin escalation (if rejected)
  escalatedToAdmin: boolean;
  adminReviewedBy?: string;
  adminReviewedAt?: Timestamp;
  finalDecision?: 'fix_manually' | 'keep_as_is' | 'regen_with_settings';
}
```

### Firestore: `users` Collection

```typescript
interface User {
  uid: string;
  email: string;
  role: 'qa_tester' | 'admin';
  displayName: string;
  createdAt: Timestamp;
  
  // Stats (for QA leaderboard)
  stats: {
    reportsCreated: number;
    reportsApproved: number;
    reportsRejected: number;
    accuracyRate: number;  // Approved / Total
  };
  
  // Permissions
  permissions: {
    canReport: boolean;
    canApprove: boolean;
    canAccessAdmin: boolean;
  };
}
```

## Implementation Phases

### Phase 1: Infrastructure (2-3 days)
- [ ] Set up Firestore collections
- [ ] Create Firebase Functions for workflow
- [ ] Add staging storage buckets
- [ ] Set up authentication for QA app

### Phase 2: QA App Core (3-5 days)
- [ ] Clone current app, rename to QA version
- [ ] Add Firebase Auth UI
- [ ] Build report creation modal
- [ ] Implement A/B audio comparison
- [ ] Create approval workflow UI

### Phase 3: Backend Automation (2-3 days)
- [ ] Audio regeneration service
- [ ] Lesson reconstruction integration
- [ ] Notification system
- [ ] Admin review queue

### Phase 4: User App Protection (1-2 days)
- [ ] Integrate Cloudflare Turnstile
- [ ] Remove QA features from main app
- [ ] Clean up UI for end users
- [ ] Add bot detection

### Phase 5: Testing & Rollout (2-3 days)
- [ ] Test full workflow with team
- [ ] Document QA procedures
- [ ] Train QA employees
- [ ] Soft launch to beta testers

**Total Estimated Time: 10-16 days**

## Cost Analysis

### Free Tier Coverage
- ✅ Firebase Auth (unlimited)
- ✅ Firestore (50k reads/day free)
- ✅ Storage (5GB free)
- ✅ Cloudflare Turnstile (100k requests/month free)
- ✅ Firebase Functions (2M invocations/month free)

### Paid Costs
- 💰 OpenAI TTS regeneration: $0.015 per 1000 chars
  - Estimate: 50 regenerations/week × 100 chars = $0.075/week
  - Monthly: ~$0.30
- 💰 Firebase over limits (unlikely for small team)

**Total additional cost: <$1/month** 🎯

## Success Metrics

### Audio Quality
- % of lessons with reported issues
- Average issues per lesson
- Regeneration success rate
- Time to resolution

### QA Efficiency
- Reports per QA employee per week
- Approval vs rejection rate
- Admin escalation rate
- Average review time

### User Experience
- CAPTCHA pass rate
- User retention
- Lesson completion rate
- Feedback from beta testers

## Next Steps

1. **Review architecture** - Approve overall design
2. **Choose implementation phase** - Start with Phase 1 or Phase 2?
3. **Set up Firebase collections** - Create schema
4. **Design UI mockups** - Sketch QA app workflow
5. **Write detailed specs** - Individual markdown files for each app

---

**This architecture is scalable, maintainable, and cost-effective!**

