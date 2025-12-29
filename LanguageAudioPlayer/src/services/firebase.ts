// Secure audio delivery service using Cloud Functions
import { Manifest } from '../types';

// Cloud Function endpoint - REPLACE THIS with your deployed function URL
// After deploying, your URL will be: https://us-central1-jim-c9df8.cloudfunctions.net/getAudioUrl
const CLOUD_FUNCTION_URL = 'https://us-central1-jim-c9df8.cloudfunctions.net/getAudioUrl';

interface SignedUrlResponse {
  url: string;
  expiresAt: string;
}

/**
 * Request a signed URL from the Cloud Function
 * @param type - Type of file: 'manifest', 'lesson', or 'vocab'
 * @param path - Storage path like "audio-lessons/greek-level1-lesson1.mp3"
 */
async function getSignedUrl(type: 'manifest' | 'lesson' | 'vocab', path: string): Promise<string> {
  try {
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, path }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: SignedUrlResponse = await response.json();
    return data.url;
  } catch (error) {
    console.error(`❌ Failed to get signed URL for ${path}:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Could not get secure URL. Please check your internet connection.');
  }
}

/**
 * Fetch and parse the manifest.json from Firebase Storage
 * The manifest describes all available languages, levels, and lessons
 */
export async function fetchManifest(): Promise<Manifest> {
  try {
    console.log('🔐 Requesting secure manifest URL...');
    
    // Get signed URL from Cloud Function
    const url = await getSignedUrl('manifest', 'manifest.json');
    
    // Fetch the file content using the signed URL
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse JSON
    const manifest: Manifest = await response.json();
    
    console.log('✅ Manifest loaded successfully!');
    console.log(`Found ${manifest.languages.length} language(s)`);
    
    return manifest;
  } catch (error) {
    console.error('❌ Failed to fetch manifest:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Could not load lessons. Please check your internet connection and Firebase setup.');
  }
}

/**
 * Get a secure download URL for an audio file from Firebase Storage
 * @param storagePath - Path like "audio-lessons/greek-level1-lesson1.mp3"
 */
export async function getAudioDownloadUrl(storagePath: string): Promise<string> {
  try {
    console.log(`🔐 Requesting secure URL for: ${storagePath}`);
    
    // Determine file type based on path
    let type: 'manifest' | 'lesson' | 'vocab';
    if (storagePath.startsWith('audio-lessons/')) {
      type = 'lesson';
    } else if (storagePath.startsWith('vocab-audio/')) {
      type = 'vocab';
    } else {
      throw new Error('Invalid storage path');
    }
    
    // Get signed URL from Cloud Function
    const url = await getSignedUrl(type, storagePath);
    
    console.log(`✅ Secure URL obtained`);
    return url;
  } catch (error) {
    console.error(`❌ Failed to get download URL for ${storagePath}:`, error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Could not load audio file.');
  }
}

