import { AbiEvent } from 'ox'
import { htlcEvents } from '../abi.js'
import type { TronEventLog } from '../types.js'
import type { Hex } from '../utils.js'
import { hex } from '../utils.js'

export function findUserLockedEvent(logs: TronEventLog[], matchHashlock?: string): Record<string, unknown> | null {
    for (const log of logs) {
        try {
            // TronGrid returns hex without 0x prefix — normalize
            const decoded = AbiEvent.decode(htlcEvents.UserLocked, {
                data: hex('0x' + log.data),
                topics: log.topics.map(t => hex('0x' + t)) as [Hex, ...Hex[]],
            }) as unknown as Record<string, unknown>

            if (!matchHashlock || decoded.hashlock === matchHashlock) {
                return decoded
            }
        } catch {
            // Not a UserLocked event — skip
        }
    }
    return null
}
