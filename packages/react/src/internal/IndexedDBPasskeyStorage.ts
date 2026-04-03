import { InMemoryPasskeyStorage, type PasskeyCredentialStorage } from '@train-protocol/auth'
import type { SecureStorage } from './SecureStorage'

const STORAGE_KEY = 'passkey-credentials'

interface StoredCredentials {
    ids: string[]
    activeId: string | null
}

/** Persistent IndexedDB-backed storage for passkey credential IDs. */
export class IndexedDBPasskeyStorage implements PasskeyCredentialStorage {
    private memory = new InMemoryPasskeyStorage()

    constructor(private storage: SecureStorage) {}

    /** Load credentials from IndexedDB into memory. Call after SecureStorage.init(). */
    async init(): Promise<void> {
        try {
            const stored = await this.storage.getJSON<StoredCredentials>(STORAGE_KEY)
            if (stored && Array.isArray(stored.ids)) {
                for (const id of stored.ids) this.memory.storeCredentialId(id)
                // Restore active (storeCredentialId sets last added as active, so re-set)
                if (stored.activeId && stored.ids.includes(stored.activeId)) {
                    this.memory.storeCredentialId(stored.activeId)
                }
            }
        } catch { /* ignore corrupt data */ }
    }

    getActiveCredentialId(): string | null {
        return this.memory.getActiveCredentialId()
    }

    getAllCredentialIds(): string[] {
        return this.memory.getAllCredentialIds()
    }

    async storeCredentialId(credId: string): Promise<void> {
        this.memory.storeCredentialId(credId)
        await this.persist()
    }

    async removeCredentialId(credId: string): Promise<void> {
        this.memory.removeCredentialId(credId)
        await this.persist()
    }

    private async persist(): Promise<void> {
        try {
            await this.storage.setJSON(STORAGE_KEY, {
                ids: this.getAllCredentialIds(),
                activeId: this.getActiveCredentialId(),
            } satisfies StoredCredentials)
        } catch { /* storage error, in-memory still valid */ }
    }
}
