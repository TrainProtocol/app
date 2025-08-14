// import { Balance } from "../../../Models/Balance";
// import { Network } from "../../../Models/Network";
// import KnownInternalNames from "../../knownIds";

// export class SolanaBalanceProvider {
//     supportsNetwork(network: Network): boolean {
//         return (KnownInternalNames.Networks.SolanaMainnet.includes(network.name) || KnownInternalNames.Networks.SolanaDevnet.includes(network.name) || KnownInternalNames.Networks.SolanaTestnet.includes(network.name))
//     }

//     fetchBalance = async (address: string, network: Network) => {
//         if (!address) return

//         const SolanaWeb3 = await import("@solana/web3.js");
//         const { PublicKey, Connection } = SolanaWeb3
//         class SolanaConnection extends Connection { }
//         const { getAssociatedTokenAddress } = await import('@solana/spl-token');
//         const walletPublicKey = new PublicKey(address)
//         let balances: Balance[] = []

//         if (!network?.tokens || !walletPublicKey) return

//         const connection = new SolanaConnection(
//             `${network.rpcUrl}`,
//             "confirmed"
//         );

//         async function getTokenBalanceWeb3(connection: SolanaConnection, tokenAccount) {
//             const info = await connection.getTokenAccountBalance(tokenAccount);
//             return info?.value?.uiAmount;
//         }

//         for (let i = 0; i < network.tokens.length; i++) {
//             try {
//                 const asset = network.tokens[i]

//                 let result: number | null = null

//                 if (asset.contract) {
//                     const sourceToken = new PublicKey(asset?.contract!);
//                     const associatedTokenFrom = await getAssociatedTokenAddress(
//                         sourceToken,
//                         walletPublicKey
//                     );
//                     if (!associatedTokenFrom) return
//                     result = await getTokenBalanceWeb3(connection, associatedTokenFrom)
//                 } else {
//                     result = await connection.getBalance(walletPublicKey)
//                 }

//                 if (result != null && !isNaN(result)) {
//                     const balance = {
//                         network: network.name,
//                         token: asset.symbol,
//                         amount: result,
//                         request_time: new Date().toJSON(),
//                         decimals: Number(asset?.decimals),
//                         isNativeCurrency: false
//                     }

//                     balances = [
//                         ...balances,
//                         balance
//                     ]
//                 }
//             }
//             catch (e) {
//                 console.log(e)
//             }
//         }

//         return balances
//     }
// }