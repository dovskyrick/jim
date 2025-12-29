# Employee QA App - Design & Architecture

**Date:** December 29, 2025  
**Status:** Architecture Planning  
**Target Users:** Internal QA Team & Admins

## Overview

Professional audio quality control app for employees to identify, report, and approve audio corrections. Full workflow from issue detection to production deployment.

## Core Principles

1. **Efficiency First** - Fast reporting, quick previews
2. **Quality Control** - Systematic approval workflow
3. **Accountability** - All actions tracked and attributed
4. **Power Tools** - Advanced features for QA professionals
5. **Admin Oversight** - Escalation path for disputes

## User Roles & Permissions

### QA Tester
**Responsibilities:**
- Listen to all lessons systematically
- Report audio quality issues
- Preview regenerated audio
- Approve or reject fixes
- Meet quality targets

**Permissions:**
- ✅ Access all lessons (production + staging)
- ✅ Create audio reports
- ✅ Approve regenerated audio
- ✅ Reject to admin review
- ❌ Delete production audio
- ❌ Override admin decisions
- ❌ Manage users

### Admin
**Responsibilities:**
- Review rejected reports
- Make final decisions
- Manage QA team
- Monitor quality metrics
- Handle edge cases

**Permissions:**
- ✅ All QA permissions
- ✅ View admin panel
- ✅ Override decisions
- ✅ Delete/rollback audio
- ✅ Manage team members
- ✅ Access analytics

## Screen Architecture

### 1. Login Screen
```
┌─────────────────────────────────┐
│                                  │
│     🎧 QA Audio Tool 🎧         │
│                                  │
│  ┌─────────────────────────┐   │
│  │ Email                    │   │
│  └─────────────────────────┘   │
│                                  │
│  ┌─────────────────────────┐   │
│  │ Password                 │   │
│  └─────────────────────────┘   │
│                                  │
│  [Sign In with Firebase]        │
│                                  │
│  Forgot password?               │
│                                  │
└─────────────────────────────────┘

Authentication:
- Firebase Auth required
- Email/password only (secure)
- Role-based access (Firestore check)
- Session persists locally
```

### 2. Dashboard (Home)
```
┌─────────────────────────────────┐
│  QA Dashboard     👤 John       │
├─────────────────────────────────┤
│                                  │
│  📊 My Stats (This Week)        │
│  ┌───────────────────────────┐ │
│  │ Reports Created:    12     │ │
│  │ Approved:           8      │ │
│  │ Rejected:           4      │ │
│  │ Accuracy Rate:      67%    │ │
│  └───────────────────────────┘ │
│                                  │
│  🎯 Active Reports              │
│  ┌───────────────────────────┐ │
│  │ [3] Pending Review         │ │
│  │ [5] Ready for Approval     │ │
│  │ [2] Awaiting Admin         │ │
│  └───────────────────────────┘ │
│                                  │
│  📚 Quick Actions               │
│  [Start QA Session]             │
│  [View My Reports]              │
│  [Admin Panel] ← (Admin only)  │
│                                  │
└─────────────────────────────────┘
```

### 3. QA Session Screen
```
┌─────────────────────────────────┐
│  ← Dashboard     QA Session     │
├─────────────────────────────────┤
│  Greek > Level 1 > Lesson 3     │
│                                  │
│  Progress: Segment 12 / 173     │
│  ▬▬●▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬    │
│                                  │
│  🔊 Current Segment:             │
│  "Είμαι κουρασμένος..."         │
│  (Trainee answer)                │
│                                  │
│  ⏮  ⏪  ▶  ⏩  ⏭                │
│                                  │
│  🎚️ ▬▬▬▬▬▬▬▬●▬▬▬▬▬▬▬▬▬▬▬▬▬▬   │
│  2:35                      5:45  │
│                                  │
│  ┌─────────────────────────┐   │
│  │  ✅ Audio OK             │   │
│  │  ⚠️  Report Issue        │   │
│  └─────────────────────────┘   │
│                                  │
│  [< Prev Segment] [Next Segment >] │
│                                  │
└─────────────────────────────────┘

Features:
- Segment-by-segment review
- Keyboard shortcuts
- Quick report button
- Progress tracking
```

