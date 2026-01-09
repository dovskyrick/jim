import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Cost Tracker
 * Tracks OpenAI TTS API costs and enforces budget limits
 */

interface CostEntry {
  text: string;
  characterCount: number;
  cost: number;
  timestamp: string;
  languageId: string;
  levelId?: string;
  lessonId?: string;
}

interface CostTrackerData {
  totalSpent: number; // in euros
  budgetLimit: number; // in euros (0 = no limit)
  currency: 'EUR' | 'USD';
  entries: CostEntry[];
  lastUpdated: string;
  sessionStart: string;
}

export class CostTracker {
  private data: CostTrackerData | null = null;
  private trackerPath: string = '';
  private readonly COST_PER_1000_CHARS = 0.015; // $0.015 per 1000 chars (tts-1)
  private readonly EUR_TO_USD_RATE = 0.92; // Approximate conversion (adjust as needed)

  constructor() {
    // Store cost tracker in project root (current working directory)
    this.trackerPath = resolve(process.cwd(), 'cost-tracker.json');
    this.loadTracker();
  }

  /**
   * Load or create cost tracker
   */
  private loadTracker(): void {
    if (existsSync(this.trackerPath)) {
      try {
        const trackerData = readFileSync(this.trackerPath, 'utf-8');
        this.data = JSON.parse(trackerData);
        console.log(`💰 Loaded cost tracker: €${this.data!.totalSpent.toFixed(4)} spent`);
      } catch (error) {
        console.warn(`⚠️  Could not parse cost tracker, creating new one: ${error}`);
        this.data = this.createNewTracker();
      }
    } else {
      this.data = this.createNewTracker();
    }
  }

  /**
   * Create a new tracker
   */
  private createNewTracker(): CostTrackerData {
    return {
      totalSpent: 0,
      budgetLimit: 0, // No limit by default
      currency: 'EUR',
      entries: [],
      lastUpdated: new Date().toISOString(),
      sessionStart: new Date().toISOString(),
    };
  }

  /**
   * Set budget limit in euros
   */
  setBudgetLimit(euros: number): void {
    if (!this.data) {
      this.loadTracker();
    }
    this.data!.budgetLimit = euros;
    this.saveTracker();
    console.log(`💰 Budget limit set to €${euros.toFixed(2)}`);
  }

  /**
   * Get current budget limit
   */
  getBudgetLimit(): number {
    return this.data?.budgetLimit || 0;
  }

  /**
   * Get current spending
   */
  getTotalSpent(): number {
    return this.data?.totalSpent || 0;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number {
    if (!this.data || this.data.budgetLimit === 0) {
      return Infinity;
    }
    return Math.max(0, this.data.budgetLimit - this.data.totalSpent);
  }

  /**
   * Calculate cost for a text string
   */
  calculateCost(text: string): number {
    const characterCount = text.length;
    const costUSD = (characterCount / 1000) * this.COST_PER_1000_CHARS;
    // Convert to EUR (approximate)
    return costUSD / this.EUR_TO_USD_RATE;
  }

  /**
   * Estimate cost for a text string without recording it
   */
  estimateCost(text: string): number {
    return this.calculateCost(text);
  }

  /**
   * Record a TTS request and check if budget allows it
   * @param text - The text that was sent to TTS
   * @param languageId - Language identifier
   * @param levelId - Optional level identifier
   * @param lessonId - Optional lesson identifier
   * @returns true if within budget, false if budget exceeded
   */
  recordRequest(
    text: string,
    languageId: string,
    levelId?: string,
    lessonId?: string
  ): boolean {
    if (!this.data) {
      this.loadTracker();
    }

    const cost = this.calculateCost(text);
    const characterCount = text.length;

    // Check if this would exceed budget
    if (this.data!.budgetLimit > 0) {
      const newTotal = this.data!.totalSpent + cost;
      if (newTotal > this.data!.budgetLimit) {
        console.log(`\n⚠️  Budget exceeded!`);
        console.log(`   Current: €${this.data!.totalSpent.toFixed(4)}`);
        console.log(`   This request: €${cost.toFixed(4)}`);
        console.log(`   Budget limit: €${this.data!.budgetLimit.toFixed(2)}`);
        return false;
      }
    }

    // Record the request
    const entry: CostEntry = {
      text: text.substring(0, 100), // Store first 100 chars for reference
      characterCount,
      cost,
      timestamp: new Date().toISOString(),
      languageId,
      levelId,
      lessonId,
    };

    this.data!.entries.push(entry);
    this.data!.totalSpent += cost;
    this.data!.lastUpdated = new Date().toISOString();

    this.saveTracker();

    // Log if approaching budget
    if (this.data!.budgetLimit > 0) {
      const remaining = this.getRemainingBudget();
      const percentageUsed = (this.data!.totalSpent / this.data!.budgetLimit) * 100;
      
      if (percentageUsed >= 90) {
        console.log(`   ⚠️  Budget warning: ${percentageUsed.toFixed(1)}% used (€${remaining.toFixed(2)} remaining)`);
      }
    }

    return true;
  }

  /**
   * Check if we can afford a request (without recording it)
   */
  canAfford(text: string): boolean {
    if (!this.data) {
      this.loadTracker();
    }

    if (this.data!.budgetLimit === 0) {
      return true; // No limit set
    }

    const cost = this.calculateCost(text);
    return (this.data!.totalSpent + cost) <= this.data!.budgetLimit;
  }

  /**
   * Get cost summary
   */
  getSummary(): {
    totalSpent: number;
    budgetLimit: number;
    remaining: number;
    requestCount: number;
    totalCharacters: number;
  } {
    if (!this.data) {
      return {
        totalSpent: 0,
        budgetLimit: 0,
        remaining: Infinity,
        requestCount: 0,
        totalCharacters: 0,
      };
    }

    const totalCharacters = this.data.entries.reduce(
      (sum, entry) => sum + entry.characterCount,
      0
    );

    return {
      totalSpent: this.data.totalSpent,
      budgetLimit: this.data.budgetLimit,
      remaining: this.getRemainingBudget(),
      requestCount: this.data.entries.length,
      totalCharacters,
    };
  }

  /**
   * Reset tracker (keep budget limit)
   */
  reset(): void {
    if (!this.data) {
      this.loadTracker();
    }

    const budgetLimit = this.data!.budgetLimit;
    this.data = this.createNewTracker();
    this.data.budgetLimit = budgetLimit;
    this.saveTracker();
    console.log('💰 Cost tracker reset (budget limit preserved)');
  }

  /**
   * Save tracker to disk
   */
  private saveTracker(): void {
    if (!this.data) return;

    writeFileSync(this.trackerPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  /**
   * Print cost summary
   */
  printSummary(): void {
    const summary = this.getSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('💰 COST SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Total spent: €${summary.totalSpent.toFixed(4)}`);
    if (summary.budgetLimit > 0) {
      console.log(`   Budget limit: €${summary.budgetLimit.toFixed(2)}`);
      console.log(`   Remaining: €${summary.remaining.toFixed(2)}`);
      const percentage = (summary.totalSpent / summary.budgetLimit) * 100;
      console.log(`   Usage: ${percentage.toFixed(1)}%`);
    } else {
      console.log(`   Budget limit: None (unlimited)`);
    }
    console.log(`   Total requests: ${summary.requestCount}`);
    console.log(`   Total characters: ${summary.totalCharacters.toLocaleString()}`);
    console.log('='.repeat(60) + '\n');
  }
}

