import { ExtendedNetwork, Network } from "@/Models/Network"
import type { FaucetToken } from "../api"

export type AddToWalletArgs = {
    network: ExtendedNetwork
    token: FaucetToken
    recipient: string
}

export interface FaucetTokenProvider {
    supportsNetwork(network: Network): boolean
    addToWallet(args: AddToWalletArgs): Promise<boolean>
}
