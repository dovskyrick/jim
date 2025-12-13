#!/usr/bin/env node

import { ManifestUpdater } from './manifest-updater.js';

/**
 * Update and upload manifest.json without generating any audio
 * Useful for:
 * - Fixing manifest structure
 * - Removing test entries
 * - Re-uploading after manual edits
 */
async function updateManifestOnly() {
  console.log('\n📋 Updating and uploading manifest.json...\n');
  
  try {
    const manifestUpdater = new ManifestUpdater();
    await manifestUpdater.updateAndUpload();
    
    console.log('✨ Manifest updated and uploaded successfully!\n');
  } catch (error) {
    console.error('❌ Failed to update manifest:', error);
    process.exit(1);
  }
}

updateManifestOnly();

