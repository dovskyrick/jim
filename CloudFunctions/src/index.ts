import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

const storage = admin.storage();
const bucket = storage.bucket();

/**
 * Simple in-memory rate limiter (Phase 1)
 * Tracks requests per IP address
 * For Phase 3, we'll move this to Firebase Realtime Database
 */
class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs = 60 * 1000; // 1 minute window
  private readonly maxRequests = 20; // 20 requests per minute per IP

  canMakeRequest(identifier: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];
    
    // Remove timestamps older than the window
    const recentTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    
    if (recentTimestamps.length >= this.maxRequests) {
      return false;
    }
    
    // Add current timestamp
    recentTimestamps.push(now);
    this.requests.set(identifier, recentTimestamps);
    
    return true;
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(ts => now - ts < this.windowMs);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }
}

const rateLimiter = new SimpleRateLimiter();

// Clean up rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Generate a signed URL for an audio file
 * This function will be called by the mobile app
 * 
 * Request body:
 * {
 *   "type": "manifest" | "lesson" | "vocab",
 *   "path": "audio-lessons/greek-level1-lesson1.mp3"
 * }
 * 
 * Response:
 * {
 *   "url": "https://storage.googleapis.com/...",
 *   "expiresAt": "2025-12-30T12:00:00Z"
 * }
 */
export const getAudioUrl = onRequest({
  cors: true
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipString = Array.isArray(clientIp) ? clientIp[0] : clientIp;

    // Check rate limit
    if (!rateLimiter.canMakeRequest(ipString)) {
      res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: 60 
      });
      return;
    }

    // Validate request body
    const { type, path } = req.body;
    
    if (!type || !path) {
      res.status(400).json({ error: 'Missing required fields: type and path' });
      return;
    }

    // Validate type
    const validTypes = ['manifest', 'lesson', 'vocab'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid type. Must be: manifest, lesson, or vocab' });
      return;
    }

    // Validate path format to prevent directory traversal
    if (path.includes('..') || path.startsWith('/')) {
      res.status(400).json({ error: 'Invalid path format' });
      return;
    }

    // Validate path based on type
    if (type === 'manifest' && path !== 'manifest.json') {
      res.status(400).json({ error: 'Invalid manifest path' });
      return;
    }

    if (type === 'lesson' && !path.startsWith('audio-lessons/')) {
      res.status(400).json({ error: 'Invalid lesson path' });
      return;
    }

    if (type === 'vocab' && !path.startsWith('vocab-audio/')) {
      res.status(400).json({ error: 'Invalid vocab path' });
      return;
    }

    // Generate signed URL (valid for 1 hour)
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now
    const file = bucket.file(path);

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expiresAt,
    });

    // Log for monitoring (in production, you'd use structured logging)
    console.log(`Signed URL generated - IP: ${ipString}, Type: ${type}, Path: ${path}`);

    // Return the signed URL
    res.status(200).json({
      url: signedUrl,
      expiresAt: new Date(expiresAt).toISOString(),
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check endpoint
 */
export const health = onRequest({
  cors: true
}, (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

