import { EventDerivedData } from "@train-protocol/sdk"

export const eventDerivedDataKeys: readonly (keyof EventDerivedData)[] = [
    'userData', 'solverData',
    'reward', 'rewardToken', 'rewardRecipient', 'rewardTimelock',
    'dstChain', 'dstAddress', 'dstAmount', 'dstToken',
] as const

export function pickEventDerivedData(event: Record<string, unknown>): Partial<EventDerivedData> {
    const data: Record<string, unknown> = {}
    for (const key of eventDerivedDataKeys) {
        if (key in event && event[key] != null) {
            data[key] = event[key]
        }
    }
    return data as Partial<EventDerivedData>
}