### 4. Report Issue Modal
```
┌─────────────────────────────────┐
│  Report Audio Issue         ✕   │
├─────────────────────────────────┤
│                                  │
│  Lesson: Greek L1 / Lesson 3    │
│  Segment: #45                    │
│  Time: 2:35.200                  │
│  Text: "Είμαι κουρασμένος"      │
│                                  │
│  Issue Type:                     │
│  ○ Silent/Missing Audio          │
│  ● Cut/Truncated Audio ←         │
│  ○ Wrong Audio                   │
│  ○ Low Quality                   │
│  ○ Other                         │
│                                  │
│  Description:                    │
│  ┌─────────────────────────┐   │
│  │ "σμέ" syllable is cut   │   │
│  │ short, sounds like "σμ" │   │
│  │                          │   │
│  └─────────────────────────┘   │
│                                  │
│  [Cancel]    [Submit Report]    │
│                                  │
└─────────────────────────────────┘

Auto-filled:
- Lesson ID
- Segment index
- Timestamp
- Original text
```

### 5. Review Queue Screen
```
┌─────────────────────────────────┐
│  ← Dashboard     Review Queue   │
├─────────────────────────────────┤
│                                  │
│  🔄 Ready for Review (5)        │
│                                  │
│  ┌───────────────────────────┐ │
│  │ Greek L1 / Lesson 2        │ │
│  │ Segment #45 • 2:35         │ │
│  │ Issue: Cut Audio           │ │
│  │ Reported: 2h ago           │ │
│  │ [Review →]                 │ │
│  └───────────────────────────┘ │
│                                  │
│  ┌───────────────────────────┐ │
│  │ Greek L1 / Lesson 3        │ │
│  │ Segment #12 • 0:50         │ │
│  │ Issue: Wrong Audio         │ │
│  │ Reported: 5h ago           │ │
│  │ [Review →]                 │ │
│  └───────────────────────────┘ │
│                                  │
│  [Load More]                    │
│                                  │
└─────────────────────────────────┘

Filters:
- By issue type
- By language
- By reporter
- By date
```

### 6. Audio Review Screen
```
┌─────────────────────────────────┐
│  ← Queue     Review #R001234    │
├─────────────────────────────────┤
│                                  │
│  Report Details:                 │
│  • Greek L1 / Lesson 2 / #45    │
│  • Reported by: John D.         │
│  • Issue: Cut/Truncated Audio   │
│  • "σμέ syllable is cut short"  │
│                                  │
│  📻 Original Audio:              │
│  "Είμαι κουρασμένος..."         │
│  [▶ Play Original] 0:00 / 1.2s  │
│                                  │
│  🔄 Regenerated Audio:           │
│  "Είμαι κουρασμένος..."         │
│  [▶ Play Regenerated] 0:00/1.4s │
│                                  │
│  🎧 Compare (A/B):               │
│  [◀ Original] [▶▶ Regenerated]  │
│                                  │
│  Decision:                       │
│  ┌─────────────────────────┐   │
│  │ ✅ Approve & Deploy      │   │
│  │ ⚠️  Reject & Escalate    │   │
│  │ 🔄 Regenerate Again      │   │
│  └─────────────────────────┘   │
│                                  │
│  Notes: _____________________   │
│                                  │
└─────────────────────────────────┘

A/B Comparison:
- Quick toggle between versions
- Visual waveform (optional)
- Playback speed control
```

### 7. Admin Panel
```
┌─────────────────────────────────┐
│  ← Dashboard     Admin Panel    │
├─────────────────────────────────┤
│                                  │
│  🚨 Escalated Reports (2)       │
│  ┌───────────────────────────┐ │
│  │ Report #R001230            │ │
│  │ Rejected by: Sarah K.      │ │
│  │ Reason: "Still sounds cut" │ │
│  │ Attempts: 3                │ │
│  │ [Review →]                 │ │
│  └───────────────────────────┘ │
│                                  │
│  👥 Team Management             │
│  ┌───────────────────────────┐ │
│  │ John D.  (QA)  [Edit]      │ │
│  │ Sarah K. (QA)  [Edit]      │ │
│  │ Mike L.  (Admin) [Edit]    │ │
│  │ [+ Add Team Member]        │ │
│  └───────────────────────────┘ │
│                                  │
│  📊 System Stats                │
│  • Pending Reports: 8           │
│  • Avg Resolution Time: 2.3h   │
│  • Success Rate: 94%            │
│                                  │
└─────────────────────────────────┘
```

