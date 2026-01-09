import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';

/**
 * TTS Request Tracker
 * Tracks OpenAI TTS requests per language to identify frequently used phrases
 * and automatically cache them after 2 uses (on the 3rd request)
 */

interface RequestEntry {
  text: string;
  voice: string;
  count: number;
  cached: boolean;
  firstRequested: string;
  lastRequested: string;
}

interface RequestTrackerData {
  languageId: string;
  lastUpdated: string;
  requests: Record<string, RequestEntry>; // Key: "text:voice"
}

export class TTSRequestTracker {
  private data: RequestTrackerData | null = null;
  private trackerPath: string = '';
  private languageId: string = '';

  /**
   * Load or create tracker for a specific language
   */
  loadTracker(languageId: string): void {
    this.languageId = languageId;
    
    // Store tracker in lessons-audio directory (language-scoped)
    const trackerDir = resolve('lessons-audio', languageId);
    if (!existsSync(trackerDir)) {
      mkdirSync(trackerDir, { recursive: true });
    }
    
    this.trackerPath = join(trackerDir, 'tts-requests.json');

    // Load existing tracker or create new one
    if (existsSync(this.trackerPath)) {
      try {
        const trackerData = readFileSync(this.trackerPath, 'utf-8');
        this.data = JSON.parse(trackerData);
        console.log(`📊 Loaded TTS request tracker: ${Object.keys(this.data!.requests).length} tracked phrases`);
      } catch (error) {
        console.warn(`⚠️  Could not parse tracker file, creating new one: ${error}`);
        this.data = this.createNewTracker();
      }
    } else {
      this.data = this.createNewTracker();
    }
  }

  /**
   * Create a new tracker data structure
   */
  private createNewTracker(): RequestTrackerData {
    return {
      languageId: this.languageId,
      lastUpdated: new Date().toISOString(),
      requests: {},
    };
  }

  /**
   * Track a TTS request and return whether it should be cached
   * @param text - The text that was requested
   * @param voice - The voice used
   * @returns true if this is the 3rd request (count >= 2) and should be cached
   */
  trackRequest(text: string, voice: string): boolean {
    if (!this.data) {
      throw new Error('Tracker not loaded. Call loadTracker() first.');
    }

    const key = this.getKey(text, voice);
    const now = new Date().toISOString();

    if (!this.data.requests[key]) {
      // First request
      this.data.requests[key] = {
        text,
        voice,
        count: 1,
        cached: false,
        firstRequested: now,
        lastRequested: now,
      };
      this.saveTracker();
      return false;
    }

    // Increment count
    const entry = this.data.requests[key];
    entry.count++;
    entry.lastRequested = now;

    // Check if this is the 3rd request (count >= 2 means we've seen it 2 times before)
    const shouldCache = entry.count >= 3 && !entry.cached;
    
    if (shouldCache) {
      entry.cached = true;
      console.log(`   💾 Marking for cache: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" (used ${entry.count} times)`);
    }

    this.saveTracker();
    return shouldCache;
  }

  /**
   * Mark a request as cached (after successfully adding to vocab library)
   */
  markAsCached(text: string, voice: string): void {
    if (!this.data) return;

    const key = this.getKey(text, voice);
    if (this.data.requests[key]) {
      this.data.requests[key].cached = true;
      this.saveTracker();
    }
  }

  /**
   * Get the count for a specific text/voice combination
   */
  getCount(text: string, voice: string): number {
    if (!this.data) return 0;

    const key = this.getKey(text, voice);
    return this.data.requests[key]?.count || 0;
  }

  /**
   * Check if a request has been cached
   */
  isCached(text: string, voice: string): boolean {
    if (!this.data) return false;

    const key = this.getKey(text, voice);
    return this.data.requests[key]?.cached || false;
  }

  /**
   * Generate a unique key for text:voice combination
   */
  private getKey(text: string, voice: string): string {
    // Normalize text: trim, lowercase, remove extra spaces
    const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
    return `${normalizedText}:${voice}`;
  }

  /**
   * Save tracker to disk
   */
  private saveTracker(): void {
    if (!this.data) return;

    this.data.lastUpdated = new Date().toISOString();
    writeFileSync(this.trackerPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  /**
   * Get statistics about tracked requests
   */
  getStats(): { totalRequests: number; cachedRequests: number; uncachedRequests: number } {
    if (!this.data) {
      return { totalRequests: 0, cachedRequests: 0, uncachedRequests: 0 };
    }

    const entries = Object.values(this.data.requests);
    return {
      totalRequests: entries.length,
      cachedRequests: entries.filter(e => e.cached).length,
      uncachedRequests: entries.filter(e => !e.cached).length,
    };
  }
}

