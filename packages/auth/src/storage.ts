export const DEFAULT_PASSKEY_DISPLAY_NAME = 'Train user'

export interface StoredPasskey {
    id: string
    label: string
}

/** Injectable storage interface — implement with zustand, memory, IndexedDB, or any other store.
 *  Methods may return sync values or Promises, allowing both sync (in-memory/localStorage)
 *  and async (IndexedDB) implementations. */
export interface PasskeyCredentialStorage {
    getActiveCredentialId(): string | null | Promise<string | null>
    getAllCredentials(): StoredPasskey[] | Promise<StoredPasskey[]>
    getAllCredentialIds(): string[] | Promise<string[]>
    /** Adds the credential if not present, or updates its label when a non-empty label is passed.
     *  Always promotes the credential to active. Missing label defaults to DEFAULT_PASSKEY_DISPLAY_NAME on first insert. */
    storeCredentialId(credId: string, label?: string): void | Promise<void>
    removeCredentialId(credId: string): void | Promise<void>
    clearAllCredentials(): void | Promise<void>
}

/** In-memory fallback storage (non-persistent). */
export class InMemoryPasskeyStorage implements PasskeyCredentialStorage {
    private credentials: StoredPasskey[] = []
    private activeId: string | null = null

    getActiveCredentialId(): string | null { return this.activeId }
    getAllCredentials(): StoredPasskey[] { return this.credentials.map(c => ({ ...c })) }
    getAllCredentialIds(): string[] { return this.credentials.map(c => c.id) }

    storeCredentialId(credId: string, label?: string): void {
        const trimmed = label?.trim()
        const existing = this.credentials.find(c => c.id === credId)
        if (existing) {
            if (trimmed) existing.label = trimmed
        } else {
            this.credentials.push({ id: credId, label: trimmed || DEFAULT_PASSKEY_DISPLAY_NAME })
        }
        this.activeId = credId
    }

    removeCredentialId(credId: string): void {
        this.credentials = this.credentials.filter(c => c.id !== credId)
        if (this.activeId === credId) {
            this.activeId = this.credentials[0]?.id ?? null
        }
    }

    clearAllCredentials(): void {
        this.credentials = []
        this.activeId = null
    }
}
