import { Contract, getAllDecodedLogs, Provider } from 'fuels'
import type {
    Account,
    JsonAbi,
    TransactionResultReceipt,
} from 'fuels'
import trainAbiJson from '../abis/train-abi.json' with { type: 'json' }
import type {
    FuelDestinationInfoInput,
    FuelUserLockInput,
    FuelUserLockedEvent,
} from '../types.js'

export const trainAbi = trainAbiJson as JsonAbi

export function buildContract(contractAddress: string, accountOrProvider: Account | Provider): Contract {
    return new Contract(contractAddress, trainAbi, accountOrProvider)
}

export function decodeTrainLogs(receipts: TransactionResultReceipt[] | undefined): unknown[] {
    if (!receipts?.length) return []
    return getAllDecodedLogs({
        receipts,
        mainAbi: trainAbi,
    }).logs
}

export function findUserLockedEvent(logs: unknown[] | undefined, hashlock?: string): FuelUserLockedEvent | null {
    for (const log of logs ?? []) {
        if (!log || typeof log !== 'object') continue
        const candidate = log as Partial<FuelUserLockedEvent>
        if (!candidate.hashlock || !candidate.asset_id || candidate.user_data === undefined) continue
        if (hashlock && candidate.hashlock.toLowerCase() !== hashlock.toLowerCase()) continue
        return candidate as FuelUserLockedEvent
    }
    return null
}

export type BuiltUserLockArguments = {
    lock: FuelUserLockInput
    destination: FuelDestinationInfoInput
    userData: Uint8Array
    solverData: Uint8Array
    amount: string
    assetId: string
}
