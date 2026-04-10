import { createAztecNodeClient } from '@aztec/aztec.js/node'
import { formatUnits, hexToBytes } from '@train-protocol/sdk'
import type { LockParams, LockStatus, SolverLockDetails } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import { requireSigner, getContractInstance, parseSecret } from '../helpers'

export async function getSolverLockDetails(
    rpcUrl: string,
    signer: AztecSigner | undefined,
    params: LockParams,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const validSigner = requireSigner(signer)
    const { id, contractAddress } = params
    const { contract, userAztecAddress } = await getContractInstance(contractAddress, validSigner, nodeUrl)

    const hashlockBytes = hexToBytes(id, 32)

    const count = Number(await contract.methods
        .get_solver_lock_count(hashlockBytes)
        .simulate({ from: userAztecAddress }))
    if (count === 0) return null

    for (let i = 1; i <= count; i++) {
        const result = await getSolverLockByIndex(rpcUrl, signer, params, i, nodeUrl)
        if (!result) continue
        if (params.solverAddress && result.sender?.toLowerCase() !== params.solverAddress.toLowerCase()) continue
        return result
    }

    return null
}

export async function getSolverLockByIndex(
    rpcUrl: string,
    signer: AztecSigner | undefined,
    params: LockParams,
    index: number,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const validSigner = requireSigner(signer)
    const { id, contractAddress } = params
    const { contract, userAztecAddress } = await getContractInstance(contractAddress, validSigner, nodeUrl)

    const hashlockBytes = hexToBytes(id, 32)

    const result: any = await contract.methods
        .get_solver_lock(hashlockBytes, BigInt(index))
        .simulate({ from: userAztecAddress })

    const status = Number(result.status) as LockStatus
    if (status === 0) return null

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
        secret: parseSecret(result.secret),
        timelock: Number(result.timelock),
        status,
        sender: result.sender?.toString() ?? '',
        recipient: result.recipient?.toString() ?? '',
        token: result.token?.toString() ?? '',
        reward: Number(formatUnits(BigInt(result.reward), params.decimals)),
        rewardTimelock: Number(result.reward_timelock),
        rewardRecipient: result.reward_recipient?.toString() ?? '',
        rewardToken: result.reward_token?.toString() ?? '',
        index,
    }
}
