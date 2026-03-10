import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JsonRpcClient, JsonRpcError } from '../rpc.js'
import {
    createSuccessfulFetchResponse,
    createErrorFetchResponse,
    createHttpErrorResponse,
} from './helpers.js'

const RPC_URL = 'https://rpc.example.com'

describe('JsonRpcClient', () => {
    let rpc: JsonRpcClient
    let mockFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockFetch = vi.fn()
        vi.stubGlobal('fetch', mockFetch)
        rpc = new JsonRpcClient(RPC_URL)
    })

    describe('call', () => {
        it('sends POST with correct JSON-RPC envelope', async () => {
            mockFetch.mockResolvedValue(createSuccessfulFetchResponse('0x1'))

            await rpc.call('eth_blockNumber', [])

            expect(mockFetch).toHaveBeenCalledWith(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: expect.stringContaining('"method":"eth_blockNumber"'),
            })

            const body = JSON.parse(mockFetch.mock.calls[0][1].body)
            expect(body.jsonrpc).toBe('2.0')
            expect(body.method).toBe('eth_blockNumber')
            expect(body.params).toEqual([])
            expect(typeof body.id).toBe('number')
        })

        it('returns json.result on success', async () => {
            mockFetch.mockResolvedValue(createSuccessfulFetchResponse('0xdeadbeef'))

            const result = await rpc.call('eth_call', [{ to: '0x1' }, 'latest'])
            expect(result).toBe('0xdeadbeef')
        })

        it('throws JsonRpcError when response contains error', async () => {
            mockFetch.mockResolvedValue(
                createErrorFetchResponse(-32000, 'execution reverted', '0xrevert')
            )

            await expect(rpc.call('eth_call', [])).rejects.toThrow(JsonRpcError)
            await expect(rpc.call('eth_call', [])).rejects.toMatchObject({
                message: 'execution reverted',
                code: -32000,
                data: '0xrevert',
            })
        })

        it('throws on non-OK HTTP status', async () => {
            mockFetch.mockResolvedValue(createHttpErrorResponse(500, 'Internal Server Error'))

            await expect(rpc.call('eth_call', [])).rejects.toThrow(
                'RPC HTTP error: 500 Internal Server Error'
            )
        })
    })

    describe('ethCall', () => {
        it('builds callObj with to and data only when from/value not provided', async () => {
            mockFetch.mockResolvedValue(createSuccessfulFetchResponse('0x'))

            await rpc.ethCall('0xcontract', '0xcalldata')

            const body = JSON.parse(mockFetch.mock.calls[0][1].body)
            expect(body.params[0]).toEqual({ to: '0xcontract', data: '0xcalldata' })
            expect(body.params[1]).toBe('latest')
        })

        it('includes from in callObj when provided', async () => {
            mockFetch.mockResolvedValue(createSuccessfulFetchResponse('0x'))

            await rpc.ethCall('0xcontract', '0xcalldata', '0xsender')

            const body = JSON.parse(mockFetch.mock.calls[0][1].body)
            expect(body.params[0].from).toBe('0xsender')
        })

        it('includes hex-encoded value when bigint provided', async () => {
            mockFetch.mockResolvedValue(createSuccessfulFetchResponse('0x'))

            await rpc.ethCall('0xcontract', '0xcalldata', '0xsender', 1000000000000000000n)

            const body = JSON.parse(mockFetch.mock.calls[0][1].body)
            expect(body.params[0].value).toBe('0xde0b6b3a7640000')
        })

        it('uses custom blockTag when specified', async () => {
            mockFetch.mockResolvedValue(createSuccessfulFetchResponse('0x'))

            await rpc.ethCall('0xcontract', '0xcalldata', undefined, undefined, '0x10')

            const body = JSON.parse(mockFetch.mock.calls[0][1].body)
            expect(body.params[1]).toBe('0x10')
        })
    })

    describe('getBlockByNumber', () => {
        it('calls eth_getBlockByNumber with fullTxs=false by default', async () => {
            mockFetch.mockResolvedValue(createSuccessfulFetchResponse(null))

            await rpc.getBlockByNumber('0x10')

            const body = JSON.parse(mockFetch.mock.calls[0][1].body)
            expect(body.method).toBe('eth_getBlockByNumber')
            expect(body.params).toEqual(['0x10', false])
        })

        it('passes fullTxs=true when requested', async () => {
            mockFetch.mockResolvedValue(createSuccessfulFetchResponse(null))

            await rpc.getBlockByNumber('0x10', true)

            const body = JSON.parse(mockFetch.mock.calls[0][1].body)
            expect(body.params).toEqual(['0x10', true])
        })
    })
})
