import { useMemo } from "react"
import { useConfig } from "wagmi"
import { Network } from "@/Models/Network"
import { EVMFaucetTokenProvider } from "./evmFaucetTokenProvider"
import type { FaucetTokenProvider } from "./types"

export function useFaucetTokenProvider(network: Network): FaucetTokenProvider | undefined {
    const wagmiConfig = useConfig()

    return useMemo(() => {
        const providers: FaucetTokenProvider[] = [
            new EVMFaucetTokenProvider(wagmiConfig),
        ]
        return providers.find(p => p.supportsNetwork(network))
    }, [network, wagmiConfig])
}

export type { FaucetTokenProvider, AddToWalletArgs } from "./types"
