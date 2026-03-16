import { useMemo } from 'react'
import { useSettingsState } from '@/context/settings'
import { useCurrentSwap } from '@train-protocol/react'

/**
 * Provides resolved app-specific data (Network objects, Token objects, etc.)
 * by reading from the react package's unified currentSwap + settings.
 * This complements useSwapState() from @train-protocol/react which provides lifecycle state.
 */
export function useSwapData() {
    const { networks } = useSettingsState()
    const currentSwap = useCurrentSwap()

    return useMemo(() => {
        const source = currentSwap?.source
        const destination = currentSwap?.destination
        const source_asset_symbol = currentSwap?.source_asset
        const destination_asset_symbol = currentSwap?.destination_asset

        const source_network = networks.find(n => n.caip2Id.toUpperCase() === (source as string)?.toUpperCase())
        const destination_network = networks.find(n => n.caip2Id.toUpperCase() === (destination as string)?.toUpperCase())
        const source_token = source_network?.tokens.find(t => t.symbol === source_asset_symbol)
        const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset_symbol)

        return {
            source_network,
            destination_network,
            source_asset: source_token,
            destination_asset: destination_token,
            address: currentSwap?.address,
            amount: currentSwap?.requestedAmount ? Number(currentSwap.requestedAmount) : undefined,
            hashlock: currentSwap?.hashlock,
            lockTxId: currentSwap?.txId,
            refundTxId: currentSwap?.refundTxId,
            srcAtomicContract: currentSwap?.srcContract,
            destAtomicContract: currentSwap?.destContract,
            solver: currentSwap?.solver,
            destinationSolverAddress: currentSwap?.destinationSolverAddress,
            receiveAmount: currentSwap?.receiveAmount,
        }
    }, [networks, currentSwap])
}
