import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Audio Concatenation Service
 * Handles splitting text into phrases and concatenating with silence
 */
export class AudioConcatenator {
  private tempDir: string;

  constructor(tempDir: string = './output/temp') {
    this.tempDir = tempDir;
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Parse lesson text into phrases and extract pause durations
   * ONLY supports [pause Xs] format (e.g., [pause 3s], [pause 2s])
   * All other content (including "..." in answers) is preserved as-is
   * @returns Object with phrases array and pauseDurations array
   */
  parsePhrases(text: string): { phrases: string[]; pauseDurations: number[] } {
    const phrases: string[] = [];
    const pauseDurations: number[] = [];
    
    // ONLY match [pause Xs] format - ignore everything else
    const pauseRegex = /\[pause\s+(\d+(?:\.\d+)?)s\]/gi;
    
    let lastIndex = 0;
    let match;
    
    // Find all [pause Xs] markers and extract phrases between them
    while ((match = pauseRegex.exec(text)) !== null) {
      // Extract phrase before this pause marker
      const phrase = text.substring(lastIndex, match.index).trim();
      if (phrase.length > 0) {
        phrases.push(phrase);
      }
      
      // Extract pause duration from [pause Xs] format
      const duration = parseFloat(match[1]);
      pauseDurations.push(duration);
      
      lastIndex = pauseRegex.lastIndex;
    }
    
    // Add remaining text after last pause
    const remaining = text.substring(lastIndex).trim();
    if (remaining.length > 0) {
      phrases.push(remaining);
    }
    
    return { phrases, pauseDurations };
  }

  /**
   * Enhance short answer phrases for better TTS pronunciation
   * Wraps short phrases (likely answers) in quotes and adds "..."
   * Example: "Tres bien" becomes "Tres bien..."
   * 
   * @param phrases - Array of phrase strings
   * @returns Enhanced phrases
   */
  enhancePhrases(phrases: string[]): string[] {
    return phrases.map((phrase, index) => {
      const trimmed = phrase.trim();
      
      // Check if phrase already has the desired format: starts with " and ends with ..."
      const alreadyFormatted = trimmed.startsWith('"') && trimmed.slice(-4) === '..."';
      
      if (alreadyFormatted) {
        console.log(`   ✓ Already formatted: ${trimmed}`);
        return phrase; // Return as-is
      }
      
      // Check if this is likely a short answer phrase
      // Criteria: 
      // - Under 30 characters
      // - Less than 6 words
      // - Not the first phrase (first phrase is usually intro/prompt)
      const wordCount = trimmed.split(/\s+/).length;
      const isShort = trimmed.length < 30 && wordCount < 6;
      
      // If it's a short phrase and not first, enhance it
      if (isShort && index > 0) {
        // Remove existing quotes if any
        let enhanced = trimmed.replace(/^["']|["']$/g, '');
        
        // Remove trailing period if exists
        enhanced = enhanced.replace(/\.$/, '');
        
        // Wrap in quotes and add ellipsis
        enhanced = `"${enhanced}..."`;
        
        console.log(`   📝 Enhanced answer: "${phrase}" → ${enhanced}`);
        return enhanced;
      }
      
      return phrase;
    });
  }

  /**
   * Generate a silence audio file
   * @param duration - Duration in seconds
   * @param outputPath - Where to save the silence file
   */
  async generateSilence(duration: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=r=44100:cl=stereo')
        .inputFormat('lavfi')
        .duration(duration)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Concatenate multiple audio files with variable silence between them
   * @param audioFiles - Array of audio file paths
   * @param outputPath - Final output file path
   * @param silenceDurations - Array of silence durations (seconds) between files
   * @param addSilenceAtEnds - Add silence at beginning and end (uses first duration)
   */
  async concatenateWithSilence(
    audioFiles: string[],
    outputPath: string,
    silenceDurations: number | number[] = 3,
    addSilenceAtEnds: boolean = true
  ): Promise<void> {
    // Convert single duration to array for backward compatibility
    const durations = Array.isArray(silenceDurations) 
      ? silenceDurations 
      : Array(audioFiles.length).fill(silenceDurations);
    
    console.log(`🎼 Concatenating ${audioFiles.length} audio segments with variable silences...`);

    // Generate unique silence files for each duration
    const silenceFiles = new Map<number, string>();
    
    for (const duration of [...new Set(durations)]) {
      const silencePath = join(this.tempDir, `silence-${duration}s.mp3`);
      await this.generateSilence(duration, silencePath);
      silenceFiles.set(duration, silencePath);
      console.log(`   Created ${duration}s silence`);
    }

    // Build concat list
    const concatList: string[] = [];
    
    if (addSilenceAtEnds && durations.length > 0) {
      concatList.push(silenceFiles.get(durations[0])!);
    }
    
    for (let i = 0; i < audioFiles.length; i++) {
      concatList.push(audioFiles[i]);
      
      // Add silence after this phrase if available
      if (i < durations.length) {
        concatList.push(silenceFiles.get(durations[i])!);
      } else if (addSilenceAtEnds && i === audioFiles.length - 1) {
        // Add ending silence using last duration
        concatList.push(silenceFiles.get(durations[durations.length - 1])!);
      }
    }

    // Create concat file list for ffmpeg
    const concatFilePath = resolve(join(this.tempDir, 'concat-list.txt'));
    const concatFileContent = concatList
      .map(file => {
        // Use absolute paths and convert backslashes to forward slashes for ffmpeg
        const absolutePath = resolve(file).replace(/\\/g, '/');
        return `file '${absolutePath}'`;
      })
      .join('\n');
    writeFileSync(concatFilePath, concatFileContent, 'utf-8');

    // Concatenate using ffmpeg
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => {
          console.log(`   ✅ Concatenation complete!`);
          // Clean up temp files
          unlinkSync(concatFilePath);
          // Clean up all silence files
          for (const silencePath of silenceFiles.values()) {
            try {
              unlinkSync(silencePath);
            } catch (err) {
              console.debug('Could not delete silence file:', err);
            }
          }
          resolve();
        })
        .on('error', (err) => {
          console.error(`   ❌ Concatenation failed:`, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Clean up temporary phrase files
   */
  cleanupPhraseFiles(files: string[]): void {
    for (const file of files) {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      } catch (error) {
        console.warn(`⚠️  Could not delete temp file: ${file}`);
      }
    }
  }
}

