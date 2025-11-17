import { FC, useState } from "react"
import { Settings2, CheckCircle, AlertCircle, Save, RotateCcw, Loader, X, Globe } from "lucide-react"
import { useSettingsState } from "../../context/settings"
import { NetworkType, Network } from "../../Models/Network"
import { useRpcConfigStore } from "../../stores/rpcConfigStore"
import { validateRpcUrl } from "../../lib/validators/rpcValidator"
import SecondaryButton from "../buttons/secondaryButton"
import SubmitButton from "../buttons/submitButton"
import { toast } from "react-hot-toast"

const RpcConfigurationView: FC = () => {
    const settings = useSettingsState()
    const { rpcConfigs, isUsingCustomRpc, setCustomRpc, removeCustomRpc, getEffectiveRpcUrl } = useRpcConfigStore()
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
    const [customUrl, setCustomUrl] = useState("")
    const [isValidating, setIsValidating] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [isValid, setIsValid] = useState(false)
    const [selectedTab, setSelectedTab] = useState<NetworkType | 'all'>('all')

    // Filter for all networks with RPC URLs
    const networksWithRpc = settings?.networks?.filter(
        network => network.rpcUrl && network.rpcUrl !== ""
    ) || []

    // Group networks by type
    const networksByType = networksWithRpc.reduce((acc, network) => {
        const type = network.type
        if (!acc[type]) acc[type] = []
        acc[type].push(network)
        return acc
    }, {} as Record<NetworkType, Network[]>)

    // Get filtered networks based on selected tab
    const filteredNetworks = selectedTab === 'all'
        ? networksWithRpc
        : networksByType[selectedTab as NetworkType] || []

    const handleNetworkSelect = (network: Network) => {
        const existingConfig = rpcConfigs[network.name]
        setSelectedNetwork(network)
        setCustomUrl(existingConfig?.customRpcUrl || "")
        setValidationError(null)
        setIsValid(false)
    }

    const handleClose = () => {
        setSelectedNetwork(null)
        setCustomUrl("")
        setValidationError(null)
        setIsValid(false)
    }

    const validateUrl = async (url: string) => {
        if (!url) {
            setValidationError(null)
            setIsValid(false)
            return
        }

        setIsValidating(true)
        setValidationError(null)

        try {
            const validation = await validateRpcUrl(url)
            if (validation.isValid) {
                setIsValid(true)
                setValidationError(null)
            } else {
                setIsValid(false)
                setValidationError(validation.error || "Invalid RPC URL")
            }
        } catch (error) {
            setIsValid(false)
            setValidationError("Failed to validate URL")
        } finally {
            setIsValidating(false)
        }
    }

    const handleSave = () => {
        if (!selectedNetwork) return

        if (customUrl) {
            if (!isValid) {
                setValidationError("Please enter a valid RPC URL")
                return
            }

            setCustomRpc(selectedNetwork.name, {
                customRpcUrl: customUrl,
                useCustomRpc: true,
                isValidated: true
            })

            toast.success(`Custom RPC saved for ${selectedNetwork.displayName}`)
        } else {
            removeCustomRpc(selectedNetwork.name)
            toast.success(`Reverted to default RPC for ${selectedNetwork.displayName}`)
        }

        handleClose()
    }

    const handleReset = () => {
        if (!selectedNetwork) return
        removeCustomRpc(selectedNetwork.name)
        setCustomUrl("")
        toast.success(`Reset to default RPC for ${selectedNetwork.displayName}`)
        handleClose()
    }

    const getNetworkTypeLabel = (type: NetworkType): string => {
        const labels: Record<NetworkType, string> = {
            [NetworkType.EVM]: 'EVM',
            [NetworkType.Starknet]: 'StarkNet',
            [NetworkType.Solana]: 'Solana',
            [NetworkType.Cosmos]: 'Cosmos',
            [NetworkType.TON]: 'TON',
            [NetworkType.Fuel]: 'Fuel',
            [NetworkType.StarkEx]: 'StarkEx',
            [NetworkType.ZkSyncLite]: 'zkSync Lite',
        }
        return labels[type] || type
    }

    return (
        <div className="h-full">
            {!selectedNetwork ? (
                <>
                    <p className="text-sm text-secondary-text mb-4">
                        Configure custom RPC URLs for each network to use your own nodes
                    </p>

                    {/* Network Type Tabs */}
                    {Object.keys(networksByType).length > 1 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => setSelectedTab('all')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedTab === 'all'
                                    ? 'bg-accent text-primary-text'
                                    : 'bg-secondary-700 hover:bg-secondary-600 text-primary-text'
                                    }`}
                            >
                                All ({networksWithRpc.length})
                            </button>
                            {Object.entries(networksByType).map(([type, networks]) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedTab(type as NetworkType)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedTab === type
                                        ? 'bg-accent text-primary-text'
                                        : 'bg-secondary-700 hover:bg-secondary-600 text-primary-text'
                                        }`}
                                >
                                    {getNetworkTypeLabel(type as NetworkType)} ({networks.length})
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredNetworks.length === 0 ? (
                            <div className="text-center py-8 text-secondary-text">
                                No networks with RPC support available
                            </div>
                        ) : (
                            filteredNetworks.map((network) => {
                                const isCustom = isUsingCustomRpc(network.name)
                                const config = rpcConfigs[network.name]

                                return (
                                    <button
                                        key={network.name}
                                        onClick={() => handleNetworkSelect(network)}
                                        className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary-700 hover:bg-secondary-600 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <img
                                                src={network.logo}
                                                alt={network.displayName}
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <div className="flex flex-col text-left">
                                                <span className="font-medium text-primary-text">
                                                    {network.displayName}
                                                </span>
                                                <span className="text-xs text-secondary-text">
                                                    <span className="flex items-center gap-1">
                                                        <span>{isCustom ? 'Custom:' : 'Default:'}</span> <span className="truncate max-w-[200px]">{config?.customRpcUrl || network.rpcUrl}</span>
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {isCustom && (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-900/20 text-green-400 rounded">
                                                    Custom
                                                </span>
                                            )}
                                            <Settings2 className="w-4 h-4 text-secondary-text" />
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-2">
                        {/* Network Info */}
                        <div className="flex items-center space-x-3">
                            <img
                                src={selectedNetwork.logo}
                                alt={selectedNetwork.displayName}
                                className="w-10 h-10 rounded-full"
                            />
                            <div>
                                <div className="font-semibold text-primary-text">{selectedNetwork.displayName}</div>
                                <div className="text-xs text-secondary-text">Chain ID: {selectedNetwork.chainId}</div>
                            </div>
                        </div>

                        {/* Default RPC Info */}
                        <div className="p-3 bg-secondary-800 rounded-lg">
                            <div className="text-sm font-medium text-secondary-text mb-1">Default RPC URL</div>
                            <div className="text-sm text-primary-text font-mono break-all">{selectedNetwork.rpcUrl}</div>
                        </div>
                    </div>

                    {/* Custom RPC Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-text">
                            Custom RPC URL (leave empty to use default)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={customUrl}
                                onChange={(e) => {
                                    setCustomUrl(e.target.value)
                                    if (e.target.value) {
                                        validateUrl(e.target.value)
                                    } else {
                                        setValidationError(null)
                                        setIsValid(false)
                                    }
                                }}
                                placeholder="https://your-rpc-endpoint.com"
                                className={`w-full px-3 py-2 pr-10 bg-secondary-900 border rounded-lg text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 ${validationError
                                    ? "border-red-500 focus:ring-red-500"
                                    : isValid && customUrl
                                        ? "border-green-500 focus:ring-green-500"
                                        : "border-secondary-600 focus:ring-primary"
                                    }`}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                {isValidating ? (
                                    <Loader className="w-4 h-4 text-secondary-text animate-spin" />
                                ) : isValid && customUrl ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : validationError ? (
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                ) : null}
                            </div>
                        </div>
                        {validationError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {validationError}
                            </p>
                        )}
                        {isValid && customUrl && (
                            <p className="text-xs text-green-500 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Valid RPC URL
                            </p>
                        )}
                        {rpcConfigs[selectedNetwork.name]?.useCustomRpc && (
                            <div className="flex justify-end">
                                <SecondaryButton
                                    onClick={handleReset}
                                    className="flex items-center gap-2 w-fit"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset
                                </SecondaryButton>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex-1" />
                        <SubmitButton
                            onClick={handleSave}
                            isDisabled={customUrl ? (!isValid || isValidating) : false}
                            icon={<Save className="w-4 h-4" />}
                        >
                            Save
                        </SubmitButton>
                        <SecondaryButton
                            size="xl"
                            onClick={handleClose}
                        >
                            <p className="text-base">
                                Cancel
                            </p>
                        </SecondaryButton>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RpcConfigurationView