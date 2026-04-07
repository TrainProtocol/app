import { useState } from 'react'
import { Input } from '@/components/shadcn/input'
import { Network } from '@/Models/Network'
import { useSettingsState } from '@/context/settings'
import { useRecoverSwap } from '@train-protocol/react'
import SubmitButton from '@/components/buttons/submitButton'
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
    const { recover, error, isRecovering } = useRecoverSwap()
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const canRecover = !!selectedNetwork && txHash.length > 0 && !isRecovering

    const handleRecover = async () => {
        if (!canRecover) return
        const hashlock = await recover(txHash, selectedNetwork.caip2Id)
        setActiveHashlock(hashlock)
        onRecovered(hashlock)
    }

    return (
        <div className="flex flex-col w-full space-y-3">
            <div className="flex flex-col space-y-2">
                <label className="text-sm text-secondary-text">Source network</label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowNetworkList(!showNetworkList)}
                        className="w-full flex items-center justify-between bg-secondary-500 rounded-lg px-3 py-2.5 text-primary-text hover:bg-secondary-400 transition"
                    >
                        {selectedNetwork ? (
                            <div className="flex items-center space-x-2">
                                {selectedNetwork.logoUrl && (
                                    <Image
                                        src={selectedNetwork.logoUrl}
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
                        <div className="absolute z-20 mt-1 w-full bg-secondary-400 rounded-lg shadow-lg max-h-64 overflow-y-auto styled-scroll">
                            {networks.map(network => (
                                <button
                                    key={network.caip2Id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedNetwork(network)
                                        setShowNetworkList(false)
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-secondary-500 transition text-left text-primary-text"
                                >
                                    {network.logoUrl && (
                                        <Image
                                            src={network.logoUrl}
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
                <Input
                    type="text"
                    value={txHash}
                    onChange={e => setTxHash(e.target.value.trim())}
                    placeholder="0x..."
                    className="rounded-lg py-2.5"
                />
            </div>

            {error && (
                <p className="text-sm text-error-foreground">{error.message}</p>
            )}

            <SubmitButton
                type="button"
                isDisabled={!canRecover}
                isSubmitting={isRecovering}
                onClick={handleRecover}
                size="medium"
            >
                Recover Swap
            </SubmitButton>
        </div>
    )
}
