import OpenAI from 'openai';
import { config } from './config.js';
import { TextToSpeechOptions } from './types.js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * OpenAI TTS Service
 * Handles text-to-speech generation using OpenAI's API
 */
export class OpenAITTSService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Generate speech from text using OpenAI's TTS API
   * @param options - Text and voice options
   * @returns Buffer containing the audio data
   */
  async generateSpeech(options: TextToSpeechOptions): Promise<Buffer> {
    const {
      text,
      voice = config.tts.defaultVoice,
      model = config.tts.model,
      speed = config.tts.speed,
    } = options;

    console.log(`🎙️  Generating audio with voice: ${voice}, model: ${model}`);
    console.log(`📝 Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

    try {
      const response = await this.client.audio.speech.create({
        model,
        voice,
        input: text,
        speed,
        response_format: config.tts.format,
      });

      // Convert the response to a buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      
      console.log(`✅ Audio generated successfully (${buffer.length} bytes)`);
      
      return buffer;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate speech: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate speech and save to a local file
   * @param options - Text and voice options
   * @param outputPath - Where to save the audio file
   * @returns Path to the saved file
   */
  async generateAndSave(options: TextToSpeechOptions, outputPath: string): Promise<string> {
    const audioBuffer = await this.generateSpeech(options);
    
    const fullPath = resolve(outputPath);
    writeFileSync(fullPath, audioBuffer);
    
    console.log(`💾 Audio saved to: ${fullPath}`);
    
    return fullPath;
  }

  /**
   * Test the TTS service with a simple message
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing OpenAI TTS connection...');
      
      const buffer = await this.generateSpeech({
        text: 'Hello! This is a test of the OpenAI text to speech API.',
        voice: 'alloy',
      });
      
      if (buffer.length > 0) {
        console.log('✅ OpenAI TTS connection successful!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ OpenAI TTS connection failed:', error);
      return false;
    }
  }
}

