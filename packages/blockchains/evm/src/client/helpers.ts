import { AbiEvent } from 'ox'
import { htlcEvents } from '../abi.js'
import type { RpcLog } from '../types.js'
import type { Hex } from '../utils.js'
import { hex } from '../utils.js'

export function findUserLockedEvent(logs: RpcLog[], matchHashlock?: string): Record<string, unknown> | null {
    for (const log of logs) {
        try {
            const decoded = AbiEvent.decode(htlcEvents.UserLocked, {
                data: hex(log.data),
                topics: log.topics as [Hex, ...Hex[]],
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