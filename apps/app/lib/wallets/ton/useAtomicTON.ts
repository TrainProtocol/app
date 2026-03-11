import { beginCell, Cell, toNano } from "@ton/ton"
import { hexToBigInt } from "viem"
import { Network } from "../../../Models/Network"
import { UserLockParams, LockParams, OldLockParams, RefundParams, RedeemSolverParams } from "../../../Models/phtlc"
import { LockDetails } from "../../../Models/phtlc/PHTLC"
import { commitTransactionBuilder } from "./transactionBuilder"
import { retryUntilFecth } from "../../retry"
import { getTONDetails } from "./getters"
import { useSecretDerivation } from "@/context/secretDerivationContext"

export interface UseAtomicTONParams {
    tonWallet: any
    tonConnectUI: any
    networks: Network[]
    tonApiUrl: string
}

export default function useAtomicTON(params: UseAtomicTONParams) {
    const { tonWallet, tonConnectUI, networks, tonApiUrl } = params
    const { deriveSecret } = useSecretDerivation()

    const userLock = async (params: UserLockParams) => {

        if (!tonWallet?.account.publicKey) return

        // Secret derivation for HTLC with hashlock
        const secret = await deriveSecret({
            wallet: { providerName: 'ton', tonConnectUI } as any
        });
        // const hashlock = secretToHashlock(secret);

        // Note: Add hashlock to transaction params when contract supports it
        const network = networks.find(n => n.chainId === params.chainId)
        const tx = await commitTransactionBuilder({
            wallet: {
                address: tonWallet.account.address,
                publicKey: tonWallet.account.publicKey
            },
            network,
            ...params
        })

        if (!tx) throw new Error('Transaction not created')

        const res = await tonConnectUI.sendTransaction(tx)

        const cell = Cell.fromBase64(res.boc)
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');

        const getCommitId = async () => {

            await new Promise((resolve) => setTimeout(resolve, 3000))
            const events: Events = await fetch(`${tonApiUrl}/api/v3/events?msg_hash=${messageHash}`).then(res => res.json())

            if (events?.events.length > 0) {

                const transactionsArray = Object.values(events.events[0].transactions)
                const body = transactionsArray.find(t => t.out_msgs && t.out_msgs?.length > 0 && t.out_msgs[0]?.destination == null && t.out_msgs[0].opcode === '0xbf3d24d1')?.out_msgs?.[0]?.message_content?.body
                if (!body) throw new Error('No commitId')

                const slice = Cell.fromBase64(body).beginParse()
                if (slice.loadUint(32) !== 3208455377) { }
                const commitId = slice.loadIntBig(257);

                return '0x' + commitId.toString(16);
            } else {
                throw new Error('No events')
            }
        }

        const hashlock = await retryUntilFecth(getCommitId)


        return { hash: messageHash, hashlock }
    }

    const getDetails = async (params: LockParams): Promise<LockDetails> => {
        const network = networks.find(n => n.chainId === params.chainId)

        try {

            const detailsResult = await getTONDetails({ network, ...params })

            if (!(detailsResult)) {
                throw new Error("No result")
            }
            return detailsResult
        }
        catch (e) {
            console.log(e)
            throw new Error("No result")
        }

    }

    const addLock = async (params: LockParams & OldLockParams) => {
        const { id, hashlock, contractAddress } = params

        const timelock = BigInt(0)

        const body = beginCell()
            .storeUint(1558004185, 32)
            .storeInt(hexToBigInt(id as `0x${string}`), 257)
            .storeInt(hexToBigInt(hashlock as `0x${string}`), 257)
            .storeInt(timelock, 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.1').toString(),
                    payload: body.toBoc().toString("base64")
                }
            ]
        }

        const res = await tonConnectUI.sendTransaction(tx)
        const cell = Cell.fromBase64(res.boc)
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');

        return { hash: messageHash, result: res }
    }

    const refund = async (params: RefundParams) => {
        const { id, contractAddress } = params

        const opcode = 2910985977

        const body = beginCell()
            .storeUint(opcode, 32)
            .storeInt(hexToBigInt(id as `0x${string}`), 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.1').toString(),
                    payload: body.toBoc().toString("base64")
                }
            ]
        }

        const result = await tonConnectUI.sendTransaction(tx)

        if (!result) {
            throw new Error("No result")
        }
        return result
    }

    const redeemSolver = async (params: RedeemSolverParams) => {
        const { id, secret, contractAddress } = params

        const opcode = 1972220037

        const body = beginCell()
            .storeUint(opcode, 32)
            .storeInt(hexToBigInt(id as `0x${string}`), 257)
            .storeInt(hexToBigInt(secret as `0x${string}`), 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.1').toString(),
                    payload: body.toBoc().toString("base64")
                }
            ]
        }

        const result = await tonConnectUI.sendTransaction(tx);
        const cell = Cell.fromBase64(result.boc);
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');
        return messageHash;
    }

    return {
    userLock,
    getUserLockDetails: getDetails,
    refund,
    redeemSolver,
    getSolverLockDetails: function (params: LockParams): Promise<LockDetails | null> {
        throw new Error("Function not implemented.")
    }
}
}

type Events = {
    events: {
        transactions: {
            [transaction: string]: {
                out_msgs: {
                    opcode: string
                    destination: string | null,
                    message_content: {
                        body: string,
                    },
                }[]
            }
        }
    }[]
}