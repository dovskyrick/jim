#!/usr/bin/env node

import { VocabManager } from './vocab-manager.js';
import { VocabScanner } from './vocab-scanner.js';
import { OpenAITTSService } from './openai-tts.js';
import { config } from './config.js';
import { existsSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

/**
 * Vocab Repair Tool (Vocab Doctor)
 * Detects and repairs silent or corrupted audio files in the vocab library
 */

interface RepairResult {
  totalFiles: number;
  holesFound: number;
  holesRepaired: number;
  holesFailed: number;
  errors: Array<{ filename: string; text: string; error: string }>;
}

class VocabDoctor {
  private ttsService: OpenAITTSService;
  private tempDir: string;
  
  // Silence detection threshold (dB)
  // Normal speech: -20dB to -5dB
  // Adjust this if you find files are too quiet
  private readonly SILENCE_THRESHOLD_DB = -35;
  
  // Minimum file size (bytes) - files smaller than this are suspicious
  private readonly MIN_FILE_SIZE_BYTES = 1000;

  constructor() {
    this.ttsService = new OpenAITTSService();
    this.tempDir = resolve('lessons-audio', 'repair-temp');
  }

  /**
   * Check if an audio file is silent using ffmpeg
   * Returns true if file is silent/corrupted
   */
  private isSilentAudio(filePath: string): boolean {
    if (!existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${filePath}`);
      return true; // Missing file is considered a "hole"
    }

    // Check file size first (very small files are likely corrupt)
    const stats = statSync(filePath);
    if (stats.size < this.MIN_FILE_SIZE_BYTES) {
      console.log(`   ⚠️  File too small (${stats.size} bytes): suspicious`);
      return true;
    }

    try {
      // Use ffmpeg to analyze audio volume
      const ffmpegPath = ffmpegStatic || 'ffmpeg';
      const command = `"${ffmpegPath}" -i "${filePath}" -af "volumedetect" -f null -`;
      
      // FFmpeg outputs volumedetect to stderr, not stdout
      // We need to capture stderr
      let output = '';
      try {
        execSync(command, { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (error: any) {
        // FFmpeg returns non-zero exit code even on success when using -f null
        // The volume info is in stderr which is captured in error.stderr
        output = error.stderr || error.stdout || '';
      }

      // Parse the volumedetect output
      // Look for "max_volume: -XX.X dB"
      const maxVolumeMatch = output.match(/max_volume:\s*([-\d.]+)\s*dB/);
      
      if (maxVolumeMatch) {
        const maxVolume = parseFloat(maxVolumeMatch[1]);
        
        // Silence detection using threshold
        // Normal speech: -20dB to -5dB
        // Quiet but audible: -30dB to -20dB
        // Too quiet / silent: below threshold
        if (maxVolume < this.SILENCE_THRESHOLD_DB) {
          console.log(`   🔇 Too quiet/silent (max volume: ${maxVolume} dB, threshold: ${this.SILENCE_THRESHOLD_DB} dB)`);
          return true;
        }
        
        console.log(`   ✅ Audio OK (max volume: ${maxVolume} dB)`);
        return false;
      }
      
      // If we can't parse volume, assume it's OK (conservative approach)
      console.log(`   ⚠️  Could not analyze volume, assuming OK`);
      return false;

    } catch (error) {
      // If ffmpeg fails, the file might be corrupted
      console.log(`   ❌ FFmpeg analysis failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return true;
    }
  }

  /**
   * Repair a single audio file by regenerating it
   */
  private async repairAudioFile(
    text: string,
    audioPath: string,
    voice: string
  ): Promise<boolean> {
    try {
      console.log(`   🔧 Repairing: "${text}"`);
      
      // Format text with quotes and ellipsis (same as vocab generation)
      const formattedText = `"${text}..."`;
      
      // Generate new audio
      await this.ttsService.generateAndSave(
        {
          text: formattedText,
          voice: voice as any,
        },
        audioPath
      );

      // Verify the new file is not silent
      const stillSilent = this.isSilentAudio(audioPath);
      
      if (stillSilent) {
        console.log(`   ❌ Repair failed: Still silent after regeneration`);
        return false;
      }
      
      console.log(`   ✅ Repaired successfully`);
      return true;

    } catch (error) {
      console.error(`   ❌ Repair failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return false;
    }
  }

  /**
   * Scan and repair vocab library for a specific language/level
   */
  async repairVocabLibrary(languageId: string, levelId: string): Promise<RepairResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🩺 Vocab Doctor: Diagnosing ${languageId}/${levelId}`);
    console.log('='.repeat(60) + '\n');

    const result: RepairResult = {
      totalFiles: 0,
      holesFound: 0,
      holesRepaired: 0,
      holesFailed: 0,
      errors: [],
    };

    // Load vocab manifest
    const vocabManager = new VocabManager();
    await vocabManager.loadManifest(languageId, levelId);
    
    const manifest = vocabManager.getManifest();
    if (!manifest || manifest.entries.length === 0) {
      console.log('⚠️  No vocab entries found in manifest\n');
      return result;
    }

    result.totalFiles = manifest.entries.length;
    console.log(`📊 Analyzing ${result.totalFiles} audio files...\n`);

    // Check each entry
    for (let i = 0; i < manifest.entries.length; i++) {
      const entry = manifest.entries[i];
      const contentDir = resolve('lessons-content', languageId, levelId);
      const audioPath = join(contentDir, entry.audioPath);

      console.log(`\n[${i + 1}/${manifest.entries.length}] Checking: ${entry.filename} ("${entry.text}")`);

      // Check if audio is silent
      const isSilent = this.isSilentAudio(audioPath);

      if (isSilent) {
        result.holesFound++;
        console.log(`   🕳️  Hole detected!`);

        // Attempt repair
        const repaired = await this.repairAudioFile(
          entry.text,
          audioPath,
          entry.voice
        );

        if (repaired) {
          result.holesRepaired++;
          // Update timestamp in manifest
          entry.generatedAt = new Date().toISOString();
        } else {
          result.holesFailed++;
          result.errors.push({
            filename: entry.filename,
            text: entry.text,
            error: 'Failed to repair (still silent after regeneration)',
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Save updated manifest if any repairs were made
    if (result.holesRepaired > 0) {
      await vocabManager.saveManifest();
      console.log(`\n💾 Updated manifest with repair timestamps`);
    }

    return result;
  }

  /**
   * Print repair summary
   */
  printSummary(result: RepairResult): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 REPAIR SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files scanned:    ${result.totalFiles}`);
    console.log(`Holes found:            ${result.holesFound} 🕳️`);
    console.log(`Holes repaired:         ${result.holesRepaired} ✅`);
    console.log(`Holes still broken:     ${result.holesFailed} ❌`);
    console.log('='.repeat(60));

    const successRate = result.holesFound > 0 
      ? Math.round((result.holesRepaired / result.holesFound) * 100) 
      : 100;
    
    console.log(`\n🎯 Repair success rate: ${successRate}%`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Failed repairs (${result.errors.length}):`);
      result.errors.forEach(err => {
        console.log(`   - ${err.filename}: "${err.text}"`);
        console.log(`     Error: ${err.error}`);
      });
      console.log(`\n💡 Tip: Run the script again to retry failed repairs.`);
    } else if (result.holesFound === 0) {
      console.log(`\n✨ Vocab library is healthy! No issues found.`);
    } else {
      console.log(`\n✨ All holes successfully repaired!`);
    }

    console.log('');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '🩺'.repeat(30));
  console.log('   Vocab Doctor - Audio Repair Tool');
  console.log('   Detecting and fixing silent audio files');
  console.log('🩺'.repeat(30) + '\n');

  // Scan for all vocab libraries
  const vocabScanner = new VocabScanner();
  const vocabFiles = await vocabScanner.scanVocabFiles();

  if (vocabFiles.length === 0) {
    console.log('⚠️  No vocab libraries found.\n');
    return;
  }

  // Group by language/level
  const languageLevels = new Set<string>();
  vocabFiles.forEach(file => {
    languageLevels.add(`${file.languageId}/${file.levelId}`);
  });

  console.log(`📚 Found vocab libraries in:`);
  languageLevels.forEach(ll => console.log(`   - ${ll}`));
  console.log('');

  // Process each language/level
  const doctor = new VocabDoctor();
  const allResults: RepairResult[] = [];

  for (const langLevel of languageLevels) {
    const [languageId, levelId] = langLevel.split('/');
    const result = await doctor.repairVocabLibrary(languageId, levelId);
    allResults.push(result);
  }

  // Print combined summary
  if (allResults.length > 1) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 COMBINED SUMMARY (All Libraries)');
    console.log('='.repeat(60));
    
    const total = allResults.reduce((sum, r) => ({
      totalFiles: sum.totalFiles + r.totalFiles,
      holesFound: sum.holesFound + r.holesFound,
      holesRepaired: sum.holesRepaired + r.holesRepaired,
      holesFailed: sum.holesFailed + r.holesFailed,
      errors: [...sum.errors, ...r.errors],
    }), { totalFiles: 0, holesFound: 0, holesRepaired: 0, holesFailed: 0, errors: [] });

    console.log(`Total files scanned:    ${total.totalFiles}`);
    console.log(`Holes found:            ${total.holesFound} 🕳️`);
    console.log(`Holes repaired:         ${total.holesRepaired} ✅`);
    console.log(`Holes still broken:     ${total.holesFailed} ❌`);
    console.log('='.repeat(60) + '\n');

    if (total.holesFailed > 0) {
      console.log(`💡 Run again to retry ${total.holesFailed} failed repair(s).\n`);
    }
  } else {
    doctor.printSummary(allResults[0]);
  }
}

// Run the main function
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

