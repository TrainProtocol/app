import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { LockStatus, formatUnits, normalizePayoutCurveData } from '@train-protocol/sdk'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import type { TypedProgramAccounts } from '../../types.js'
import { encoder, hexToUint8Array } from '../../utils.js'
import { parseSecret } from '../helpers.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
    programFactory: (contractAddress: string, connection?: Connection) => Program,
): Promise<SolverLockDetails | null> {
    const { contractAddress, id, solverAddress } = params

    if (!contractAddress) throw new Error('No contract address')
    if (!solverAddress) throw new Error('solverAddress is required to read a solver lock')

    const connection = new Connection(nodeUrl, 'confirmed')
    const hashlockBytes = hexToUint8Array(id.replace('0x', ''))
    const program = programFactory(contractAddress, connection)

    const [solverLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("solver_lock"), hashlockBytes, new PublicKey(solverAddress).toBytes()],
        program.programId
    )

    // `fetchNullable` returns null only for an absent account — the solver has not locked
    // yet. Everything else (node failure, account-layout drift, and the fail-closed payout
    // policy check below) must propagate: the poller treats a rejection as an unhealthy node
    // and trips its consecutive-failure breaker, while a swallowed `null` reads as "no lock
    // yet" and polls forever with no chance of succeeding.
    const result = await (program.account as TypedProgramAccounts).solverLock.fetchNullable(solverLockPda)

    if (!result) return null

    return resolveSolverLock(result, id, params.decimals)
}

export function resolveSolverLock(result: any, id: string, decimals: number): SolverLockDetails | null {
    const sender = new PublicKey(result.sender).toString()
    if (sender === NATIVE_SOL_ADDRESS) return null
    if (result.payoutCurve == null || result.payoutCurveData == null) {
        throw new Error('Solver lock payout policy is unavailable')
    }

    const payoutCurve = new PublicKey(result.payoutCurve).toString()

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
        payoutCurve: payoutCurve === NATIVE_SOL_ADDRESS ? null : payoutCurve,
        payoutCurveData: normalizePayoutCurveData(result.payoutCurveData),
    }
}
