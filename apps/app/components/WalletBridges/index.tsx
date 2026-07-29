import { EvmWalletBridge } from './EvmWalletBridge'
import { SolanaWalletBridge } from './SolanaWalletBridge'
import { StarknetWalletBridge } from './StarknetWalletBridge'
import { AztecWalletBridge } from './AztecWalletBridge'
import { TronWalletBridge } from './TronWalletBridge'
import { FuelWalletBridge } from './FuelWalletBridge'

export function WalletBridges() {
    return (
        <>
            <EvmWalletBridge />
            <SolanaWalletBridge />
            <StarknetWalletBridge />
            <AztecWalletBridge />
            <TronWalletBridge />
            <FuelWalletBridge />
        </>
    )
}
