import { vi } from 'vitest'
import type { TrainApiClient } from '@train-protocol/sdk'

export const SAMPLE_ADDRESS = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
export const SAMPLE_LP_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'
export const SAMPLE_CONTRACT = '0x9999999999999999999999999999999999999999999999999999999999999999'
export const SAMPLE_TOKEN = '0x5555555555555555555555555555555555555555555555555555555555555555'
export const SAMPLE_HASHLOCK = '0x' + 'aa'.repeat(32)
export const SAMPLE_TX_HASH = '0x' + 'bb'.repeat(32)

export function createMockWallet(): Record<string, ReturnType<typeof vi.fn>> {
    return {
        getAccounts: vi.fn().mockResolvedValue([{ item: SAMPLE_ADDRESS }]),
        registerContract: vi.fn().mockResolvedValue(undefined),
        registerSender: vi.fn().mockResolvedValue(undefined),
    }
}

export function createMockSigner(): { wallet: Record<string, ReturnType<typeof vi.fn>>; address: string } {
    return {
        wallet: createMockWallet(),
        address: SAMPLE_ADDRESS,
    }
}

export function createMockApiClient(): TrainApiClient {
    return {
        revealSecret: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrainApiClient
}