### 8. Admin Review Screen
```
┌─────────────────────────────────┐
│  ← Admin     Report #R001230    │
├─────────────────────────────────┤
│                                  │
│  📜 Report History:              │
│  1. Created by John D. (3d ago) │
│  2. Regenerated (3d ago)        │
│  3. Rejected by Sarah (2d ago)  │
│     "Still sounds cut"           │
│  4. Regenerated (2d ago)        │
│  5. Rejected by Sarah (2d ago)  │
│     "Worse than original"        │
│  6. Escalated to Admin          │
│                                  │
│  🎧 Audio Versions:              │
│  [Original] [Regen v1] [Regen v2] │
│                                  │
│  Admin Decision:                 │
│  ┌─────────────────────────┐   │
│  │ ✅ Approve One Version   │   │
│  │ 🔄 Try Different Format  │   │
│  │ ✍️  Manual Fix Required  │   │
│  │ ⏸️  Keep Original        │   │
│  └─────────────────────────┘   │
│                                  │
│  Admin Notes: ________________  │
│                                  │
│  [Submit Decision]              │
│                                  │
└─────────────────────────────────┘
```

## Workflow Diagrams

### Report Creation Flow
```
QA listens to segment
        ↓
Hears issue (cut audio)
        ↓
Taps "Report Issue"
        ↓
Fills form (auto-populated)
        ↓
Submits report
        ↓
Backend triggers:
  - Extract segment text from metadata
  - Apply improved formatting
  - Call OpenAI TTS
  - Save to staging bucket
  - Update report status: "ready_for_review"
  - Notify QA team
```

### Approval Flow
```
QA opens review queue
        ↓
Selects report
        ↓
Plays original audio (bad)
        ↓
Plays regenerated audio (good?)
        ↓
        ├─ APPROVE
        │     ↓
        │  Backend triggers:
        │  - Run lesson reconstructor
        │  - Inject new audio at timestamp
        │  - Update lesson in staging
        │  - Test reconstruction
        │  - Deploy to production
        │  - Update report: "approved"
        │  - Update QA stats
        │
        └─ REJECT
              ↓
           Add rejection notes
              ↓
           Backend triggers:
           - Move audio to rejected folder
           - Increment attempt counter
           - If attempts < 3:
               → Regenerate with different settings
               → Back to review queue
           - If attempts >= 3:
               → Escalate to admin
               → Notify admin team
```

### Admin Escalation Flow
```
Report rejected 3 times
        ↓
Auto-escalate to admin
        ↓
Admin receives notification
        ↓
Admin reviews:
  - Original audio
  - All regeneration attempts
  - Rejection notes
        ↓
        ├─ Approve specific version
        │     ↓
        │  Deploy chosen version
        │  Close report
        │
        ├─ Try different TTS format
        │     ↓
        │  Manual formatting rules
        │  Regenerate → back to QA
        │
        ├─ Manual fix required
        │     ↓
        │  Mark for manual editing
        │  Assign to audio engineer
        │
        └─ Keep original
              ↓
           Document decision
           Close report
           Original stays in production
```

## Key Features

### 1. Segment-Level Audio Selection

```typescript
// components/AudioSegmentSelector.tsx
export const AudioSegmentSelector: React.FC = () => {
  const [metadata, setMetadata] = useState<LessonMetadata | null>(null);
  const [currentSegment, setCurrentSegment] = useState(0);
  const audioRef = useRef<Audio.Sound>();
  
  const playSegment = async (segmentIndex: number) => {
    const segment = metadata.segments[segmentIndex];
    
    // Skip silence segments
    if (segment.type === 'silence') {
      setCurrentSegment(segmentIndex + 1);
      return;
    }
    
    // Seek to segment start
    await audioRef.current?.setPositionAsync(segment.startMs);
    
    // Play for segment duration
    await audioRef.current?.playAsync();
    
    // Auto-stop after segment ends
    setTimeout(async () => {
      await audioRef.current?.pauseAsync();
      setCurrentSegment(segmentIndex + 1); // Auto-advance
    }, segment.durationMs);
  };
  
  return (
    <View>
      <Text>Segment {currentSegment} / {metadata.segments.length}</Text>
      <Text>{metadata.segments[currentSegment].text}</Text>
      
      <Button title="◀ Prev" onPress={() => playSegment(currentSegment - 1)} />
      <Button title="▶ Play" onPress={() => playSegment(currentSegment)} />
      <Button title="Next ▶" onPress={() => playSegment(currentSegment + 1)} />
      
      <Button 
        title="⚠️ Report Issue" 
        onPress={() => openReportModal(currentSegment)}
      />
    </View>
  );
};
```

