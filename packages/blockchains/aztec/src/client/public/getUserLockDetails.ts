import type { AztecNode } from '@aztec/aztec.js/node'
import { formatUnits, hexToBytes } from '@train-protocol/sdk'
import type { LockParams, LockStatus, UserLockDetails, BaseLockDetails, EventDerivedData } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import { requireSigner, getContractInstance, parseSecret, findEventDataFromLogs } from '../helpers'

export async function getUserLockDetails(
    rpcUrl: string,
    node: AztecNode,
    signer: AztecSigner | undefined,
    params: LockParams,
): Promise<UserLockDetails | null> {
    const validSigner = requireSigner(signer)
    const { id, contractAddress, txId } = params
    const { contract, userAztecAddress } = await getContractInstance(contractAddress, validSigner, node)

    const hashlockBytes = hexToBytes(id, 32)
    const result: any = await contract.methods
        .get_user_lock(hashlockBytes)
        .simulate({ from: userAztecAddress })

    const status = Number(result.status) as LockStatus
    if (status === 0) return null

    const parsedResult: BaseLockDetails = {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
        secret: parseSecret(result.secret),
        timelock: Number(result.timelock),
        status,
        sender: result.sender?.toString() ?? '',
        recipient: result.recipient?.toString() ?? '',
        token: result.token?.toString() ?? '',
    }

    let eventDerivedData = {} as Partial<EventDerivedData>
    if (txId) {
        eventDerivedData = await findEventDataFromLogs(node, txId, id)
    }

    return { ...parsedResult, ...eventDerivedData }
}
