import { useEffect, useMemo, useRef, useState } from 'react'
import { Network, Token } from '@/Models/Network'
import LightClient from '@/lib/lightClient'
import { supportsLightClient } from '@/lib/lightClient/supportsNetwork'
import { LockDetails } from '@train-protocol/sdk'

interface UseLightClientParams {
    destination_network?: Network
    destination_token?: Token
    hashlock?: string
    destAtomicContract?: string
    isTerminal: boolean
}

interface UseLightClientResult {
    lightClientInitialized: boolean
    lightClientPending: boolean
    verifyingByLightClient: boolean
    destinationDetailsByLightClient?: { data?: LockDetails; error?: string }
}

export function useLightClient({
    destination_network,
    destination_token,
    hashlock,
    destAtomicContract,
    isTerminal,
}: UseLightClientParams): UseLightClientResult {
    const [lightClient, setLightClient] = useState<LightClient | undefined>(undefined)
    const [verifyingByLightClient, setVerifyingByLightClient] = useState(false)
    const [destinationDetailsByLightClient, setDestinationDetailsByLightClient] = useState<
        { data?: LockDetails; error?: string } | undefined
    >(undefined)

    // Track the hashlock so we can reset state when it changes
    const prevHashlockRef = useRef<string | undefined>(undefined)
    useEffect(() => {
        if (hashlock !== prevHashlockRef.current) {
            prevHashlockRef.current = hashlock
            setDestinationDetailsByLightClient(undefined)
            setLightClient(undefined)
        }
    }, [hashlock])

    const lightClientPending = useMemo(() => {
        if (!destination_network || isTerminal) return false
        if (!supportsLightClient(destination_network)) return false
        return !destinationDetailsByLightClient
    }, [destination_network, isTerminal, destinationDetailsByLightClient])

    // Init light client when destination network changes or after reset
    useEffect(() => {
        if (!destination_network || isTerminal) return
        if (!supportsLightClient(destination_network)) return
        if (lightClient) return

        const lc = new LightClient()
        let cancelled = false;

        (async () => {
            try {
                await lc.initProvider({ network: destination_network })
                if (!cancelled) setLightClient(lc)
            } catch (error) {
                console.error('Light client init failed:', error)
                if (!cancelled) {
                    setDestinationDetailsByLightClient({ data: undefined, error: 'Light client init failed' })
                }
            }
        })()

        return () => { cancelled = true }
    }, [destination_network, isTerminal, lightClient])

    // Fetch details once light client is ready
    useEffect(() => {
        if (!destination_network || !destination_token || !hashlock || !lightClient || !destAtomicContract) return
        if (destinationDetailsByLightClient) return
        if (!supportsLightClient(destination_network)) return

        let cancelled = false;

        (async () => {
            try {
                setVerifyingByLightClient(true)
                const data = await lightClient.getDetails({
                    network: destination_network,
                    token: destination_token,
                    hashlock,
                    atomicContract: destAtomicContract,
                })
                if (!cancelled && data) {
                    setDestinationDetailsByLightClient({ data })
                }
            } catch (e) {
                if (!cancelled) {
                    setDestinationDetailsByLightClient({ data: undefined, error: 'Light client is not available' })
                }
                console.error('Light client verification failed:', e)
            } finally {
                if (!cancelled) setVerifyingByLightClient(false)
            }
        })()

        return () => { cancelled = true }
    }, [destination_network, destination_token, hashlock, destAtomicContract, lightClient, destinationDetailsByLightClient])

    return {
        lightClientInitialized: lightClient !== undefined,
        lightClientPending,
        verifyingByLightClient,
        destinationDetailsByLightClient,
    }
}
