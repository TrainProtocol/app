import { formatUnits, type LockDetails, LockStatus } from '@train-protocol/sdk'

/**
 * Parse the TupleReader stack from getUserLock into LockDetails.
 *
 * The Tact contract returns an HTLC struct as a tuple:
 * [sender, senderPubKey, srcReceiver, hashlock, amount, timelock]
 */
export function parseHTLCFromStack(
    stack: any,
    id: string,
    tokenDecimals: number,
): LockDetails | null {
    try {
        const items = (stack as any)?.items?.[0]?.items ?? null
        if (!items) return null

        const sender = items[0]?.beginParse?.()?.loadAddress?.()?.toString() ?? null
        if (!sender) return null

        const senderPubKey = items[1] ? BigInt(items[1]) : 0n
        const srcReceiver = items[2]?.beginParse?.()?.loadAddress?.()?.toString() ?? undefined
        const hashlock = items[3] ? BigInt(items[3]) : 0n
        const amount = items[4] ? Number(items[4]) : 0
        const timelock = items[5] ? Number(items[5]) : 0

        return {
            hashlock: hashlock !== 0n ? '0x' + hashlock.toString(16) : id,
            amount: Number(formatUnits(BigInt(amount), tokenDecimals)),
            secret: undefined,
            sender,
            recipient: srcReceiver,
            timelock,
            status: LockStatus.Pending,
        }
    } catch {
        return null
    }
}

/**
 * Parse the TupleReader stack from getSolverLock into LockDetails.
 */
export function parseSolverLockFromStack(
    stack: any,
    id: string,
    tokenDecimals: number,
): LockDetails | null {
    try {
        const items = (stack as any)?.items?.[0]?.items ?? null
        if (!items) return null

        const sender = items[0]?.beginParse?.()?.loadAddress?.()?.toString() ?? null
        if (!sender) return null

        const srcReceiver = items[1]?.beginParse?.()?.loadAddress?.()?.toString() ?? undefined
        const hashlock = items[2] ? BigInt(items[2]) : 0n
        const amount = items[3] ? Number(items[3]) : 0
        const timelock = items[4] ? Number(items[4]) : 0

        return {
            hashlock: hashlock !== 0n ? '0x' + hashlock.toString(16) : id,
            amount: Number(formatUnits(BigInt(amount), tokenDecimals)),
            secret: undefined,
            sender,
            recipient: srcReceiver,
            timelock,
            status: LockStatus.Pending,
        }
    } catch {
        return null
    }
}
