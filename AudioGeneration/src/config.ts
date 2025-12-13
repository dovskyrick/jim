import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 */
export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  // Firebase Configuration
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'jim-c9df8.firebasestorage.app',
  },

  // TTS Configuration
  tts: {
    // Available voices: alloy, echo, fable, onyx, nova, shimmer
    defaultVoice: 'alloy' as const,
    // Available models: tts-1 (faster), tts-1-hd (higher quality)
    model: 'tts-1' as const,
    // Audio format: mp3, opus, aac, flac, wav, pcm
    format: 'mp3' as const,
    // Speed: 0.25 to 4.0
    speed: 1.0,
  },

  // Storage paths
  storage: {
    // Where audio files will be stored in Firebase Storage
    audioLessonsPath: 'audio-lessons',
    // Local temporary output directory
    outputDir: './output',
  },
};

/**
 * Validate configuration
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.openai.apiKey) {
    errors.push('❌ OPENAI_API_KEY is not set in .env file');
  }

  try {
    const serviceAccountPath = resolve(config.firebase.serviceAccountPath);
    readFileSync(serviceAccountPath, 'utf-8');
  } catch (error) {
    errors.push(`❌ Firebase service account file not found at: ${config.firebase.serviceAccountPath}`);
  }

  if (errors.length > 0) {
    console.error('\n🚨 Configuration Errors:\n');
    errors.forEach(error => console.error(error));
    console.error('\n📝 Please check the README.md for setup instructions.\n');
    process.exit(1);
  }

  console.log('✅ Configuration validated successfully\n');
}

