// Firebase Storage service
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';
import { Manifest } from '../types';

/**
 * Fetch and parse the manifest.json from Firebase Storage
 * The manifest describes all available languages, levels, and lessons
 */
export async function fetchManifest(): Promise<Manifest> {
  try {
    // Create a reference to manifest.json at the root of Firebase Storage
    const manifestRef = ref(storage, 'manifest.json');
    
    // Get the download URL
    const url = await getDownloadURL(manifestRef);
    
    // Fetch the file content
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
    throw new Error('Could not load lessons. Please check your internet connection and Firebase setup.');
  }
}

/**
 * Get a download URL for an audio file from Firebase Storage
 * @param storagePath - Path like "audio-lessons/test.wav"
 */
export async function getAudioDownloadUrl(storagePath: string): Promise<string> {
  try {
    const audioRef = ref(storage, storagePath);
    const url = await getDownloadURL(audioRef);
    return url;
  } catch (error) {
    console.error(`❌ Failed to get download URL for ${storagePath}:`, error);
    throw new Error('Could not load audio file.');
  }
}

