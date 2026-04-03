import { EvmWalletBridge } from './EvmWalletBridge'
import { SolanaWalletBridge } from './SolanaWalletBridge'
import { StarknetWalletBridge } from './StarknetWalletBridge'
import { AztecWalletBridge } from './AztecWalletBridge'

export function WalletBridges() {
    return (
        <>
            <EvmWalletBridge />
            <SolanaWalletBridge />
            <StarknetWalletBridge />
            <AztecWalletBridge />
        </>
    )
}
