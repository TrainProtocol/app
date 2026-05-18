import { useSyncExternalStore } from 'react'
import {
    getPasskeyWalletState,
    subscribePasskeyWalletState,
    type PasskeyWalletState,
} from './state'

const noopServerSnapshot: PasskeyWalletState = { address: null, credentialId: null }

export function usePasskeyWalletState(): PasskeyWalletState {
    return useSyncExternalStore(
        (cb) => subscribePasskeyWalletState(() => cb()),
        getPasskeyWalletState,
        () => noopServerSnapshot,
    )
}
