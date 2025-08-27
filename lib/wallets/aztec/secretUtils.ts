import crypto from 'crypto';

export interface AztecSecretData {
  secret: string;
  secretHash: string;
}

interface StoredSecretData {
  encryptedSecret: string;
  secretHash: string;
  timestamp: number;
  iv: string;
  salt: string;
}

// In-memory cache for decrypted secrets (for performance)
const secretCache = new Map<string, {
  secret: string;
  secretHash: string;
  timestamp: number;
}>();

// Browser fingerprint for additional security layer
let browserFingerprint: string | null = null;

/**
 * Generate browser fingerprint for additional security
 */
function getBrowserFingerprint(): string {
  if (browserFingerprint) {
    return browserFingerprint;
  }

  if (typeof window === 'undefined') {
    browserFingerprint = 'server-side';
    return browserFingerprint;
  }

  // Create a browser fingerprint using available properties
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.maxTouchPoints || 0,
  ].join('|');

  browserFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 16);
  return browserFingerprint;
}

/**
 * Derive encryption key from browser fingerprint and salt
 */
async function deriveKey(salt: string): Promise<Buffer> {
  const fingerprint = getBrowserFingerprint();
  const baseKey = fingerprint + salt;
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Use WebCrypto API for key derivation (more secure)
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new Uint8Array(encoder.encode(baseKey)),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const saltBuffer = encoder.encode(salt);
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(saltBuffer),
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 32 bytes
    );
    
    return Buffer.from(derivedBits);
  } else {
    // Fallback for Node.js or browsers without WebCrypto
    return crypto.pbkdf2Sync(baseKey, salt, 10000, 32, 'sha256');
  }
}

/**
 * Encrypt data using AES-256-GCM with derived key
 */
async function encryptData(data: string, salt: string): Promise<{ encrypted: string; iv: string; tag: string }> {
  const key = await deriveKey(salt);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  cipher.setAAD(Buffer.from('aztec-secret'));
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * Decrypt data using AES-256-GCM with derived key
 */
async function decryptData(encryptedData: string, _ivHex: string, tagHex: string, salt: string): Promise<string> {
  const key = await deriveKey(salt);
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipher('aes-256-gcm', key);
  decipher.setAAD(Buffer.from('aztec-secret'));
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generates a random secret and its hash for Aztec bridge operations
 * @returns Object containing the secret and its hash
 */
export function generateAztecSecret(): AztecSecretData {
  // Generate a random 32-byte secret using crypto.getRandomValues for better entropy
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback to Node.js crypto (shouldn't happen in browser)
    const buffer = crypto.randomBytes(32);
    array.set(buffer);
  }
  
  const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // Create SHA-256 hash of the secret
  const secretHash = crypto.createHash('sha256').update(secret, 'hex').digest('hex');
  
  return {
    secret,
    secretHash
  };
}

/**
 * Stores Aztec secret data securely in encrypted localStorage
 * @param swapId - Unique identifier for the swap
 * @param secretData - The secret and hash data
 */
export async function storeAztecSecret(swapId: string, secretData: AztecSecretData): Promise<void> {
  try {
    // Clean up old secrets (older than 24 hours)
    cleanupExpiredSecrets();
    
    // Generate a unique salt for this secret
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Encrypt the secret
    const { encrypted, iv, tag } = await encryptData(secretData.secret, salt);
    
    const storedData: StoredSecretData = {
      encryptedSecret: `${encrypted}:${tag}`,
      secretHash: secretData.secretHash,
      timestamp: Date.now(),
      iv,
      salt
    };
    // Store encrypted data in localStorage
    const storageKey = `aztec_secret_${storedData.secretHash}`;
    localStorage.setItem(storageKey, JSON.stringify(storedData));
    
    // Also cache in memory for performance
    secretCache.set(swapId, {
      secret: secretData.secret,
      secretHash: secretData.secretHash,
      timestamp: Date.now()
    });
    
    // Set up automatic cleanup after 24 hours
    setTimeout(() => {
      localStorage.removeItem(storageKey);
      secretCache.delete(swapId);
    }, 24 * 60 * 60 * 1000); // 24 hours
    
  } catch (error) {
    console.error('Failed to store Aztec secret:', error);
    throw error;
  }
}

/**
 * Retrieves Aztec secret data from secure storage
 * @param swapId - Unique identifier for the swap
 * @returns The stored secret data or null if not found
 */
export async function getAztecSecret(swapId: string): Promise<AztecSecretData | null> {
  try {
    // First check memory cache for performance
    const cached = secretCache.get(swapId);
    if (cached) {
      // Check if expired (24 hours)
      if (Date.now() - cached.timestamp <= 24 * 60 * 60 * 1000) {
        return {
          secret: cached.secret,
          secretHash: cached.secretHash
        };
      } else {
        secretCache.delete(swapId);
      }
    }
    
    // If not in cache, try localStorage
    const storageKey = `aztec_secret_${swapId}`;
    const storedString = localStorage.getItem(storageKey);
    if (!storedString) {
      return null;
    }
    
    const stored: StoredSecretData = JSON.parse(storedString);
    
    // Check if expired (24 hours)
    if (Date.now() - stored.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(storageKey);
      return null;
    }
    
    // Decrypt the secret
    const [encrypted, tag] = stored.encryptedSecret.split(':');
    const secret = await decryptData(encrypted, stored.iv, tag, stored.salt);
    
    // Cache in memory for future access
    secretCache.set(swapId, {
      secret,
      secretHash: stored.secretHash,
      timestamp: stored.timestamp
    });
    
    return {
      secret,
      secretHash: stored.secretHash
    };
  } catch (error) {
    console.error('Failed to retrieve Aztec secret:', error);
    return null;
  }
}

/**
 * Removes Aztec secret data from storage
 * @param swapId - Unique identifier for the swap
 */
export function clearAztecSecret(swapId: string): void {
  try {
    const storageKey = `aztec_secret_${swapId}`;
    localStorage.removeItem(storageKey);
    secretCache.delete(swapId);
  } catch (error) {
    console.error('Failed to clear Aztec secret:', error);
  }
}

/**
 * Clean up expired secrets (older than 24 hours)
 */
function cleanupExpiredSecrets(): void {
  if (typeof window === 'undefined') return;
  
  const now = Date.now();
  const expireTime = 24 * 60 * 60 * 1000; // 24 hours
  
  // Clean up localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('aztec_secret_')) {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '');
        if (now - stored.timestamp > expireTime) {
          keysToRemove.push(key);
        }
      } catch (error) {
        // Invalid data, remove it
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clean up memory cache
  for (const [swapId, data] of secretCache.entries()) {
    if (now - data.timestamp > expireTime) {
      secretCache.delete(swapId);
    }
  }
}

/**
 * Clear all secrets from memory cache (keeps localStorage for persistence)
 */
export function clearMemoryCache(): void {
  secretCache.clear();
  browserFingerprint = null;
}

/**
 * Clear all secrets including localStorage (complete cleanup)
 */
export function clearAllAztecSecrets(): void {
  if (typeof window === 'undefined') return;
  
  // Clear all from localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('aztec_secret_')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear memory cache
  clearMemoryCache();
}

// Set up cleanup on page visibility change (but keep localStorage for persistence)
if (typeof window !== 'undefined') {
  // Clear memory cache on page unload (localStorage persists)
  window.addEventListener('beforeunload', clearMemoryCache);
  
  // Run cleanup on page load
  window.addEventListener('load', cleanupExpiredSecrets);
  
  // Periodic cleanup every hour
  setInterval(cleanupExpiredSecrets, 60 * 60 * 1000);
}