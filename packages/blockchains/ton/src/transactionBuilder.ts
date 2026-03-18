import {
    Address,
    beginCell,
    Builder,
    Cell,
    Dictionary,
    toNano,
} from '@ton/ton'
import type { DictionaryValue, Slice } from '@ton/core'
import { parseUnits } from '@train-protocol/sdk'
import {
    USER_LOCK_OPCODE,
    LOCK_OPCODE,
    REDEEM_OPCODE,
    REFUND_OPCODE,
    JETTON_TRANSFER_OPCODE,
    JETTON_USER_LOCK_OPCODE,
    JETTON_LOCK_OPCODE,
    GAS_AMOUNT,
    TX_VALIDITY_SECONDS,
} from './constants.js'

// ── Types for transaction builder params ────────────────────────────────

export type UserLockPayloadParams = {
    id: bigint
    hashlock: bigint
    amount: bigint
    srcReceiver: string
    timelock: bigint
    senderPubKey: bigint
    dstChain: string
    dstAsset: string
    dstAddress: string
    srcAsset: string
    hopChains: [bigint, string][]
    hopAssets: [bigint, string][]
    hopAddresses: [bigint, string][]
    userData: bigint
}

export type JettonUserLockPayloadParams = UserLockPayloadParams & {
    jettonMasterAddress: string
    htlcJettonWalletAddress: string
    senderJettonWalletAddress: string
    atomicContract: string
    responseDestination: string
}

export type NativeLockParams = {
    id: bigint
    hashlock: bigint
    timelock: bigint
    amount: bigint
    reward: bigint
    rewardTimelock: bigint
    srcReceiver: string
    srcAsset: string
    dstChain: string
    dstAddress: string
    dstAsset: string
}

// ── StringImpl dict helpers (ported from old transactionBuilder.ts) ─────

type StringImpl = {
    $$type: 'StringImpl'
    data: string
}

function storeStringImpl(src: StringImpl) {
    return (builder: Builder) => {
        builder.storeStringRefTail(src.data)
    }
}

function loadStringImpl(slice: Slice): StringImpl {
    const data = slice.loadStringRefTail()
    return { $$type: 'StringImpl' as const, data }
}

function dictValueParserStringImpl(): DictionaryValue<StringImpl> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStringImpl(src)).endCell())
        },
        parse: (src) => {
            return loadStringImpl(src.loadRef().beginParse())
        },
    }
}

function createStrMap(initialData: [bigint, string][]): Dictionary<bigint, StringImpl> {
    const dict = Dictionary.empty<bigint, StringImpl>()
    initialData.forEach(([key, value]) => {
        dict.set(key, { $$type: 'StringImpl', data: value })
    })
    return dict
}

// ── Public builders ─────────────────────────────────────────────────────

/** Build a UserLock cell payload for native TON. */
export function buildUserLockPayload(params: UserLockPayloadParams): Cell {
    const hopChains = createStrMap(params.hopChains)
    const hopAssets = createStrMap(params.hopAssets)
    const hopAddresses = createStrMap(params.hopAddresses)

    const b_0 = new Builder()
    b_0.storeStringRefTail(params.dstChain)
    b_0.storeStringRefTail(params.dstAsset)
    const b_1 = new Builder()
    b_1.storeStringRefTail(params.dstAddress)
    b_1.storeStringRefTail(params.srcAsset)
    b_1.storeAddress(Address.parse(params.srcReceiver))
    b_1.storeInt(params.timelock, 257)
    const b_2 = new Builder()
    b_2.storeInt(params.senderPubKey, 257)
    b_2.storeDict(hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl())
    b_2.storeDict(hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl())
    b_2.storeDict(hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl())
    b_2.storeInt(params.userData, 257)
    b_1.storeRef(b_2.endCell())
    b_0.storeRef(b_1.endCell())

    return beginCell()
        .storeUint(USER_LOCK_OPCODE, 32)
        .storeInt(params.hashlock, 257)
        .storeBuilder(b_0)
        .endCell()
}

