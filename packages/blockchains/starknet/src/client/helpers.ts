import { Contract, hash, num, addAddressPadding, type ProviderOrAccount, type RpcProvider } from 'starknet'
import { LockStatus } from '@train-protocol/sdk'
import type { EventDerivedData } from '@train-protocol/sdk'
import htlcAbi from '../abis/STARKNET_HTLC.json' with { type: 'json' }

export function createContract(address: string, providerOrAccount: ProviderOrAccount): Contract {
    return new Contract({ abi: htlcAbi, address, providerOrAccount })
}

export function mapLockStatus(cairoStatus: any): LockStatus {
    // CairoCustomEnum — activeVariant is a METHOD, must be called
    if (typeof cairoStatus?.activeVariant === 'function') {
        const variant = cairoStatus.activeVariant() as string
        switch (variant) {
            case 'Pending': return LockStatus.Pending
            case 'Redeemed': return LockStatus.Redeemed
            case 'Refunded': return LockStatus.Refunded
            default: return LockStatus.Empty
        }
    }
    // Fallback: plain number/bigint
    if (typeof cairoStatus === 'number' || typeof cairoStatus === 'bigint') {
        return Number(cairoStatus) as LockStatus
    }
    // Fallback: { variant: { Refunded: {}, ... } } — active key has an object value
    if (cairoStatus?.variant && typeof cairoStatus.variant === 'object') {
        const variantKey = Object.keys(cairoStatus.variant).find(
            k => cairoStatus.variant[k] !== undefined
        )
        switch (variantKey) {
            case 'Pending': return LockStatus.Pending
            case 'Redeemed': return LockStatus.Redeemed
            case 'Refunded': return LockStatus.Refunded
            default: return LockStatus.Empty
        }
    }
    return LockStatus.Empty
}

export async function findUserLockedEvent(provider: RpcProvider, txHash: string, matchHashlock?: string): Promise<Record<string, any> | null> {
    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt || !('events' in receipt)) return null

    const userLockedSelector = hash.getSelectorFromName('UserLocked')
    const rawEvent = receipt.events.find(e => e.keys.includes(userLockedSelector))
    if (!rawEvent) return null

    const contract = createContract(rawEvent.from_address, provider)
    const parsed = contract.parseEvents(receipt)

    const userLockedEntry = parsed.find(
        ev => Object.keys(ev).some(k => k.includes('UserLocked'))
    )
    if (!userLockedEntry) return null

    const eventKey = Object.keys(userLockedEntry).find(k => k.includes('UserLocked'))!
    const event = userLockedEntry[eventKey] as Record<string, any>

    if (matchHashlock) {
        const eventHashlock = addAddressPadding(num.toHex(event.hashlock))
        if (eventHashlock.toLowerCase() !== matchHashlock.toLowerCase()) return null
    }

    return event
}

export function pickStarknetEventData(event: Record<string, any>): Partial<EventDerivedData> {
    const data: Partial<EventDerivedData> = {}
    if (event.dst_chain != null) data.dstChain = event.dst_chain as string
    if (event.dst_address != null) data.dstAddress = event.dst_address as string
    if (event.dst_amount != null) data.dstAmount = BigInt(event.dst_amount)
    if (event.dst_token != null) {
        const raw = event.dst_token as string
        data.dstToken = !raw || /^[\u0000]+$/.test(raw) ? '0x0000000000000000000000000000000000000000' : raw
    }
    if (event.userData != null || event.user_data != null) data.userData = (event.userData ?? event.user_data) as string
    if (event.solverData != null || event.solver_data != null) data.solverData = (event.solverData ?? event.solver_data) as string
    // The reward recipient is the solver's address on the *destination* chain — it is a
    // cross-chain identifier (ByteArray, not ContractAddress) for that reason. It is the
    // only place a swap recovered from a source tx can learn which solver to read the
    // destination lock from, since the quote that carried it is gone.
    if (event.reward_recipient != null) data.rewardRecipient = event.reward_recipient as string
    return data
}
