// Compatibility shim — wraps SDK wallet sign registry with the Wagmi Config API
import { getAccount } from '@wagmi/core'
import { Config } from 'wagmi'
import { deriveKeyFromWallet } from '@train-protocol/sdk'
import { getEvmTypedData as sdkGetEvmTypedData } from '@train-protocol/sdk-evm'

const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'

export const getEvmTypedData = () => sdkGetEvmTypedData(isSandbox)

export const deriveKeyFromEvmSignature = async (
    config: Config,
    address: `0x${string}`
): Promise<Buffer> => {
    const account = getAccount(config)
    if (!account.connector) throw new Error('No wallet connector found')

    const provider = await account.connector.getProvider() as {
        request: (args: { method: string; params: unknown[] }) => Promise<unknown>
    }

    return deriveKeyFromWallet('eip155', {
        provider,
        address,
        options: { sandbox: isSandbox, currentChainId: account.chainId },
    })
}
