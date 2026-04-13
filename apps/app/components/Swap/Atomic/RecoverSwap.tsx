import { useState } from 'react'
import { Input } from '@/components/shadcn/input'
import { Network } from '@/Models/Network'
import { useSettingsState } from '@/context/settings'
import { useRecoverSwap } from '@train-protocol/react'
import SubmitButton from '@/components/buttons/submitButton'
import Image from 'next/image'
import { useSwapStore } from '@/stores/swapStore'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/shadcn/select'

interface RecoverSwapProps {
    onRecovered: (sourceNetwork: string, txHash: string) => void
}

export default function RecoverSwap({ onRecovered }: RecoverSwapProps) {
    const { networks } = useSettingsState()
    const [txHash, setTxHash] = useState('')
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
    const { recover, error, isRecovering } = useRecoverSwap()
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const canRecover = !!selectedNetwork && txHash.length > 0 && !isRecovering

    const handleRecover = async () => {
        if (!canRecover) return
        try {
            const hashlock = await recover(txHash, selectedNetwork.caip2Id)
            setActiveHashlock(hashlock)
            onRecovered(selectedNetwork.caip2Id, txHash)
        } catch {
            // error managed by hook
        }
    }

    return (
        <div className="flex flex-col w-full space-y-3">
            <div className="flex flex-col space-y-2">
                <label className="text-sm text-secondary-text">Source network</label>
                <Select
                    size="lg"
                    value={selectedNetwork?.caip2Id ?? ''}
                    onValueChange={(value) => {
                        const network = networks.find(n => n.caip2Id === value) ?? null
                        setSelectedNetwork(network)
                    }}
                >
                    <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent className='rounded-xl'>
                        {networks.map(network => (
                            <SelectItem key={network.caip2Id} value={network.caip2Id} className='rounded-xl'>
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
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col space-y-2">
                <label className="text-sm text-secondary-text">Transaction hash</label>
                <Input
                    type="text"
                    value={txHash}
                    onChange={e => setTxHash(e.target.value.trim())}
                    placeholder="0x..."
                    className="rounded-xl py-2.5"
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
