import { vi } from 'vitest'
import type { EvmSigner } from '../types.js'
import type { TrainApiClient } from '@train-protocol/sdk'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const SAMPLE_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'
export const SAMPLE_LP_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
export const SAMPLE_CONTRACT = '0x9999999999999999999999999999999999999999'
export const SAMPLE_TOKEN = '0x5555555555555555555555555555555555555555'
export const SAMPLE_HASHLOCK = '0x' + 'aa'.repeat(32)
export const SAMPLE_TX_HASH = '0x' + 'bb'.repeat(32)

export function createMockSigner(overrides?: Partial<EvmSigner>): EvmSigner {
    return {
        address: SAMPLE_ADDRESS,
        sendTransaction: vi.fn().mockResolvedValue(SAMPLE_TX_HASH),
        ...overrides,
    }
}

export function createMockApiClient(): TrainApiClient {
    return {
        revealSecret: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrainApiClient
}

export function createMockRpc(): Record<string, ReturnType<typeof vi.fn>> {
    return {
        ethCall: vi.fn().mockResolvedValue('0x'),
        getTransactionReceipt: vi.fn().mockResolvedValue(null),
        getTransaction: vi.fn().mockResolvedValue(null),
        getBlockByNumber: vi.fn().mockResolvedValue(null),
    }
}

export function createSuccessfulFetchResponse(result: unknown) {
    return {
        ok: true,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result }),
    }
}

export function createErrorFetchResponse(code: number, message: string, data?: unknown) {
    return {
        ok: true,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, error: { code, message, data } }),
    }
}

export function createHttpErrorResponse(status: number, statusText: string) {
    return {
        ok: false,
        status,
        statusText,
    }
}
