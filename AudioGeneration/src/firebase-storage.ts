import admin from 'firebase-admin';
import { config } from './config.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Firebase Storage Service
 * Handles uploading audio files to Firebase Storage
 */
export class FirebaseStorageService {
  private storage: admin.storage.Storage;
  private bucket: admin.storage.Bucket;

  constructor() {
    // Initialize Firebase Admin SDK
    const serviceAccount = JSON.parse(
      readFileSync(resolve(config.firebase.serviceAccountPath), 'utf-8')
    );

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: config.firebase.storageBucket,
      });
    }

    this.storage = admin.storage();
    this.bucket = this.storage.bucket();

    console.log(`✅ Firebase initialized with bucket: ${config.firebase.storageBucket}`);
  }

  /**
   * Upload an audio file to Firebase Storage
   * @param localFilePath - Path to the local audio file
   * @param storageDestinationPath - Where to store it in Firebase (e.g., "audio-lessons/english-level1-lesson1.mp3")
   * @returns Public URL to access the file
   */
  async uploadAudio(localFilePath: string, storageDestinationPath: string): Promise<string> {
    return this.uploadFile(localFilePath, storageDestinationPath, 'audio/mpeg');
  }

  /**
   * Upload any file to Firebase Storage
   * @param localFilePath - Path to the local file
   * @param storageDestinationPath - Where to store it in Firebase
   * @param contentType - MIME type of the file (default: auto-detect)
   * @returns Public URL to access the file
   */
  async uploadFile(
    localFilePath: string, 
    storageDestinationPath: string,
    contentType?: string
  ): Promise<string> {
    try {
      console.log(`☁️  Uploading to Firebase Storage: ${storageDestinationPath}`);

      const file = this.bucket.file(storageDestinationPath);
      
      // Auto-detect content type if not provided
      if (!contentType) {
        if (storageDestinationPath.endsWith('.json')) {
          contentType = 'application/json';
        } else if (storageDestinationPath.endsWith('.mp3')) {
          contentType = 'audio/mpeg';
        } else if (storageDestinationPath.endsWith('.wav')) {
          contentType = 'audio/wav';
        } else {
          contentType = 'application/octet-stream';
        }
      }
      
      await this.bucket.upload(localFilePath, {
        destination: storageDestinationPath,
        metadata: {
          contentType,
          metadata: {
            uploadedAt: new Date().toISOString(),
            generatedBy: 'Audio Generation System',
          },
        },
      });

      // Files are now private - access only via signed URLs from Cloud Functions
      // No longer making files public for security
      
      console.log(`✅ Upload successful!`);
      console.log(`🔒 File stored privately: ${storageDestinationPath}`);

      return storageDestinationPath; // Return path instead of public URL
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload to Firebase: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if a file exists in Firebase Storage
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const [exists] = await this.bucket.file(storagePath).exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete a file from Firebase Storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      await this.bucket.file(storagePath).delete();
      console.log(`🗑️  Deleted: ${storagePath}`);
    } catch (error) {
      console.error(`Failed to delete ${storagePath}:`, error);
    }
  }

  /**
   * List all files in a directory
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const [files] = await this.bucket.getFiles({ prefix });
      return files.map(file => file.name);
    } catch (error) {
      console.error(`Failed to list files with prefix ${prefix}:`, error);
      return [];
    }
  }

  /**
   * Test Firebase connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firebase Storage connection...');
      
      const [files] = await this.bucket.getFiles({ maxResults: 1 });
      
      console.log('✅ Firebase Storage connection successful!');
      return true;
    } catch (error) {
      console.error('❌ Firebase Storage connection failed:', error);
      return false;
    }
  }
}

