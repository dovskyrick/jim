# 9. Vocab Repair Tool (Vocab Doctor)

## Purpose

Sometimes TTS APIs can return silent or corrupted audio files. The **Vocab Doctor** automatically detects and repairs these "holes" in your vocabulary library.

## The Problem

**Silent Audio Files Can Occur When:**
- OpenAI TTS API fails silently
- Network interruption during download
- Disk write errors
- Rate limiting or API throttling
- Random API glitches

These silent files break your lessons and are hard to detect manually.

## The Solution

The Vocab Doctor script:
1. 🔍 **Scans** all vocab audio files using FFmpeg
2. 📊 **Analyzes** audio volume levels
3. 🕳️ **Detects** silent files (< -50dB max volume)
4. 🔧 **Repairs** by regenerating from OpenAI TTS
5. 📋 **Reports** detailed results

## How to Use

### Basic Usage

```bash
cd AudioGeneration
npm run repair-vocab
```

### What Happens

```
🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺
   Vocab Doctor - Audio Repair Tool
   Detecting and fixing silent audio files
🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺🩺

📚 Found vocab libraries in:
   - greek/level1
   - french/level1

============================================================
🩺 Vocab Doctor: Diagnosing greek/level1
============================================================

📊 Analyzing 29 audio files...

[1/29] Checking: 00001.mp3 ("Γεια σου")
   ✅ Audio OK (max volume: -15.2 dB)

[2/29] Checking: 00002.mp3 ("Γεια σας")
   🔇 Silent audio detected (max volume: -91.0 dB)
   🕳️  Hole detected!
   🔧 Repairing: "Γεια σας"
   🎙️  Generating audio...
   ✅ Repaired successfully

...

============================================================
📋 REPAIR SUMMARY
============================================================
Total files scanned:    29
Holes found:            3 🕳️
Holes repaired:         3 ✅
Holes still broken:     0 ❌
============================================================

🎯 Repair success rate: 100%

✨ All holes successfully repaired!
```

## Detection Logic

### Silent Audio Detection
- **File size < 1KB**: Considered suspicious/corrupt
- **Max volume < -35dB**: Considered too quiet/silent
- **Normal speech**: -20dB to -5dB
- **Quiet but audible**: -30dB to -20dB
- **FFmpeg analysis fails**: Considered corrupt

### Adjusting Sensitivity
If you find the threshold too strict or too lenient, edit the constant in `src/vocab-repair.ts`:

```typescript
private readonly SILENCE_THRESHOLD_DB = -35; // Change this value
```

- **More sensitive** (catch more files): `-30` or `-25`
- **Less sensitive** (catch fewer files): `-40` or `-50`

### Conservative Approach
- If analysis is inconclusive, assumes file is OK
- Only repairs files that are clearly problematic
- Prevents unnecessary TTS API calls

## Repair Strategy

### Single-Try Per Hole
- Each hole gets **ONE repair attempt** per run
- Prevents infinite loops
- Prevents OpenAI rate limiting / blacklisting

### Failed Repairs
- If repair still results in silence, it's marked as failed
- Run the script again to retry failed repairs
- Different API call might succeed

### Rate Limiting Protection
- 1 second delay between repairs
- Prevents overwhelming OpenAI API
- Safe to run multiple times

## When to Run

### Regular Maintenance
- After generating new vocab files
- Before deploying lessons to production
- Weekly health check

### After Errors
- If lessons have silent sections
- After network interruptions
- After OpenAI API issues

### Before Backup
- Run repair before backing up to Google Drive
- Ensures clean backup without corrupted files

## Example Output

### Healthy Library
```
📋 REPAIR SUMMARY
Total files scanned:    29
Holes found:            0 🕳️
Holes repaired:         0 ✅
Holes still broken:     0 ❌

✨ Vocab library is healthy! No issues found.
```

### With Repairs
```
📋 REPAIR SUMMARY
Total files scanned:    29
Holes found:            5 🕳️
Holes repaired:         4 ✅
Holes still broken:     1 ❌

🎯 Repair success rate: 80%

⚠️  Failed repairs (1):
   - 00023.mp3: "κα"
     Error: Failed to repair (still silent after regeneration)

💡 Tip: Run the script again to retry failed repairs.
```

## Technical Details

### FFmpeg Volume Detection
```bash
ffmpeg -i audio.mp3 -af "volumedetect" -f null -
```

Analyzes:
- `max_volume`: Peak volume in dB
- `mean_volume`: Average volume in dB

### Repair Process
1. Detect silent file (< -50dB)
2. Format text: `"Greek text..."`
3. Call OpenAI TTS API
4. Overwrite old file
5. Verify new file is not silent
6. Update manifest timestamp

### Manifest Updates
- `generatedAt` timestamp updated for repaired files
- `source` remains unchanged (vocab1, lesson-generated, etc.)
- Manifest saved only if repairs were successful

## Safety Features

1. **Non-destructive**: Only overwrites confirmed broken files
2. **Verification**: Checks new file after repair
3. **Logging**: Detailed output for debugging
4. **Rate limiting**: Built-in delays
5. **Error tracking**: Lists all failed repairs

## Best Practices

### Before Running
- Ensure OpenAI API key is valid
- Check internet connection
- Close audio files in other programs

### After Running
- Review the summary
- Check failed repairs manually
- Re-run if needed
- Test a few repaired files

### Automation
You could add to a cron job or scheduled task:
```bash
cd /path/to/AudioGeneration && npm run repair-vocab
```

Run weekly or after each batch generation.

## Cost Considerations

- Only generates audio for broken files
- Typical run: 0-5 files repaired
- Cost per repair: ~$0.015 (15 cents per 1M characters)
- Average cost per run: < $0.10

Much cheaper than regenerating entire vocab library!

## Troubleshooting

### "FFmpeg not found"
- Should not happen (we use `ffmpeg-static`)
- Check `node_modules/ffmpeg-static` exists

### "All files detected as silent"
- Check FFmpeg is working: `npm run test`
- Manually play a file to verify
- May be a detection threshold issue

### "Repairs still silent"
- OpenAI API might be having issues
- Try again later
- Check API status: status.openai.com

### "Rate limit errors"
- Increase delay between repairs (line 139)
- Run script in multiple sessions
- Wait and retry

## Future Enhancements

Possible additions:
- Audio quality scoring (beyond just silence)
- Backup original before repair
- Batch repair with confirmation
- Integration with main generation script
- Automatic repair on generation
- Email/Slack notifications

