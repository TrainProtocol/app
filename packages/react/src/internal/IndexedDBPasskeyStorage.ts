import { InMemoryPasskeyStorage, type PasskeyCredentialStorage, type StoredPasskey } from '@train-protocol/auth'
import type { SecureStorage } from './SecureStorage'

const STORAGE_KEY = 'passkey-credentials'

interface StoredCredentials {
    credentials: StoredPasskey[]
    activeId: string | null
}

/** Persistent IndexedDB-backed storage for passkey credentials (id + user-chosen label). */
export class IndexedDBPasskeyStorage implements PasskeyCredentialStorage {
    private memory = new InMemoryPasskeyStorage()

    constructor(private storage: SecureStorage) { }

    /** Load credentials from IndexedDB into memory. Call after SecureStorage.init(). */
    async init(): Promise<void> {
        try {
            const stored = await this.storage.getJSON<StoredCredentials>(STORAGE_KEY)
            if (!stored || !Array.isArray(stored.credentials)) return
            for (const entry of stored.credentials) {
                if (entry && typeof entry.id === 'string') {
                    this.memory.storeCredentialId(entry.id, entry.label)
                }
            }
            if (stored.activeId && stored.credentials.some(c => c?.id === stored.activeId)) {
                // storeCredentialId promotes last-added to active, so re-apply the persisted activeId
                this.memory.storeCredentialId(stored.activeId)
            }
        } catch { /* ignore corrupt data */ }
    }

    getActiveCredentialId(): string | null {
        return this.memory.getActiveCredentialId()
    }

    getAllCredentials(): StoredPasskey[] {
        return this.memory.getAllCredentials()
    }

    getAllCredentialIds(): string[] {
        return this.memory.getAllCredentialIds()
    }

    async storeCredentialId(credId: string, label?: string): Promise<void> {
        this.memory.storeCredentialId(credId, label)
        await this.persist()
    }

    async removeCredentialId(credId: string): Promise<void> {
        this.memory.removeCredentialId(credId)
        await this.persist()
    }

    async clearAllCredentials(): Promise<void> {
        this.memory.clearAllCredentials()
        await this.persist()
    }

    private async persist(): Promise<void> {
        try {
            await this.storage.setJSON(STORAGE_KEY, {
                credentials: this.memory.getAllCredentials(),
                activeId: this.memory.getActiveCredentialId(),
            } satisfies StoredCredentials)
        } catch { /* storage error, in-memory still valid */ }
    }
}
