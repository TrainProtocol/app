import { LockParams } from "../../../Models/phtlc";
import { Address } from "@ton/ton"
import { createTonClient } from "./client";
import { hexToBigInt, toHex } from "viem";
import { TupleBuilder } from "@ton/core"
import { Network } from "../../../Models/Network";
import { LockDetails } from "../../../Models/phtlc/PHTLC";


export const getTONDetails = async (params: LockParams & { network: Network | undefined }) => {

    const {
        id,
        contractAddress,
        network
    } = params

    if (!network) throw Error("No network found")

    const client = createTonClient(network);
    const bigIntValue = hexToBigInt(id as `0x${string}`);

    let args = new TupleBuilder();
    args.writeNumber(bigIntValue);

    const commitResult = await client.runMethod(
        Address.parse(contractAddress),
        "getDetails",
        args.build()
    );

    const commitDetails = (commitResult.stack as any)?.items?.[0]?.items

    if (!commitDetails) return null

    const details = commitDetails;
    const srcAsset = details[3].beginParse().loadStringTail()
    const sender = details[4].beginParse().loadAddress().toString()

    // const token = network?.tokens.find(t => t.symbol === srcAsset)
    // const amount = Number(details[9]) / Math.pow(10, token?.decimals || 8)
    const hashlock = (Number(details[8]) != 0) ? toHex(details[8]) : undefined

    const parsedResult: LockDetails = {
        sender,
        srcReceiver: details[6].beginParse().loadAddress().toString(),
        timelock: Number(details[10]),
        amount: Number(details[9]),
        hashlock,
        secret: BigInt(details[7]),
    }

    return parsedResult
}