### 2. A/B Audio Comparison

```typescript
// components/AudioComparer.tsx
export const AudioComparer: React.FC<{ report: AudioReport }> = ({ report }) => {
  const [playing, setPlaying] = useState<'original' | 'regenerated' | null>(null);
  const originalAudio = useRef<Audio.Sound>();
  const regeneratedAudio = useRef<Audio.Sound>();
  
  const playOriginal = async () => {
    await regeneratedAudio.current?.stopAsync();
    await originalAudio.current?.replayAsync();
    setPlaying('original');
  };
  
  const playRegenerated = async () => {
    await originalAudio.current?.stopAsync();
    await regeneratedAudio.current?.replayAsync();
    setPlaying('regenerated');
  };
  
  const toggleAB = async () => {
    if (playing === 'original') {
      await playRegenerated();
    } else {
      await playOriginal();
    }
  };
  
  return (
    <View>
      <Button 
        title={`▶ Original ${playing === 'original' ? '(Playing)' : ''}`}
        onPress={playOriginal}
        color={playing === 'original' ? 'blue' : 'gray'}
      />
      
      <Button 
        title={`▶ Regenerated ${playing === 'regenerated' ? '(Playing)' : ''}`}
        onPress={playRegenerated}
        color={playing === 'regenerated' ? 'green' : 'gray'}
      />
      
      <Button 
        title="⏮⏭ Toggle A/B"
        onPress={toggleAB}
      />
    </View>
  );
};
```

### 3. Real-Time Notifications

