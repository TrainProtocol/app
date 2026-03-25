const DB_NAME = 'train-secure'
const DB_VERSION = 1
const KEYS_STORE = 'keys'
const DATA_STORE = 'data'
const WRAPPING_KEY_ID = 'wrapping-key'

/** AES-GCM encrypted payload stored in IndexedDB */
interface EncryptedBlob {
    iv: Uint8Array
    ciphertext: ArrayBuffer
}

/** Extract a proper ArrayBuffer from a Uint8Array (handles SharedArrayBuffer edge case). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const ab = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(ab).set(bytes)
    return ab
}

/**
 * Secure IndexedDB storage with AES-GCM encryption via Web Crypto API.
 *
 * - Generates a non-extractable AES-GCM CryptoKey on first use
 * - Encrypts sensitive data (derivedKey) before storing
 * - Supports plain JSON storage for non-sensitive data (passkey credential IDs)
 * - SSR-safe: all methods no-op when IndexedDB is unavailable
 */
export class SecureStorage {
    private db: IDBDatabase | null = null
    private wrappingKey: CryptoKey | null = null

    private get available(): boolean {
        return typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && !!crypto.subtle
    }

    /** Open the database and generate/load the wrapping key. Must be called before other methods. */
    async init(): Promise<void> {
        if (!this.available) return

        this.db = await this.openDB()
        this.wrappingKey = await this.getOrCreateWrappingKey()
    }

    /** Encrypt a Uint8Array and store it under the given key. */
    async encryptAndStore(key: string, data: Uint8Array): Promise<void> {
        if (!this.db || !this.wrappingKey) return

        const iv = crypto.getRandomValues(new Uint8Array(12))
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.wrappingKey,
            toArrayBuffer(data),
        )

        const blob: EncryptedBlob = { iv, ciphertext }
        await this.put(DATA_STORE, key, blob)
    }

    /** Load and decrypt a Uint8Array from the given key. Returns null if not found. */
    async loadAndDecrypt(key: string): Promise<Uint8Array | null> {
        if (!this.db || !this.wrappingKey) return null

        const blob = await this.get<EncryptedBlob>(DATA_STORE, key)
        if (!blob || !blob.iv || !blob.ciphertext) return null

        try {
            const iv = blob.iv instanceof Uint8Array ? toArrayBuffer(blob.iv) : blob.iv
            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                this.wrappingKey,
                blob.ciphertext,
            )
            return new Uint8Array(plaintext)
        } catch {
            // Decryption failed (corrupt data or key mismatch)
            return null
        }
    }

    /** Store a JSON-serializable value (unencrypted). Use for non-sensitive data. */
    async setJSON(key: string, value: unknown): Promise<void> {
        if (!this.db) return
        await this.put(DATA_STORE, key, value)
    }

    /** Load a JSON value. Returns null if not found. */
    async getJSON<T = unknown>(key: string): Promise<T | null> {
        if (!this.db) return null
        return this.get<T>(DATA_STORE, key)
    }

    /** Remove a single entry from the data store. */
    async remove(key: string): Promise<void> {
        if (!this.db) return
        await this.delete(DATA_STORE, key)
    }

    /** Clear all data (but keep the wrapping key for future sessions). */
    async clear(): Promise<void> {
        if (!this.db) return
        await this.clearStore(DATA_STORE)
    }

    /** Destroy everything including the wrapping key. Next init() generates a new key. */
    async destroy(): Promise<void> {
        if (!this.db) return
        await this.clearStore(DATA_STORE)
        await this.clearStore(KEYS_STORE)
        this.wrappingKey = null
    }

    // --- Private helpers ---

    private openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onupgradeneeded = () => {
                const db = request.result
                if (!db.objectStoreNames.contains(KEYS_STORE)) {
                    db.createObjectStore(KEYS_STORE)
                }
                if (!db.objectStoreNames.contains(DATA_STORE)) {
                    db.createObjectStore(DATA_STORE)
                }
            }

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    private async getOrCreateWrappingKey(): Promise<CryptoKey> {
        const existing = await this.get<CryptoKey>(KEYS_STORE, WRAPPING_KEY_ID)
        if (existing) return existing

        const key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false, // non-extractable
            ['encrypt', 'decrypt'],
        )

        await this.put(KEYS_STORE, WRAPPING_KEY_ID, key)
        return key
    }

    private get<T>(storeName: string, key: string): Promise<T | null> {
        return new Promise((resolve, reject) => {
            if (!this.db) { resolve(null); return }
            const tx = this.db.transaction(storeName, 'readonly')
            const store = tx.objectStore(storeName)
            const request = store.get(key)
            request.onsuccess = () => resolve(request.result ?? null)
            request.onerror = () => reject(request.error)
        })
    }

    private put(storeName: string, key: string, value: unknown): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) { resolve(); return }
            const tx = this.db.transaction(storeName, 'readwrite')
            const store = tx.objectStore(storeName)
            const request = store.put(value, key)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    private delete(storeName: string, key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) { resolve(); return }
            const tx = this.db.transaction(storeName, 'readwrite')
            const store = tx.objectStore(storeName)
            const request = store.delete(key)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    private clearStore(storeName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) { resolve(); return }
            const tx = this.db.transaction(storeName, 'readwrite')
            const store = tx.objectStore(storeName)
            const request = store.clear()
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }
}
