import { GasProps } from "../../../Models/Balance";
import { Network } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import { Provider } from "./types";

export class SolanaGasProvider implements Provider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.SolanaMainnet.includes(network.name)
    }

    getGas = async ({ address, network, token }: GasProps) => {
        if (!address)
            return
        const { PublicKey, Connection } = await import("@solana/web3.js");

        const walletPublicKey = new PublicKey(address)

        const connection = new Connection(
            `${network.nodes[0].url}`,
            "confirmed"
        );

        if (!walletPublicKey) return

        try {
            const transactionBuilder = ((await import("../../wallets/solana/transactionBuilder")).transactionBuilder);

            const transaction = await transactionBuilder(network, token, walletPublicKey)

            const nativeToken = network.native_token

            if (!transaction || !nativeToken) return

            const message = transaction.compileMessage();
            const result = await connection.getFeeForMessage(message)

            const formatedGas = formatAmount(result.value, nativeToken.decimals)

            return formatedGas
        }
        catch (e) {
            console.log(e)
        }
    }
}