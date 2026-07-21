import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { LockStatus, formatUnits } from '@train-protocol/sdk'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import type { TypedProgramAccounts } from '../../types.js'
import { encoder, hexToUint8Array, writeBigUInt64LE } from '../../utils.js'
import { parseSecret } from '../helpers.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
    programFactory: (contractAddress: string, connection?: Connection) => Program,
): Promise<SolverLockDetails | null> {
    const { contractAddress, id } = params

    if (!contractAddress) throw new Error('No contract address')

    const connection = new Connection(nodeUrl, 'confirmed')
    const hashlockBytes = hexToUint8Array(id.replace('0x', ''))
    const program = programFactory(contractAddress, connection)

    const [counterPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("solver_count"), hashlockBytes],
        program.programId
    )
    const counterAccount = await connection.getAccountInfo(counterPda)
    if (!counterAccount) return null
    const count = Number((await (program.account as TypedProgramAccounts).solverLockCounter.fetch(counterPda)).count)
    if (count === 0) return null

    for (let i = 1; i <= count; i++) {
        const result = await getSolverLockByIndex(params, i, nodeUrl, programFactory)
        if (!result) continue
        if (params.solverAddress && result.sender?.toLowerCase() !== params.solverAddress.toLowerCase()) continue

        return result
    }

    return null
}

export async function getSolverLockByIndex(
    params: LockParams,
    index: number,
    nodeUrl: string,
    programFactory: (contractAddress: string, connection?: Connection) => Program,
): Promise<SolverLockDetails | null> {
    const { contractAddress, id } = params

    if (!contractAddress) throw new Error('No contract address')

    const connection = new Connection(nodeUrl, 'confirmed')
    const hashlockBytes = hexToUint8Array(id.replace('0x', ''))
    const program = programFactory(contractAddress, connection)

    const indexBytes = writeBigUInt64LE(BigInt(index))

    const [solverLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("solver_lock"), hashlockBytes, indexBytes],
        program.programId
    )

    try {
        const result = await (program.account as TypedProgramAccounts).solverLock.fetch(solverLockPda)

        if (!result) return null

        return resolveSolverLock(result, id, params.decimals, index)
    } catch (e) {
        console.error('Error fetching Solana solver lock details:', e)
        return null
    }
}

export function resolveSolverLock(result: any, id: string, decimals: number, index: number): SolverLockDetails | null {
    const sender = new PublicKey(result.sender).toString()
    if (sender === NATIVE_SOL_ADDRESS) return null

    return {
        hashlock: `0x${id.replace('0x', '')}`,
        amount: Number(formatUnits(BigInt(result.amount.toString()), decimals)),
        amountInBaseUnits: BigInt(result.amount.toString()),
        secret: parseSecret(result.secret),
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
        sender,
        recipient: new PublicKey(result.recipient).toString(),
        token: result.tokenMint ? result.tokenMint.toString() : '',
        reward: Number(formatUnits(BigInt(result.reward.toString()), decimals)),
        rewardTimelock: Number(result.rewardTimelock),
        rewardRecipient: new PublicKey(result.rewardRecipient).toString(),
        rewardToken: result.rewardTokenMint ? result.rewardTokenMint.toString() : '',
        refundTo: result.refundTo ? new PublicKey(result.refundTo).toString() : undefined,
        payoutCurve: result.payoutCurve ? new PublicKey(result.payoutCurve).toString() : undefined,
        index,
    }
}
