import type { AztecNode } from '@aztec/aztec.js/node'
import { formatUnits } from '@train-protocol/sdk'
import type { LockParams, LockStatus, SolverLockDetails } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import { getNode, parseSecret } from '../helpers'
import type { ReferenceBlock } from './storage'
import { readSolverLock, readSolverLockCount } from './storage'

export async function getSolverLockDetails(
    _rpcUrl: string,
    _signer: AztecSigner | undefined,
    params: LockParams,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const node = getNode(nodeUrl)
    const referenceBlock = await node.getBlockNumber()
    const count = await readSolverLockCount(
        node,
        params.contractAddress,
        params.id,
        referenceBlock,
    )
    if (count === 0) return null

    for (let i = 1; i <= count; i++) {
        const result = await getSolverLockByIndexFromNode(node, params, i, referenceBlock)
        if (!result) continue
        if (params.solverAddress && result.sender?.toLowerCase() !== params.solverAddress.toLowerCase()) continue
        return result
    }

    return null
}

export async function getSolverLockByIndex(
    _rpcUrl: string,
    _signer: AztecSigner | undefined,
    params: LockParams,
    index: number,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const node = getNode(nodeUrl)
    return getSolverLockByIndexFromNode(node, params, index, await node.getBlockNumber())
}

async function getSolverLockByIndexFromNode(
    node: AztecNode,
    params: LockParams,
    index: number,
    referenceBlock: ReferenceBlock,
): Promise<SolverLockDetails | null> {
    const result = await readSolverLock(
        node,
        params.contractAddress,
        params.id,
        index,
        referenceBlock,
    )
    return resolveSolverLock(result, params.id, params.decimals, index)
}

export function resolveSolverLock(result: any, id: string, decimals: number, index: number): SolverLockDetails | null {
    const status = Number(result.status) as LockStatus
    if (status === 0) return null

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        secret: parseSecret(result.secret),
        timelock: Number(result.timelock),
        status,
        sender: result.sender?.toString() ?? result.refund_to?.toString() ?? '',
        recipient: result.recipient?.toString() ?? '',
        token: result.token?.toString() ?? '',
        reward: Number(formatUnits(BigInt(result.reward), decimals)),
        rewardTimelock: Number(result.reward_timelock),
        rewardRecipient: result.reward_recipient?.toString() ?? '',
        rewardToken: result.reward_token?.toString() ?? '',
        index,
    }
}
