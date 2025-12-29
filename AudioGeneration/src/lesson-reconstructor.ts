#!/usr/bin/env node

import { LessonMetadata } from './lesson-metadata-types.js';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, parse } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

// Set ffmpeg and ffprobe paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
if (ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

/**
 * Lesson Reconstructor
 * Surgically repairs lesson audio by injecting fixed vocab files at precise timestamps
 */

interface RepairResult {
  repairedFiles: Array<{
    filename: string;
    text: string;
    audioPath: string;
  }>;
}

interface LessonRepairJob {
  lessonId: string;
  audioFile: string;
  metadata: LessonMetadata;
  holesIndices: number[];
  repairedVocabFiles: Map<string, string>; // vocabKey -> full audio path
}

export class LessonReconstructor {
  /**
   * Find all lessons that use the repaired vocab files
   */
  async findAffectedLessons(
    repairedVocabFiles: Array<{ filename: string; text: string; audioPath: string }>,
    languageId: string,
    levelId: string
  ): Promise<LessonRepairJob[]> {
    const jobs: LessonRepairJob[] = [];
    const audioDir = resolve('lessons-audio', languageId, levelId);

    if (!existsSync(audioDir)) {
      console.log(`⚠️  Audio directory not found: ${audioDir}`);
      return jobs;
    }

    // Create map of repaired vocab files for quick lookup
    const repairedMap = new Map<string, string>();
    for (const repaired of repairedVocabFiles) {
      const vocabKey = `vocab-audio/${repaired.filename}`;
      repairedMap.set(vocabKey, repaired.audioPath);
    }

    // Find all metadata files
    const files = readdirSync(audioDir);
    const metadataFiles = files.filter(f => f.endsWith('.metadata.json'));

    console.log(`🔍 Scanning ${metadataFiles.length} lesson(s) for affected segments...`);

    for (const metaFile of metadataFiles) {
      const metadataPath = join(audioDir, metaFile);
      
      try {
        const metadataContent = readFileSync(metadataPath, 'utf-8');
        const metadata: LessonMetadata = JSON.parse(metadataContent);

        // Check if this lesson uses any repaired vocab
        const affectedSegments: number[] = [];

        for (const [vocabKey, dependency] of Object.entries(metadata.vocabDependencies)) {
          if (repairedMap.has(vocabKey)) {
            affectedSegments.push(...dependency.segments);
          }
        }

        if (affectedSegments.length > 0) {
          // This lesson needs repair!
          const audioFile = join(audioDir, metadata.audioFile);

          if (!existsSync(audioFile)) {
            console.log(`   ⚠️  Audio file not found: ${audioFile}`);
            continue;
          }

          jobs.push({
            lessonId: metadata.lessonId,
            audioFile,
            metadata,
            holesIndices: affectedSegments.sort((a, b) => a - b),
            repairedVocabFiles: repairedMap,
          });

          console.log(`   🎯 ${metadata.lessonId}: ${affectedSegments.length} segment(s) need repair`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to read metadata: ${metaFile}`, error);
      }
    }

    return jobs;
  }

  /**
   * Repair a single lesson by injecting audio at precise timestamps
   * Uses FFmpeg complex filter to inject all holes in ONE command
   */
  async repairLessonAudio(job: LessonRepairJob): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔧 Repairing: ${job.lessonId}`);
    console.log(`   Holes to fix: ${job.holesIndices.length}`);
    console.log('='.repeat(60));

    const inputs: string[] = [job.audioFile];
    const filterCommands: string[] = [];
    const delayedInputs: string[] = [];

    // Process each hole
    for (let i = 0; i < job.holesIndices.length; i++) {
      const segmentIndex = job.holesIndices[i];
      const segment = job.metadata.segments[segmentIndex];

      if (segment.type !== 'vocab' || !segment.vocabFile) {
        console.log(`   ⏭️  Skipping segment ${segmentIndex} (not a vocab segment)`);
        continue;
      }

      // Get the repaired audio path
      const vocabAudioPath = job.repairedVocabFiles.get(segment.vocabFile);

      if (!vocabAudioPath || !existsSync(vocabAudioPath)) {
        console.log(`   ⚠️  Vocab file not found: ${segment.vocabFile}`);
        continue;
      }

      console.log(`   💉 [${i + 1}/${job.holesIndices.length}] Injecting at ${segment.startMs}ms: "${segment.text}"`);

      // Add this vocab file as an input
      inputs.push(vocabAudioPath);
      const inputNum = inputs.length - 1;

      // Create adelay filter to position this audio at the correct timestamp
      // adelay expects delay in milliseconds for each channel (stereo = 2 channels)
      const delayMs = segment.startMs;
      filterCommands.push(`[${inputNum}:a]adelay=${delayMs}|${delayMs}[delayed${i}]`);
      delayedInputs.push(`[delayed${i}]`);
    }

    if (delayedInputs.length === 0) {
      console.log(`   ⚠️  No valid holes to repair, skipping...`);
      return;
    }

    // Create mix filter combining original audio + all delayed inputs
    const allInputs = ['[0:a]', ...delayedInputs].join('');
    const mixInputCount = delayedInputs.length + 1;
    filterCommands.push(`${allInputs}amix=inputs=${mixInputCount}:duration=longest[outa]`);

    console.log(`\n   🎼 Building FFmpeg filter chain...`);
    console.log(`   📊 Mixing ${mixInputCount} audio streams`);

    // Output path (temporary)
    const outputPath = `${job.audioFile}.repaired.mp3`;

    try {
      await this.runFFmpegRepair(inputs, filterCommands, outputPath);

      // Replace original with repaired version
      const fs = await import('fs');
      fs.unlinkSync(job.audioFile);
      fs.renameSync(outputPath, job.audioFile);

      // Update metadata
      job.metadata.lastRepairedAt = new Date().toISOString();
      job.metadata.repairedSegments = job.holesIndices;

      const metadataPath = job.audioFile.replace('.mp3', '.metadata.json');
      writeFileSync(metadataPath, JSON.stringify(job.metadata, null, 2), 'utf-8');

      console.log(`\n   ✅ Repair complete!`);
      console.log(`   💾 Updated: ${job.audioFile}`);
      console.log(`   📝 Metadata updated with repair timestamp`);

    } catch (error) {
      console.error(`\n   ❌ Repair failed:`, error);
      
      // Clean up temporary file if it exists
      if (existsSync(outputPath)) {
        const fs = await import('fs');
        fs.unlinkSync(outputPath);
      }
      
      throw error;
    }
  }

  /**
   * Execute FFmpeg repair with complex filter
   */
  private async runFFmpegRepair(
    inputs: string[],
    filterCommands: string[],
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add all inputs
      inputs.forEach(input => command.input(input));

      // Add complex filter
      command.complexFilter(filterCommands);

      // Output configuration
      command
        .outputOptions('-map', '[outa]')
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(outputPath)
        .on('start', (cmd) => {
          console.log(`\n   🎬 FFmpeg command:`);
          console.log(`   ${cmd.substring(0, 150)}...`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r   ⏳ Progress: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log(`\n   ✅ FFmpeg processing complete`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`\n   ❌ FFmpeg error:`, err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Reconstruct all affected lessons after vocab repair
   */
  async reconstructLessons(
    repairResult: RepairResult,
    languageId: string,
    levelId: string
  ): Promise<void> {
    if (repairResult.repairedFiles.length === 0) {
      console.log('ℹ️  No vocab files were repaired, no lessons need reconstruction.\n');
      return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔧 LESSON RECONSTRUCTION`);
    console.log(`   Repaired vocab files: ${repairResult.repairedFiles.length}`);
    console.log('='.repeat(60));

    // Find affected lessons
    const jobs = await this.findAffectedLessons(
      repairResult.repairedFiles,
      languageId,
      levelId
    );

    if (jobs.length === 0) {
      console.log(`\n✨ No lessons affected by repaired vocab files.\n`);
      return;
    }

    console.log(`\n📋 Found ${jobs.length} lesson(s) that need reconstruction\n`);

    // Repair each lesson
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      
      try {
        await this.repairLessonAudio(job);
        successCount++;
      } catch (error) {
        console.error(`\n❌ Failed to repair ${job.lessonId}:`, error);
        failCount++;
      }

      // Small delay between repairs
      if (i < jobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 RECONSTRUCTION SUMMARY`);
    console.log('='.repeat(60));
    console.log(`Total lessons: ${jobs.length}`);
    console.log(`Successfully repaired: ${successCount} ✅`);
    console.log(`Failed: ${failCount} ❌`);
    console.log('='.repeat(60) + '\n');
  }
}

