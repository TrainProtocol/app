/** Injectable storage interface — implement with zustand, memory, or any other store. */
export interface PasskeyCredentialStorage {
    getActiveCredentialId(): string | null
    getAllCredentialIds(): string[]
    storeCredentialId(credId: string): void
    removeCredentialId(credId: string): void
}

/** In-memory fallback storage (non-persistent). */
export class InMemoryPasskeyStorage implements PasskeyCredentialStorage {
    private credentialIds: string[] = []
    private activeId: string | null = null

    getActiveCredentialId(): string | null { return this.activeId }
    getAllCredentialIds(): string[] { return [...this.credentialIds] }
    storeCredentialId(credId: string): void {
        if (!this.credentialIds.includes(credId)) {
            this.credentialIds.push(credId)
        }
        this.activeId = credId
    }
    removeCredentialId(credId: string): void {
        this.credentialIds = this.credentialIds.filter(id => id !== credId)
        if (this.activeId === credId) {
            this.activeId = this.credentialIds[0] ?? null
        }
    }
}
