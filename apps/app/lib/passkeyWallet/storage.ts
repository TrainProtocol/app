import type { Address } from 'viem'

export type PasskeyWalletAccount = {
    credentialId: string
    address: Address
    displayName: string
    createdAt: number
    lastUsedAt: number
}

const DB_NAME = 'train-passkey-wallet'
const DB_VERSION = 1
const STORE = 'accounts'

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB not available'))
    }
    if (dbPromise) return dbPromise
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'credentialId' })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'))
    })
    return dbPromise
}

function txStore(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(STORE, mode).objectStore(STORE)
}

function awaitReq<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
    })
}

export async function getPasskeyWalletAccount(
    credentialId: string,
): Promise<PasskeyWalletAccount | null> {
    try {
        const db = await getDb()
        const result = await awaitReq(txStore(db, 'readonly').get(credentialId))
        return (result as PasskeyWalletAccount | undefined) ?? null
    } catch {
        return null
    }
}

export async function listPasskeyWalletAccounts(): Promise<PasskeyWalletAccount[]> {
    try {
        const db = await getDb()
        const result = await awaitReq(txStore(db, 'readonly').getAll())
        return (result as PasskeyWalletAccount[]) ?? []
    } catch {
        return []
    }
}

export async function savePasskeyWalletAccount(account: PasskeyWalletAccount): Promise<void> {
    const db = await getDb()
    await awaitReq(txStore(db, 'readwrite').put(account))
}

export async function deletePasskeyWalletAccount(credentialId: string): Promise<void> {
    const db = await getDb()
    await awaitReq(txStore(db, 'readwrite').delete(credentialId))
}