```typescript
// services/notification-service.ts
export class NotificationService {
  /**
   * Subscribe to report updates
   */
  static subscribeToReports(userId: string, onUpdate: (report: AudioReport) => void) {
    return firestore()
      .collection('audioReports')
      .where('status', '==', 'ready_for_review')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            onUpdate(change.doc.data() as AudioReport);
            
            // Show push notification
            this.sendPushNotification({
              title: 'New Audio Ready for Review',
              body: `Report #${change.doc.id} is ready`,
              data: { reportId: change.doc.id }
            });
          }
        });
      });
  }
  
  /**
   * Subscribe to admin escalations
   */
  static subscribeToEscalations(onEscalation: (report: AudioReport) => void) {
    return firestore()
      .collection('audioReports')
      .where('escalatedToAdmin', '==', true)
      .where('adminReviewedAt', '==', null)
      .onSnapshot((snapshot) => {
        snapshot.forEach((doc) => {
          onEscalation(doc.data() as AudioReport);
          
          this.sendPushNotification({
            title: '🚨 Admin Review Needed',
            body: `Report #${doc.id} needs your attention`,
            data: { reportId: doc.id, priority: 'high' }
          });
        });
      });
  }
}
```

### 4. Keyboard Shortcuts (Power User Feature)

```typescript
// hooks/useKeyboardShortcuts.ts
export const useKeyboardShortcuts = (handlers: {
  onPlayPause?: () => void;
  onNextSegment?: () => void;
  onPrevSegment?: () => void;
  onReport?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch(event.key) {
        case ' ':         // Spacebar
          event.preventDefault();
          handlers.onPlayPause?.();
          break;
        case 'ArrowRight':
          handlers.onNextSegment?.();
          break;
        case 'ArrowLeft':
          handlers.onPrevSegment?.();
          break;
        case 'r':
          handlers.onReport?.();
          break;
        case 'a':
          handlers.onApprove?.();
          break;
        case 'd':
          handlers.onReject?.();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);
};

// Usage in QA Session screen:
useKeyboardShortcuts({
  onPlayPause: togglePlay,
  onNextSegment: nextSegment,
  onPrevSegment: prevSegment,
  onReport: openReportModal,
});
```

## Backend Services (Firebase Functions)

### 1. Report Creation Handler

```typescript
// functions/src/onReportCreated.ts
export const onReportCreated = functions.firestore
  .document('audioReports/{reportId}')
  .onCreate(async (snapshot, context) => {
    const report = snapshot.data() as AudioReport;
    
    console.log(`New report created: ${context.params.reportId}`);
    
    // Extract segment info from metadata
    const metadata = await loadLessonMetadata(
      report.languageId,
      report.levelId,
      report.lessonId
    );
    
    const segment = metadata.segments[report.segmentIndex];
    
    if (!segment || !segment.text) {
      console.error('Invalid segment');
      return;
    }
    
    // Apply improved TTS formatting
    const formattedText = applyTTSFormatting(segment.text, report.issueType);
    
    // Call OpenAI TTS
    try {
      const audioBuffer = await generateTTS(formattedText, {
        voice: 'alloy',
        speed: 0.95,  // Slightly slower
        format: 'mp3'
      });
      
      // Save to staging
      const stagingPath = `audio-qa-staging/${report.lessonId}-segment${report.segmentIndex}-v1.mp3`;
      await admin.storage().bucket().file(stagingPath).save(audioBuffer);
      
      // Update report
      await snapshot.ref.update({
        status: 'ready_for_review',
        stagingAudioUrl: await getDownloadURL(stagingPath),
        regeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        regenerationAttempts: 1
      });
      
      // Notify QA team
      await sendNotificationToTeam('qa_tester', {
        title: 'Audio Ready for Review',
        body: `Report #${context.params.reportId}`,
        data: { reportId: context.params.reportId }
      });
      
    } catch (error) {
      console.error('TTS generation failed:', error);
      await snapshot.ref.update({
        status: 'failed',
        error: error.message
      });
    }
  });
```

### 2. Approval Handler

```typescript
// functions/src/onApproval.ts
export const onApproval = functions.firestore
  .document('audioReports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as AudioReport;
    const after = change.after.data() as AudioReport;
    
    // Check if status changed to approved
    if (before.status !== 'approved' && after.status === 'approved') {
      console.log(`Report approved: ${context.params.reportId}`);
      
      // Run lesson reconstructor
      await reconstructLesson({
        lessonId: after.lessonId,
        languageId: after.languageId,
        levelId: after.levelId,
        segmentIndex: after.segmentIndex,
        newAudioUrl: after.stagingAudioUrl!
      });
      
      // Update QA stats
      await updateQAStats(after.reviewedBy!, {
        approved: admin.firestore.FieldValue.increment(1)
      });
      
      // Notify reporter
      await sendNotification(after.reportedBy, {
        title: 'Report Approved ✅',
        body: `Your report #${context.params.reportId} was approved`,
      });
    }
    
    // Check if escalated to admin
    if (!before.escalatedToAdmin && after.escalatedToAdmin) {
      console.log(`Report escalated: ${context.params.reportId}`);
      
      // Notify admins
      await sendNotificationToTeam('admin', {
        title: '🚨 Report Needs Admin Review',
        body: `Report #${context.params.reportId}`,
        priority: 'high'
      });
    }
  });