/** Build a Jetton transfer payload containing a UserLock forward message. */
export function buildJettonUserLockPayload(params: JettonUserLockPayloadParams): {
    payload: string
    targetAddress: string
    amount: string
} {
    const hopChains = createStrMap(params.hopChains)
    const hopAssets = createStrMap(params.hopAssets)
    const hopAddresses = createStrMap(params.hopAddresses)

    const parsedAtomicContract = Address.parse(params.atomicContract)
    const responseDestination = Address.parse(params.responseDestination)
    const srcReceiver = Address.parse(params.srcReceiver)
    const jettonMasterAddress = Address.parse(params.jettonMasterAddress)
    const htlcJettonWalletAddress = Address.parse(params.htlcJettonWalletAddress)

    // Build UserLockData structure (nested refs matching Tact struct layout)
    const b_0 = new Builder()
    b_0.storeStringRefTail(params.dstChain)
    b_0.storeStringRefTail(params.dstAsset)
    const b_1 = new Builder()
    b_1.storeStringRefTail(params.dstAddress)
    b_1.storeStringRefTail(params.srcAsset)
    b_1.storeAddress(srcReceiver)
    b_1.storeInt(params.timelock, 257)
    b_1.storeAddress(jettonMasterAddress)
    const b_2 = new Builder()
    b_2.storeAddress(htlcJettonWalletAddress)
    b_2.storeInt(params.senderPubKey, 257)
    b_2.storeDict(hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl())
    b_2.storeDict(hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl())
    b_2.storeDict(hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl())
    b_2.storeInt(params.userData, 257)
    b_1.storeRef(b_2.endCell())
    b_0.storeRef(b_1.endCell())

    const forwardPayload = beginCell()
        .storeUint(1, 1)
        .storeRef(
            beginCell()
                .storeUint(JETTON_USER_LOCK_OPCODE, 32)
                .storeInt(params.hashlock, 257)
                .storeBuilder(b_0)
                .endCell(),
        )
        .endCell()

    const customPayload = beginCell()
        .storeInt(0, 32)
        .storeStringTail('Success')
        .endCell()

    const queryId = BigInt(Date.now())

    const body = beginCell()
        .storeUint(JETTON_TRANSFER_OPCODE, 32)
        .storeUint(queryId, 64)
        .storeCoins(params.amount)
        .storeAddress(parsedAtomicContract)
        .storeAddress(responseDestination)
        .storeBit(1)
        .storeRef(customPayload)
        .storeCoins(toNano('0.1'))
        .storeBuilder(forwardPayload.asBuilder())
        .endCell()

    return {
        payload: body.toBoc().toString('base64'),
        targetAddress: params.senderJettonWalletAddress,
        amount: toNano(GAS_AMOUNT).toString(),
    }
}

/** Build a Lock cell payload for native TON (solver lock). */
export function buildLockPayload(params: NativeLockParams): Cell {
    return beginCell()
        .storeUint(LOCK_OPCODE, 32)
        .storeInt(params.id, 257)
        .storeInt(params.hashlock, 257)
        .storeInt(params.timelock, 257)
        .storeCoins(params.amount)
        .storeCoins(params.reward)
        .storeInt(params.rewardTimelock, 257)
        .storeAddress(Address.parse(params.srcReceiver))
        .storeStringRefTail(params.srcAsset)
        .storeStringRefTail(params.dstChain)
        .storeStringRefTail(params.dstAddress)
        .storeStringRefTail(params.dstAsset)
        .endCell()
}

/** Build a Refund cell payload. */
export function buildRefundPayload(id: bigint): Cell {
    return beginCell()
        .storeUint(REFUND_OPCODE, 32)
        .storeInt(id, 257)
        .endCell()
}

/** Build a Redeem cell payload. */
export function buildRedeemPayload(id: bigint, secret: bigint): Cell {
    return beginCell()
        .storeUint(REDEEM_OPCODE, 32)
        .storeInt(id, 257)
        .storeInt(secret, 257)
        .endCell()
}

// ── Utility: build a TonConnect-compatible transaction object ────────────

export function buildTonConnectTx(
    address: string,
    amount: string,
    payload: Cell,
): { validUntil: number; messages: { address: string; amount: string; payload: string }[] } {
    return {
        validUntil: Math.floor(Date.now() / 1000) + TX_VALIDITY_SECONDS,
        messages: [
            {
                address,
                amount,
                payload: payload.toBoc().toString('base64'),
            },
        ],
    }
}

/** Parse a user-facing amount string + decimals into a bigint (smallest unit). */
export function parseAmount(amount: string, decimals: number): bigint {
    return parseUnits(amount.toString(), decimals)
}
