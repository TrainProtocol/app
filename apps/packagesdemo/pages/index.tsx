import { WagmiProvider, createConfig, http } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TrainProvider } from '@train-protocol/react'
import { EvmWalletBridge } from '../components/EvmWalletBridge'
import { SwapForm } from '../components/SwapForm'

const queryClient = new QueryClient()

const API_URL = process.env.NEXT_PUBLIC_TRAIN_API ?? 'https://train-solver-station.dev.lb.layerswap.cloud'

const wagmiConfig = createConfig({
    connectors: [injected()],
    chains: [sepolia, mainnet],
    transports: {
        [sepolia.id]: http(),
        [mainnet.id]: http(),
    },
    ssr: true,
})

export default function Home() {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <TrainProvider
                    baseUrl={API_URL}
                    queryClient={queryClient}
                    secretDerivation={{ persist: true }}
                >
                    <EvmWalletBridge />
                    <SwapForm />
                </TrainProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}
