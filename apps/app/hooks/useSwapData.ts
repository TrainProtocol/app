import { useMemo } from 'react'
import { useFormikContext } from 'formik'
import { useSettingsState } from '@/context/settings'
import { useSwap } from '@train-protocol/react'
import { useSwapStore } from '@/stores/swapStore'
import type { SwapFormValues } from '@/components/DTOs/SwapFormValues'

/**
 * Provides resolved app-specific data (Network objects, Token objects, etc.)
 *
 * After lock: reads from the persisted swap in the react package store.
 * Before lock: falls back to Formik form values (must be inside <Formik>).
 */
export function useSwapData() {
    const { networks } = useSettingsState()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const committedSwap = useSwap(activeHashlock)
    const formik = useFormikContext<SwapFormValues>()

    return useMemo(() => {
        // After lock — read from package store
        if (committedSwap) {
            const source = committedSwap.source
            const destination = committedSwap.destination

            const source_network = networks.find(n => n.caip2Id.toUpperCase() === source?.toUpperCase())
            const destination_network = networks.find(n => n.caip2Id.toUpperCase() === destination?.toUpperCase())
            const source_token = source_network?.tokens.find(t => t.symbol === committedSwap.source_asset)
            const destination_token = destination_network?.tokens.find(t => t.symbol === committedSwap.destination_asset)

            return {
                source_network,
                destination_network,
                source_asset: source_token,
                destination_asset: destination_token,
                address: committedSwap.address,
                amount: committedSwap.requestedAmount ? Number(committedSwap.requestedAmount) : undefined,
                hashlock: committedSwap.hashlock,
                lockTxId: committedSwap.txId,
                refundTxId: committedSwap.refundTxId,
                srcAtomicContract: committedSwap.srcContract,
                destAtomicContract: committedSwap.destContract,
                solver: committedSwap.solver,
                destinationSolverAddress: committedSwap.destinationSolverAddress,
                receiveAmount: committedSwap.receiveAmount,
            }
        }

        // Before lock — read from Formik form values
        const values = formik?.values
        return {
            source_network: values?.from,
            destination_network: values?.to,
            source_asset: values?.fromCurrency,
            destination_asset: values?.toCurrency,
            address: values?.destination_address,
            amount: values?.amount ? Number(values.amount) : undefined,
            hashlock: undefined,
            lockTxId: undefined,
            refundTxId: undefined,
            srcAtomicContract: undefined,
            destAtomicContract: undefined,
            solver: undefined,
            destinationSolverAddress: undefined,
            receiveAmount: undefined,
        }
    }, [networks, committedSwap, formik?.values])
}
