import { vi } from 'vitest'
import type { TrainApiClient } from '@train-protocol/sdk'

export const SAMPLE_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
export const SAMPLE_LP_ADDRESS = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
export const SAMPLE_CONTRACT = '0x0999999999999999999999999999999999999999999999999999999999999999'
export const SAMPLE_TOKEN = '0x0555555555555555555555555555555555555555555555555555555555555555'
export const SAMPLE_HASHLOCK = '0x' + 'aa'.repeat(32)
export const SAMPLE_TX_HASH = '0x' + 'bb'.repeat(32)

export function createMockAccount(): Record<string, ReturnType<typeof vi.fn>> {
    return {
        execute: vi.fn().mockResolvedValue({ transaction_hash: SAMPLE_TX_HASH }),
        waitForTransaction: vi.fn().mockResolvedValue({}),
        signMessage: vi.fn().mockResolvedValue(['0x123', '0x456']),
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockSigner(accountOverrides?: Record<string, unknown>): { address: string; account: any } {
    const account = { ...createMockAccount(), ...accountOverrides }
    return {
        address: SAMPLE_ADDRESS,
        account,
    }
}

export function createMockApiClient(): TrainApiClient {
    return {
        revealSecret: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrainApiClient
}
