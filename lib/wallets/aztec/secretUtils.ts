import crypto from 'crypto';

export interface AztecSecretData {
  secret: string;
  secretHash: string;
}

interface StoredSecretData {
  secret: string;
  secretHash: string;
  timestamp: number;
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
 * Stores Aztec secret data in localStorage
 * @param swapId - Unique identifier for the swap
 * @param secretData - The secret and hash data
 */
export function storeAztecSecret(swapId: string, secretData: AztecSecretData): void {
  try {
    cleanupExpiredSecrets();
    
    const storedData: StoredSecretData = {
      secret: secretData.secret,
      secretHash: secretData.secretHash,
      timestamp: Date.now()
    };
    
    const storageKey = `aztec_secret_${swapId}`;
    localStorage.setItem(storageKey, JSON.stringify(storedData));
  } catch (error) {
    console.error('Failed to store Aztec secret:', error);
    throw error;
  }
}

/**
 * Retrieves Aztec secret data from localStorage
 * @param swapId - Unique identifier for the swap
 * @returns The stored secret data or null if not found
 */
export function getAztecSecret(swapId: string): AztecSecretData | null {
  try {
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
    
    return {
      secret: stored.secret,
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
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Clear all secrets from localStorage
 */
export function clearAllAztecSecrets(): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('aztec_secret_')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Set up cleanup on page load and periodic cleanup
if (typeof window !== 'undefined') {
  window.addEventListener('load', cleanupExpiredSecrets);
  setInterval(cleanupExpiredSecrets, 60 * 60 * 1000);
}