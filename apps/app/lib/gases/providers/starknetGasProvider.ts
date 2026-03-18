import { GasProps } from "../../../Models/Balance"
import { Network, getNativeToken, NetworkContractType } from "../../../Models/Network"
import { GasProvider } from "./types"
import { getNetworkRpcUrl } from "../../rpc/resolveNetworkRpcUrl"

export class StarknetGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.type?.name === 'starknet'
    }

    getGas = async ({ network, token, wallet }: GasProps) => {
        const account = wallet?.metadata?.starknetAccount

        if (!account || !network) return

        const rpcUrl = getNetworkRpcUrl(network)
        const contractAddress = network.contracts?.find(c => c.type === NetworkContractType.Train)?.address
        const nativeToken = getNativeToken(network)

        if (!rpcUrl || !contractAddress || !nativeToken) return

        const tokenAddress = token?.contractAddress ?? nativeToken.contractAddress
        if (!tokenAddress) return

        try {
            const { CallData, cairo, byteArray } = await import('starknet')
            const { formatUnits } = await import('viem')


            const emptyByteArray = byteArray.byteArrayFromString('')

            const approveCall = {
                contractAddress: tokenAddress,
                entrypoint: 'approve',
                calldata: CallData.compile({
                    spender: contractAddress,
                    amount: cairo.uint256(1n),
                }),
            }

            // Mock user_lock — values don't need to be real; skip_validate is
            // used internally so no signature verification happens
            const userLockCall = {
                contractAddress: contractAddress,
                entrypoint: 'user_lock',
                calldata: CallData.compile({
                    params: {
                        hashlock: cairo.uint256(1n),
                        amount: cairo.uint256(1n),
                        reward_amount: cairo.uint256(0n),
                        timelock_delta: 150,
                        reward_timelock_delta: 0,
                        quote_expiry: 0,
                        sender: account.address,
                        recipient: account.address,
                        token: tokenAddress,
                        reward_token: emptyByteArray,
                        reward_recipient: emptyByteArray,
                        src_chain: emptyByteArray,
                    },
                    dst: {
                        dst_chain: emptyByteArray,
                        dst_address: emptyByteArray,
                        dst_amount: cairo.uint256(1n),
                        dst_token: emptyByteArray,
                    },
                    user_data: emptyByteArray,
                    solver_data: emptyByteArray,
                }),
            }

            const feeEstimate = await account.estimateInvokeFee([approveCall, userLockCall], { skipValidate: true })

            const suggestedFee = (feeEstimate.overall_fee * 3n) / 2n
            const gas = Number(formatUnits(suggestedFee, nativeToken.decimals))

            return { gas, token: nativeToken }
        } catch (e) {
            console.error('Starknet gas estimation failed:', e)
            return undefined
        }
    }
}