```

## TTS Formatting Improvements

### Smart Formatting Based on Issue Type

```typescript
// utils/tts-formatter.ts
export function applyTTSFormatting(
  text: string, 
  issueType: AudioReport['issueType']
): string {
  // Base cleanup
  let formatted = text
    .trim()
    .replace(/^["']|["']$/g, '')  // Remove quotes
    .replace(/\.\.\.$/,'')         // Remove ellipsis
    .normalize('NFC');             // Normalize Unicode
  
  // Issue-specific formatting
  switch(issueType) {
    case 'cut':
      // Add padding spaces to prevent cutting
      formatted = ` ${formatted} `;
      // Add slight pause markers at syllable boundaries (Greek)
      formatted = formatted.replace(/([αεηιουω])([βγδζθκλμνξπρστφχψ])/gi, '$1 $2');
      break;
      
    case 'silent':
      // Emphasize the word
      formatted = `"${formatted}!"`;
      break;
      
    case 'quality':
      // Slower speech
      formatted = `${formatted}.`;
      break;
      
    case 'wrong_audio':
      // Clean, simple format
      // (no special formatting)
      break;
  }
  
  return formatted;
}
```

### Regeneration Strategy

```typescript
// services/regeneration-service.ts
export class RegenerationService {
  /**
   * Regenerate audio with progressive strategies
   */
  static async regenerate(
    text: string,
    attemptNumber: number
  ): Promise<Buffer> {
    // Try different strategies based on attempt
    const strategies = [
      // Attempt 1: Basic cleanup
      { 
        text: applyTTSFormatting(text, 'cut'),
        voice: 'alloy',
        speed: 1.0
      },
      
      // Attempt 2: Slower speed
      {
        text: applyTTSFormatting(text, 'cut'),
        voice: 'alloy',
        speed: 0.85
      },
      
      // Attempt 3: Different voice
      {
        text: applyTTSFormatting(text, 'cut'),
        voice: 'echo',  // Different voice model
        speed: 0.90
      },
      
      // Attempt 4: Extreme formatting
      {
        text: ` . ${text} . `,  // Heavy padding
        voice: 'alloy',
        speed: 0.80
      }
    ];
    
    const strategy = strategies[Math.min(attemptNumber - 1, strategies.length - 1)];
    
    return await openai.audio.speech.create({
      model: 'tts-1',
      ...strategy
    });
  }
}
```

## Analytics Dashboard

### QA Team Stats

```typescript
// screens/QAStatsScreen.tsx
export const QAStatsScreen: React.FC = () => {
  const [stats, setStats] = useState<TeamStats | null>(null);
  
  return (
    <ScrollView>
      <Text style={styles.title}>Team Performance</Text>
      
      {/* Individual QA stats */}
      {stats.members.map(member => (
        <Card key={member.uid}>
          <Text>{member.displayName}</Text>
          <Text>Reports Created: {member.stats.reportsCreated}</Text>
          <Text>Approved: {member.stats.reportsApproved}</Text>
          <Text>Rejected: {member.stats.reportsRejected}</Text>
          <Text>
            Accuracy: {member.stats.accuracyRate.toFixed(1)}%
          </Text>
          
          <ProgressBar 
            progress={member.stats.accuracyRate / 100}
            color={member.stats.accuracyRate > 80 ? 'green' : 'orange'}
          />
        </Card>
      ))}
      
      {/* System-wide stats */}
      <Card>
        <Text style={styles.subtitle}>System Stats</Text>
        <Text>Total Reports: {stats.totalReports}</Text>
        <Text>Avg Resolution Time: {stats.avgResolutionTime}h</Text>
        <Text>Success Rate: {stats.successRate}%</Text>
        <Text>Admin Escalations: {stats.escalations}</Text>
      </Card>
    </ScrollView>
  );
};
```

## Testing Workflow

### QA Onboarding Checklist

```
□ Install QA app on device
□ Receive login credentials
□ Complete tutorial (sample report)
□ Report 3 test issues
□ Approve 2 test regenerations
□ Reject 1 test regeneration
□ Review admin panel (admins only)
□ Understand escalation process
□ Learn keyboard shortcuts
□ Meet accuracy target (80%+)
```

### Daily QA Routine

```
1. Morning (9 AM):
   - Check review queue
   - Approve/reject pending reports
   
2. Mid-day (12 PM):
   - Start new QA session
   - Review 2-3 lessons systematically
   - Report any issues found
   
3. Afternoon (3 PM):
   - Check review queue again
   - Handle any escalations
   
4. End of day (5 PM):
   - Update stats
   - Leave notes for next shift
```

## Deployment

### Build Separate Apps

```bash
# User App
cd LanguageAudioPlayer
expo build:ios --release-channel production
expo build:android --release-channel production

# QA App
cd LanguageAudioPlayerQA
expo build:ios --release-channel production
expo build:android --release-channel production
```

### Internal Distribution

**iOS:**
- Use TestFlight for internal team
- Distribute via email invite
- No App Store submission needed

**Android:**
- Use Google Play Internal Test Track
- Or distribute APK directly
- No public release needed

---

**Professional, efficient, and accountable QA workflow!** 🎯

