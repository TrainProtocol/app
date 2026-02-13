import { Address } from '@fuel-ts/address'
import { concat, DateTime } from "@fuel-ts/utils"
import { Contract } from "@fuel-ts/program"
import { Account, B256Coder, BigNumberCoder, bn, Provider, sha256 } from 'fuels'
import { CreateHTLCParams, LockParams, OldLockParams, RefundParams, ClaimParams } from "../../../Models/phtlc"
import contractAbi from "../../abis/atomic/FUEL_PHTLC.json"
import LayerSwapApiClient from "../../trainApiClient"
import { useSecretDerivation } from "@/context/secretDerivationContext"
import { secretToHashlock } from "@/lib/htlc/secretDerivation"
import { BaseAtomicFunctions } from "../utils/atomicTypes"
import { generateRandomId } from "../utils/atomicHelpers"
import { LockDetails } from '@/Models/phtlc/PHTLC'

export interface UseAtomicFuelParams {
    wallet: Account | null
    fuelProvider: Provider | null
}

export default function useAtomicFuel(params: UseAtomicFuelParams): BaseAtomicFunctions {
    const { wallet, fuelProvider } = params
    const { deriveSecret } = useSecretDerivation()

    const createHTLC = async (params: CreateHTLCParams) => {
        const createEmptyArray = (length: number, char: string) =>
            Array.from({ length }, () => ''.padEnd(64, char));

        const hopChains = createEmptyArray(5, ' ')
        const hopAssets = createEmptyArray(5, ' ')
        const hopAddresses = createEmptyArray(5, ' ')

        const { destinationChain, destinationAsset, sourceAsset, srcLpAddress, address, amount, decimals, atomicContract } = params

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockMS = Math.floor((Date.now() + LOCK_TIME) / 1000)
        const timelock = DateTime.fromUnixSeconds(timeLockMS).toTai64();

        if (!fuelProvider) throw new Error('Node url not found')
        if (!wallet) throw new Error('Wallet not connected')

        // Secret derivation for HTLC with hashlock
        const chainId = params.chainId || 'fuel-mainnet';
        const secret = await deriveSecret({
            chainId,
            wallet: { metadata: { wallet }, providerName: 'fuel' } as any
        });
        // const hashlock = secretToHashlock(secret);

        // Note: Add hashlock to contract call params when contract supports it
        const contractAddress = new Address(atomicContract);
        const contractInstance = new Contract(contractAddress, contractAbi, wallet);

        const hashlock = (generateRandomId({ asBigInt: true }) as bigint).toString()

        const dstChain = destinationChain.padEnd(64, ' ');
        const dstAsset = destinationAsset.padEnd(64, ' ');
        const dstAddress = (address.startsWith('0x') && address.length > 64 ? address.slice(2) : address).padEnd(64, ' ');
        const srcAsset = sourceAsset.symbol.padEnd(64, ' ');
        const srcReceiver = { bits: srcLpAddress };

        const parsedAmount = Number(amount) * 10 ** sourceAsset.decimals

        const assetId: string | undefined = sourceAsset.contractAddress ? new Address(sourceAsset.contractAddress).toAssetId().bits : await fuelProvider.getBaseAssetId();

        const { transactionId } = await contractInstance.functions
            .commit(hopChains, hopAssets, hopAddresses, dstChain, dstAsset, dstAddress, srcAsset, hashlock, srcReceiver, timelock)
            .callParams({
                forward: [parsedAmount, assetId],
            })
            .call();

        return { hash: transactionId, hashlock: hashlock.toString() }
    }

    const claim = async (params: ClaimParams) => {
        const { id, contractAddress: contractAddressString, secret } = params

        const secretBigInt = BigInt(secret);
        const idBigInt = BigInt(id);

        if (!wallet) throw new Error('Wallet not connected')

        const contractInstance = new Contract(contractAddressString, contractAbi, wallet);

        if (!contractInstance) throw new Error('Contract instance not found')

        const { transactionId, waitForResult } = await contractInstance.functions
            .redeem(idBigInt, secretBigInt)
            .call();

        await waitForResult();

        return transactionId
    }

    const refund = async (params: RefundParams) => {
        const { id, contractAddress: contractAddressString } = params

        if (!wallet) throw new Error('Wallet not connected')

        const contractInstance = new Contract(contractAddressString, contractAbi, wallet);

        if (!contractInstance) throw new Error('Contract instance not found')

        const { transactionId, waitForResult } = await contractInstance.functions
            .refund(id)
            .call();

        await waitForResult();

        return transactionId

    }

    const getDetails = async (params: LockParams) => {
        const { id, contractAddress: contractAddressString } = params

        const contractInstance = fuelProvider && new Contract(contractAddressString, contractAbi, fuelProvider);

        if (!contractInstance) throw new Error('Contract instance not found')

        const details = (await contractInstance.functions.get_htlc_details(id).get()).value

        if (!details) return undefined

        const resolvedDetails = {
            ...details,
            amount: Number(details.amount) / 10 ** details.decimals,
            sender: details.sender?.['bits'],
            receiver: details.receiver?.['bits'],
            timelock: DateTime.fromTai64(details.timelock).toUnixSeconds(),
            secret: details.secret && details.secret != 1 ? Number(details.secret) : undefined,
            hashlock: details.hashlock !== "0x0000000000000000000000000000000000000000000000000000000000000001" ? details.hashlock : undefined,
        }

        return resolvedDetails
    }

    const addLockSig = async (params: LockParams & OldLockParams) => {
        const { id, hashlock, solver } = params

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockS = Math.floor((Date.now() + LOCK_TIME) / 1000)
        const timelock = DateTime.fromUnixSeconds(timeLockS).toTai64();

        const idBytes = new BigNumberCoder('u256').encode(bn(id));
        const hashlockBytes = new B256Coder().encode(hashlock);
        const timelockBytes = new BigNumberCoder('u64').encode(bn(timelock));

        const rawData = concat([idBytes, hashlockBytes, timelockBytes]);
        const message = sha256(rawData);

        if (!wallet) throw new Error('Wallet not connected')

        const signature = await wallet.signMessage(message);
        const apiClient = new LayerSwapApiClient()

        try {
            await apiClient.AddLockSig({
                signature: signature,
                timelock: timeLockS,
            },
                id,
                solver
            )
        } catch (e) {
            throw new Error("Failed to add lock")
        }

        return { hash: signature, result: signature }
    }

    return {
        createHTLC,
        getUserLockDetails: getDetails,
        refund,
        claim,
        getSolverLockDetails: function (params: LockParams): Promise<LockDetails | null> {
            throw new Error("Function not implemented.")
        }
    }
}
