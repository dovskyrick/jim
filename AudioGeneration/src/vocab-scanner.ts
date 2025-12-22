import { VocabFileInfo, VocabEntry } from './types.js';
import { readdirSync, statSync, readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { join, resolve, basename } from 'path';

/**
 * VocabScanner
 * Scans and parses vocabulary files from the lessons-content directory
 */
export class VocabScanner {
  private contentDir: string;

  constructor(contentDir: string = 'lessons-content') {
    this.contentDir = resolve(contentDir);
  }

  /**
   * Find all vocab files in vocab-text directories
   * Returns array of VocabFileInfo objects
   */
  async scanVocabFiles(): Promise<VocabFileInfo[]> {
    const vocabFiles: VocabFileInfo[] = [];

    // Scan all languages
    if (!existsSync(this.contentDir)) {
      console.log(`⚠️  Content directory not found: ${this.contentDir}`);
      return vocabFiles;
    }

    const languageDirs = readdirSync(this.contentDir).filter(name => {
      const path = join(this.contentDir, name);
      return statSync(path).isDirectory();
    });

    for (const languageId of languageDirs) {
      const languagePath = join(this.contentDir, languageId);
      
      // Scan all levels within this language
      const levelDirs = readdirSync(languagePath).filter(name => {
        const path = join(languagePath, name);
        return statSync(path).isDirectory();
      });

      for (const levelId of levelDirs) {
        const vocabTextDir = join(languagePath, levelId, 'vocab-text');
        
        // Check if vocab-text directory exists
        if (!existsSync(vocabTextDir)) {
          continue;
        }

        // Scan for vocab files (vocab*-TODO.txt or vocab*-DONE.txt)
        const files = readdirSync(vocabTextDir).filter(name => 
          name.startsWith('vocab') && (name.endsWith('-TODO.txt') || name.endsWith('-DONE.txt'))
        );

        for (const fileName of files) {
          const filePath = join(vocabTextDir, fileName);
          const vocabId = fileName.replace(/-TODO\.txt$/, '').replace(/-DONE\.txt$/, '');
          const status = fileName.endsWith('-TODO.txt') ? 'TODO' : 'DONE';

          vocabFiles.push({
            filePath,
            languageId,
            levelId,
            vocabId,
            status,
          });
        }
      }
    }

    return vocabFiles;
  }

  /**
   * Parse a single vocab file
   * Format: "Greek Text — Status" per line
   * Returns array of VocabEntry objects
   */
  parseVocabFile(filePath: string): VocabEntry[] {
    const entries: VocabEntry[] = [];
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        continue;
      }

      // Parse format: "Greek Text — Status"
      const match = line.match(/^(.+?)\s*—\s*(NEW|GENERATED)\s*$/);
      
      if (match) {
        const text = match[1].trim();
        const status = match[2] as 'NEW' | 'GENERATED';
        
        entries.push({
          text,
          status,
          lineNumber: i + 1,
        });
      } else {
        console.warn(`⚠️  Skipping malformed line ${i + 1}: "${line}"`);
      }
    }

    return entries;
  }

  /**
   * Update status markers in a vocab file
   * Changes "— NEW" to "— GENERATED" for specified entries
   */
  updateVocabFileStatus(filePath: string, updatedEntries: VocabEntry[]): void {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Create a map of line numbers to new status
    const statusMap = new Map<number, 'NEW' | 'GENERATED'>();
    updatedEntries.forEach(entry => {
      statusMap.set(entry.lineNumber, entry.status);
    });

    // Update lines
    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      if (statusMap.has(lineNumber)) {
        const newStatus = statusMap.get(lineNumber);
        // Replace status marker
        lines[i] = lines[i].replace(/—\s*(NEW|GENERATED)\s*$/, `— ${newStatus}`);
      }
    }

    // Write back to file
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  /**
   * Mark vocab file as complete (rename TODO → DONE)
   */
  markVocabFileComplete(filePath: string): void {
    if (!filePath.endsWith('-TODO.txt')) {
      console.warn(`⚠️  File is not a TODO file: ${filePath}`);
      return;
    }

    const newPath = filePath.replace('-TODO.txt', '-DONE.txt');
    
    if (existsSync(newPath)) {
      console.warn(`⚠️  DONE file already exists: ${newPath}`);
      return;
    }

    renameSync(filePath, newPath);
    console.log(`✅ Marked vocab file as complete: ${basename(newPath)}`);
  }

  /**
   * Get summary of vocab files
   */
  async getVocabSummary(): Promise<{ total: number; todo: number; done: number }> {
    const files = await this.scanVocabFiles();
    return {
      total: files.length,
      todo: files.filter(f => f.status === 'TODO').length,
      done: files.filter(f => f.status === 'DONE').length,
    };
  }
}

