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
   * Parse lesson text into phrases (split by pause markers)
   */
  parsePhrases(text: string): string[] {
    // Split by various pause notations
    const pauseRegex = /\.{3,}\s*\(pause\)|…\s*\(pause\)|\(pause\)|\.{3,}|…/gi;
    
    // Split and clean up phrases
    const phrases = text
      .split(pauseRegex)
      .map(phrase => phrase.trim())
      .filter(phrase => phrase.length > 0);
    
    return phrases;
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
      // Check if this is likely a short answer phrase
      // Criteria: 
      // - Under 30 characters
      // - Not a question (doesn't end with ?)
      // - Less than 6 words
      const wordCount = phrase.split(/\s+/).length;
      const isQuestion = phrase.trim().endsWith('?');
      const isShort = phrase.length < 30 && wordCount < 6;
      
      // If it's a short phrase and not a question, enhance it
      if (isShort && !isQuestion && index > 0) {
        // Remove existing quotes if any
        let enhanced = phrase.replace(/^["']|["']$/g, '');
        
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
   * Concatenate multiple audio files with silence between them
   * @param audioFiles - Array of audio file paths
   * @param outputPath - Final output file path
   * @param silenceDuration - Duration of silence between files (seconds)
   * @param addSilenceAtEnds - Add silence at beginning and end
   */
  async concatenateWithSilence(
    audioFiles: string[],
    outputPath: string,
    silenceDuration: number = 3,
    addSilenceAtEnds: boolean = true
  ): Promise<void> {
    console.log(`🎼 Concatenating ${audioFiles.length} audio segments with ${silenceDuration}s silence...`);

    // Generate silence file
    const silencePath = join(this.tempDir, 'silence.mp3');
    await this.generateSilence(silenceDuration, silencePath);
    console.log(`   Created ${silenceDuration}s silence`);

    // Build concat list
    const concatList: string[] = [];
    
    if (addSilenceAtEnds) {
      concatList.push(silencePath);
    }
    
    for (let i = 0; i < audioFiles.length; i++) {
      concatList.push(audioFiles[i]);
      if (i < audioFiles.length - 1 || addSilenceAtEnds) {
        concatList.push(silencePath);
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
          unlinkSync(silencePath);
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

