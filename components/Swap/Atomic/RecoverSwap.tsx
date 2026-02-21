import { useState } from 'react'
import { Network } from '../../../Models/Network'
import { useSettingsState } from '../../../context/settings'
import useRecoverSwap from '../../../hooks/htlc/useRecoverSwap'
import SubmitButton from '../../buttons/submitButton'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { useSwapStore } from '@/stores/swapStore'

interface RecoverSwapProps {
    onRecovered: (hashlock: string) => void
}

export default function RecoverSwap({ onRecovered }: RecoverSwapProps) {
    const { networks } = useSettingsState()
    const [txHash, setTxHash] = useState('')
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
    const [showNetworkList, setShowNetworkList] = useState(false)
    const { recover, loading, error, setError } = useRecoverSwap(selectedNetwork)
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)

    const evmNetworks = networks.filter(n => n.type?.name === 'eip155')

    const isValidTxHash = /^0x[a-fA-F0-9]{64}$/.test(txHash)
    const canRecover = isValidTxHash && selectedNetwork && !loading

    const handleRecover = async () => {
        if (!canRecover) return
        setError(null)
        try {
            const hashlock = await recover(txHash)
            setActiveHashlock(hashlock)
            onRecovered(hashlock)
        } catch {
            // error is already set in the hook
        }
    }

    return (
        <div className="flex flex-col w-full space-y-3">
            <div className="flex flex-col space-y-2">
                <label className="text-sm text-secondary-text">Source network</label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowNetworkList(!showNetworkList)}
                        className="w-full flex items-center justify-between bg-secondary-700 rounded-lg px-3 py-2.5 text-primary-text hover:bg-secondary-600 transition"
                    >
                        {selectedNetwork ? (
                            <div className="flex items-center space-x-2">
                                {selectedNetwork.logo && (
                                    <Image
                                        src={selectedNetwork.logo}
                                        alt={selectedNetwork.displayName}
                                        width={20}
                                        height={20}
                                        className="rounded-md"
                                    />
                                )}
                                <span>{selectedNetwork.displayName}</span>
                            </div>
                        ) : (
                            <span className="text-secondary-text">Select network</span>
                        )}
                        <ChevronDown className="h-4 w-4 text-secondary-text" />
                    </button>
                    {showNetworkList && (
                        <div className="absolute z-20 mt-1 w-full bg-secondary-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {evmNetworks.map(network => (
                                <button
                                    key={network.chainId}
                                    type="button"
                                    onClick={() => {
                                        setSelectedNetwork(network)
                                        setShowNetworkList(false)
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-secondary-500 transition text-left text-primary-text"
                                >
                                    {network.logo && (
                                        <Image
                                            src={network.logo}
                                            alt={network.displayName}
                                            width={20}
                                            height={20}
                                            className="rounded-md"
                                        />
                                    )}
                                    <span>{network.displayName}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col space-y-2">
                <label className="text-sm text-secondary-text">Transaction hash</label>
                <input
                    type="text"
                    value={txHash}
                    onChange={e => setTxHash(e.target.value.trim())}
                    placeholder="0x..."
                    className="w-full bg-secondary-700 rounded-lg px-3 py-2.5 text-primary-text placeholder:text-secondary-text border-0 focus:ring-primary focus:outline-none"
                />
            </div>

            {error && (
                <p className="text-sm text-error-foreground">{error}</p>
            )}

            <SubmitButton
                type="button"
                isDisabled={!canRecover}
                isSubmitting={loading}
                onClick={handleRecover}
                size="medium"
            >
                Recover Swap
            </SubmitButton>
        </div>
    )
}
