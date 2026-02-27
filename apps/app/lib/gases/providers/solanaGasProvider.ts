import { GasProps } from "../../../Models/Balance";
import { Network, getNativeToken } from "../../../Models/Network";
import { formatUnits } from "viem";
import KnownInternalNames from "../../knownIds";
export class SolanaGasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.SolanaMainnet.includes(network.caip2Id)
    }

    getGas = async ({ address, network, token }: GasProps) => {
        if (!address)
            return
        const { PublicKey, Connection } = await import("@solana/web3.js");

        const walletPublicKey = new PublicKey(address)

        const connection = new Connection(
            `${network.nodes?.[0]?.url}`,
            "confirmed"
        );

        if (!walletPublicKey) return

        try {
            const transactionBuilder = ((await import("../../wallets/solana/transactionBuilder")).transactionBuilder);

            const transaction = await transactionBuilder(network, token, walletPublicKey)

            const nativeToken = getNativeToken(network)

            if (!transaction || !nativeToken) return

            const message = transaction.compileMessage();
            const result = await connection.getFeeForMessage(message)

            const formatedGas = result.value ? Number(formatUnits(BigInt(result.value), nativeToken.decimals)) : undefined

            return formatedGas
        }
        catch (e) {
            console.log(e)
        }
    }
}