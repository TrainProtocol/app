import { useState, useCallback, useRef } from 'react'
import {
    deriveKeyWithPasskey,
    deriveKeyFromWallet,
    deriveSecretFromTimelock,
    secretToHashlock,
    checkPrfSupport,
} from '@train-protocol/sdk'
import type { DerivationMethod, PrfSupportResult, PasskeyCredentialStorage } from '@train-protocol/sdk'

export interface UseSecretDerivationOptions {
    /** Passkey credential storage (optional, uses in-memory if omitted) */
    passkeyStorage?: PasskeyCredentialStorage
}

export interface UseSecretDerivationResult {
    method: DerivationMethod | null
    isLoggedIn: boolean
    derivedKey: Buffer | null
    derivationStatus: 'idle' | 'signing'
    derivationMessage: string

    loginWithPasskey: () => Promise<void>
    loginWithWallet: (providerName: string, config: Record<string, unknown>) => Promise<void>
    logout: () => void

    deriveSecret: (nonce?: number) => { secret: string; nonce: number; hashlock: string } | null

    prfSupport: PrfSupportResult | null
    checkPasskeySupport: () => Promise<PrfSupportResult>
}

export function useSecretDerivation(options?: UseSecretDerivationOptions): UseSecretDerivationResult {
    const [method, setMethod] = useState<DerivationMethod | null>(null)
    const [derivedKey, setDerivedKey] = useState<Buffer | null>(null)
    const [derivationStatus, setDerivationStatus] = useState<'idle' | 'signing'>('idle')
    const [derivationMessage, setDerivationMessage] = useState('')
    const [prfSupport, setPrfSupport] = useState<PrfSupportResult | null>(null)

    const passkeyStorage = options?.passkeyStorage

    const isLoggedIn = !!method && !!derivedKey

    const loginWithPasskey = useCallback(async () => {
        setDerivationStatus('signing')
        setDerivationMessage('Confirm with passkey')
        try {
            const { key, credentialId } = await deriveKeyWithPasskey(
                { createIfMissing: true },
                passkeyStorage,
            )
            passkeyStorage?.storeCredentialId(credentialId)
            setDerivedKey(key)
            setMethod('passkey')
        } finally {
            setDerivationStatus('idle')
            setDerivationMessage('')
        }
    }, [passkeyStorage])

    const loginWithWallet = useCallback(async (providerName: string, config: Record<string, unknown>) => {
        setDerivationStatus('signing')
        setDerivationMessage('Please sign in wallet')
        try {
            const key = await deriveKeyFromWallet(providerName, config)
            setDerivedKey(key)
            setMethod('wallet_sign')
        } finally {
            setDerivationStatus('idle')
            setDerivationMessage('')
        }
    }, [])

    const logout = useCallback(() => {
        setMethod(null)
        setDerivedKey(null)
    }, [])

    const deriveSecret = useCallback((nonce?: number) => {
        if (!derivedKey) return null
        const timestamp = nonce ?? Date.now()
        const secretBuf = deriveSecretFromTimelock(derivedKey, timestamp)
        const secret = '0x' + secretBuf.toString('hex')
        const hashlock = secretToHashlock(secret)
        return { secret, nonce: timestamp, hashlock }
    }, [derivedKey])

    const checkPasskeySupport = useCallback(async () => {
        const result = await checkPrfSupport()
        setPrfSupport(result)
        return result
    }, [])

    return {
        method,
        isLoggedIn,
        derivedKey,
        derivationStatus,
        derivationMessage,
        loginWithPasskey,
        loginWithWallet,
        logout,
        deriveSecret,
        prfSupport,
        checkPasskeySupport,
    }
}
