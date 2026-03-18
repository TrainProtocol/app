import { InMemoryPasskeyStorage, type PasskeyCredentialStorage } from '@train-protocol/auth'

/** Persistent localStorage-backed storage for passkey credential IDs. */
export class LocalStoragePasskeyStorage implements PasskeyCredentialStorage {
    private memory = new InMemoryPasskeyStorage()

    constructor(private key = 'train:passkey-credentials') {
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const stored = localStorage.getItem(this.key)
                if (stored) {
                    const parsed = JSON.parse(stored) as { ids: string[]; activeId: string | null }
                    for (const id of parsed.ids) this.memory.storeCredentialId(id)
                    // Restore active (storeCredentialId sets last added as active, so re-set)
                    if (parsed.activeId && parsed.ids.includes(parsed.activeId)) {
                        this.memory.storeCredentialId(parsed.activeId)
                    }
                }
            } catch { /* ignore corrupt data */ }
        }
    }

    getActiveCredentialId(): string | null {
        return this.memory.getActiveCredentialId()
    }

    getAllCredentialIds(): string[] {
        return this.memory.getAllCredentialIds()
    }

    storeCredentialId(credId: string): void {
        this.memory.storeCredentialId(credId)
        this.persist()
    }

    removeCredentialId(credId: string): void {
        this.memory.removeCredentialId(credId)
        this.persist()
    }

    private persist(): void {
        if (typeof window === 'undefined' || !window.localStorage) return
        try {
            localStorage.setItem(this.key, JSON.stringify({
                ids: this.getAllCredentialIds(),
                activeId: this.getActiveCredentialId(),
            }))
        } catch { /* quota exceeded, etc. */ }
    }
}
