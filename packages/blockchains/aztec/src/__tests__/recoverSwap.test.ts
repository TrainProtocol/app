import { describe, expect, it, vi } from 'vitest'
import { AztecAddress } from '@aztec/aztec.js/addresses'
import type { AztecNode } from '@aztec/aztec.js/node'
import type { Network, UserLockDetails } from '@train-protocol/sdk'

const { getPublicEventsMock, getUserLockDetailsMock } = vi.hoisted(() => ({
    getPublicEventsMock: vi.fn(),
    getUserLockDetailsMock: vi.fn(),
}))

vi.mock('@aztec/aztec.js/events', () => ({
    getPublicEvents: getPublicEventsMock,
}))

vi.mock('../client/public/getUserLockDetails', () => ({
    getUserLockDetails: getUserLockDetailsMock,
}))

import { recoverSwap } from '../client/public/recoverSwap'

describe('recoverSwap', () => {
    it('recovers a lock from a domain-tagged UserLocked event', async () => {
        const node = { getTxEffect: vi.fn() } as unknown as AztecNode
        const txHash = `0x${'11'.repeat(32)}`
        const contractAddress = AztecAddress.ZERO.toString()
        const tokenAddress = `0x${'22'.repeat(32)}`
        const hashlockBytes = Array.from({ length: 32 }, (_, index) => index)
        const hashlock = `0x${hashlockBytes
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('')}`
        const network = {
            caip2Id: 'aztec:1',
            displayName: 'Aztec',
            chainId: '1',
            nativeTokenAddress: tokenAddress,
            networkType: 'aztec',
            tokens: [{ symbol: 'TEST', contract: tokenAddress, decimals: 6 }],
            trainContract: contractAddress,
        } as Network
        const lockDetails = { hashlock } as UserLockDetails

        getPublicEventsMock.mockResolvedValueOnce({
            events: [{
                event: {
                    hashlock: hashlockBytes,
                    token: { toString: () => tokenAddress },
                },
            }],
        })
        getUserLockDetailsMock.mockResolvedValueOnce(lockDetails)

        await expect(recoverSwap(node, txHash, network)).resolves.toBe(lockDetails)

        expect(getPublicEventsMock).toHaveBeenCalledOnce()
        const [queriedNode, , filter] = getPublicEventsMock.mock.calls[0]
        expect(queriedNode).toBe(node)
        expect(filter.contractAddress.toString()).toBe(contractAddress)
        expect(filter.txHash.toString()).toBe(txHash)
        expect(getUserLockDetailsMock).toHaveBeenCalledWith(node, {
            id: hashlock,
            contractAddress,
            decimals: 6,
            txId: txHash,
            chainId: network.chainId,
        })
        expect(node.getTxEffect).not.toHaveBeenCalled()
    })
})
