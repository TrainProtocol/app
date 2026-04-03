import { useState, useCallback } from 'react'
import {
    deriveKeyWithPasskey,
    registerPasskey,
    checkPrfSupport,
} from '@train-protocol/auth'
import type { PrfSupportResult, PasskeyCredentialStorage } from '@train-protocol/auth'

export interface UsePasskeyLoginResult {
    login: () => Promise<{ key: Uint8Array; credentialId: string }>
    register: (displayName?: string) => Promise<{ credentialId: string; key?: Uint8Array }>
    isSupported: boolean | null
    prfDetails: PrfSupportResult | null
    checkSupport: () => Promise<PrfSupportResult>
}

export function usePasskeyLogin(storage?: PasskeyCredentialStorage): UsePasskeyLoginResult {
    const [prfDetails, setPrfDetails] = useState<PrfSupportResult | null>(null)

    const isSupported = prfDetails?.supported ?? null

    const checkSupport = useCallback(async () => {
        const result = await checkPrfSupport()
        setPrfDetails(result)
        return result
    }, [])

    const login = useCallback(async () => {
        return deriveKeyWithPasskey({ createIfMissing: true }, storage)
    }, [storage])

    const register = useCallback(async (displayName?: string) => {
        return registerPasskey(true, displayName, storage)
    }, [storage])

    return { login, register, isSupported, prfDetails, checkSupport }
}
