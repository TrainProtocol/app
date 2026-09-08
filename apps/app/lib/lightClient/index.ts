import type { LightClientVerifier } from '@train-protocol/react'
import { HELIOS_NETWORKS } from './networks'
import { HeliosVerifier } from './heliosVerifier'

const verifiers = new Map<string, HeliosVerifier>()

/**
 * Per-network singleton access to the Helios light-client verifier.
 * Returns null when the network is unsupported or workers are unavailable
 * (SSR) — the caller then stays on plain multi-RPC consensus.
 */
export function getLightClientVerifier(networkId: string): LightClientVerifier | null {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return null
    const entry = HELIOS_NETWORKS[networkId]
    if (!entry) return null

    let verifier = verifiers.get(networkId)
    if (!verifier) {
        verifier = new HeliosVerifier(entry)
        verifiers.set(networkId, verifier)
    }
    return verifier
}
