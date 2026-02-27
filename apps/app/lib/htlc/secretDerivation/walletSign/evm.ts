// Compatibility shim — wraps @train-protocol/sdk deriveKeyFromEvmSignature with the old wagmi Config API
import { getAccount } from '@wagmi/core'
import { Config } from 'wagmi'
import {
    deriveKeyFromEvmSignature as sdkDeriveKey,
    getEvmTypedData as sdkGetEvmTypedData,
} from '@train-protocol/sdk'

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

    return sdkDeriveKey(provider, address, {
        sandbox: isSandbox,
        currentChainId: account.chainId,
    })
}
