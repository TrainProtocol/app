import { useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

/**
 * Returns a ref that always holds the latest Solana wallet hook state.
 *
 * Assigning ref.current synchronously during render (rather than in useEffect)
 * is the documented React escape hatch for reading fresh state inside stable
 * callbacks — see https://react.dev/learn/referencing-values-with-refs.
 * This lets old useCallback closures read the current adapter without needing
 * the wallet as a dependency (which would cascade re-renders through all
 * consuming contexts).
 */
export function useSolanaWalletRef() {
    const wallet = useWallet()
    const ref = useRef(wallet)
    ref.current = wallet
    return ref
}
