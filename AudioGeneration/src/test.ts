#!/usr/bin/env node

import { validateConfig } from './config.js';
import { OpenAITTSService } from './openai-tts.js';
import { FirebaseStorageService } from './firebase-storage.js';

/**
 * Test script to verify OpenAI and Firebase connections
 */
async function test() {
  console.log('\n🧪 Testing Audio Generation Setup\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Validate configuration
    console.log('1️⃣  Validating configuration...');
    validateConfig();

    // Step 2: Test OpenAI TTS
    console.log('\n2️⃣  Testing OpenAI TTS API...');
    const ttsService = new OpenAITTSService();
    const ttsSuccess = await ttsService.testConnection();

    if (!ttsSuccess) {
      throw new Error('OpenAI TTS test failed');
    }

    // Step 3: Test Firebase Storage
    console.log('\n3️⃣  Testing Firebase Storage...');
    const storageService = new FirebaseStorageService();
    const storageSuccess = await storageService.testConnection();

    if (!storageSuccess) {
      throw new Error('Firebase Storage test failed');
    }

    // All tests passed
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed! You\'re ready to generate audio lessons!');
    console.log('='.repeat(60) + '\n');
    console.log('💡 Next steps:');
    console.log('   1. Edit src/index.ts to define your lessons');
    console.log('   2. Run: npm run generate');
    console.log('   3. Update your manifest.json with the new storage paths\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\n💡 Please check:');
    console.error('   - Your .env file has the correct OPENAI_API_KEY');
    console.error('   - Your firebase-service-account.json file is present');
    console.error('   - Your Firebase project is configured correctly\n');
    process.exit(1);
  }
}

// Run the test
test();

