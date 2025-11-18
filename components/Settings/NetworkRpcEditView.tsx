import { FC, useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Save, RotateCcw, Loader, Plus, Trash2, Zap } from "lucide-react"
import { Network } from "../../Models/Network"
import { useRpcConfigStore } from "../../stores/rpcConfigStore"
import { validateRpcUrl } from "../../lib/validators/rpcValidator"
import SecondaryButton from "../buttons/secondaryButton"
import SubmitButton from "../buttons/submitButton"
import { toast } from "react-hot-toast"
import LightClient from "../../lib/lightClient"
import Image from 'next/image'

interface NetworkRpcEditViewProps {
    network: Network
    onSave: () => void
}

const NetworkRpcEditView: FC<NetworkRpcEditViewProps> = ({ network, onSave }) => {
    const { rpcConfigs, setCustomRpc, removeCustomRpc } = useRpcConfigStore()
    const [customUrls, setCustomUrls] = useState<string[]>([])
    const [validatingIndex, setValidatingIndex] = useState<number | null>(null)
    const [validationErrors, setValidationErrors] = useState<Record<number, string>>({})
    const [validatedUrls, setValidatedUrls] = useState<Record<number, boolean>>({})

    const hasLightClient = new LightClient().supportsNetwork(network)

    useEffect(() => {
        // Load existing URLs or start with one empty field
        const existingConfig = rpcConfigs[network.name]
        const urls = existingConfig?.customRpcUrls || []
        setCustomUrls(urls.length > 0 ? urls : [""])
        setValidationErrors({})
        setValidatedUrls({})
    }, [network.name, rpcConfigs])

    const validateUrl = async (url: string, index: number) => {
        if (!url) {
            setValidationErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[index]
                return newErrors
            })
            setValidatedUrls(prev => {
                const newValidated = { ...prev }
                delete newValidated[index]
                return newValidated
            })
            return
        }

        setValidatingIndex(index)
        setValidationErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[index]
            return newErrors
        })

        try {
            const validation = await validateRpcUrl(url)
            if (validation.isValid) {
                setValidatedUrls(prev => ({ ...prev, [index]: true }))
            } else {
                setValidationErrors(prev => ({
                    ...prev,
                    [index]: validation.error || "Invalid RPC URL"
                }))
                setValidatedUrls(prev => {
                    const newValidated = { ...prev }
                    delete newValidated[index]
                    return newValidated
                })
            }
        } catch (error) {
            setValidationErrors(prev => ({
                ...prev,
                [index]: "Failed to validate URL"
            }))
            setValidatedUrls(prev => {
                const newValidated = { ...prev }
                delete newValidated[index]
                return newValidated
            })
        } finally {
            setValidatingIndex(null)
        }
    }

    const handleAddUrl = () => {
        setCustomUrls(prev => [...prev, ""])
    }

    const handleRemoveUrl = (index: number) => {
        setCustomUrls(prev => prev.filter((_, i) => i !== index))
        setValidationErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[index]
            return newErrors
        })
        setValidatedUrls(prev => {
            const newValidated = { ...prev }
            delete newValidated[index]
            return newValidated
        })
    }

    const handleUrlChange = (index: number, value: string) => {
        setCustomUrls(prev => {
            const newUrls = [...prev]
            newUrls[index] = value
            return newUrls
        })
        if (value) {
            validateUrl(value, index)
        }
    }

    const handleSave = () => {
        // Filter out empty URLs
        const nonEmptyUrls = customUrls.filter(url => url.trim() !== "")

        if (nonEmptyUrls.length > 0) {
            // Check if all non-empty URLs are validated
            const allValid = nonEmptyUrls.every((_, index) =>
                !customUrls[index] || validatedUrls[index]
            )

            if (!allValid) {
                toast.error("Please fix validation errors before saving")
                return
            }

            setCustomRpc(network.name, {
                customRpcUrls: nonEmptyUrls,
                useCustomRpc: true,
                isValidated: true
            })

            toast.success(`Custom RPC URLs saved for ${network.displayName}`)
        } else {
            removeCustomRpc(network.name)
            toast.success(`Reverted to default RPC for ${network.displayName}`)
        }

        onSave()
    }

    const handleReset = () => {
        removeCustomRpc(network.name)
        setCustomUrls([])
        toast.success(`Reset to default RPC for ${network.displayName}`)
        onSave()
    }

    return (
        <div className="flex flex-col justify-between h-full gap-3">
            <div className="flex flex-col gap-2">
                {/* Network Info */}
                <div className="flex items-center space-x-3">
                    <Image
                        src={network.logo}
                        alt={network.displayName}
                        height="40"
                        width="40"
                        loading="eager"
                        fetchPriority='high'
                        className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <div className="font-semibold text-primary-text">{network.displayName}</div>
                            {hasLightClient && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-blue-900/20 text-blue-400 rounded">
                                    <Zap className="w-3 h-3" />
                                    Light Client
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-secondary-text">Chain ID: {network.chainId}</div>
                    </div>
                </div>

                {/* Default RPC Info */}
                <div className="p-3 bg-secondary-800 rounded-lg">
                    <div className="text-sm font-medium text-secondary-text mb-1">Default RPC URL</div>
                    <div className="text-sm text-primary-text font-mono break-all">{network.rpcUrl}</div>
                </div>
            </div>

            {/* Custom RPC URLs */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-primary-text">
                        Custom RPC URLs
                    </label>
                    <button
                        onClick={handleAddUrl}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-secondary-700 rounded transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Add URL
                    </button>
                </div>

                <p className="text-xs text-secondary-text">
                    URLs are tried in order. First URL is primary, others are fallbacks.
                </p>

                {customUrls.map((url, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex items-start gap-2">
                            <div className="flex items-center justify-center w-6 h-10 text-xs text-secondary-text">
                                {index + 1}
                            </div>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => handleUrlChange(index, e.target.value)}
                                    placeholder="https://your-rpc-endpoint.com"
                                    className={`w-full px-3 py-2 pr-10 bg-secondary-900 border rounded-lg text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 ${validationErrors[index]
                                        ? "border-red-500 focus:ring-red-500"
                                        : validatedUrls[index]
                                            ? "border-green-500 focus:ring-green-500"
                                            : "border-secondary-600 focus:ring-primary"
                                        }`}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-10">
                                    {validatingIndex === index ? (
                                        <Loader className="w-4 h-4 text-secondary-text animate-spin" />
                                    ) : validatedUrls[index] ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : validationErrors[index] ? (
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                    ) : null}
                                </div>
                            </div>
                            {customUrls.length > 1 && (
                                <button
                                    onClick={() => handleRemoveUrl(index)}
                                    className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-secondary-700 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {validationErrors[index] && (
                            <p className="text-xs text-red-500 flex items-center gap-1 ml-8">
                                <AlertCircle className="w-3 h-3" />
                                {validationErrors[index]}
                            </p>
                        )}
                        {validatedUrls[index] && url && (
                            <p className="text-xs text-green-500 flex items-center gap-1 ml-8">
                                <CheckCircle className="w-3 h-3" />
                                Valid RPC URL
                            </p>
                        )}
                    </div>
                ))}

                {rpcConfigs[network.name]?.useCustomRpc && (
                    <SecondaryButton
                        onClick={handleReset}
                        className="flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Default
                    </SecondaryButton>
                )}
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2">
                <SubmitButton
                    onClick={handleSave}
                    isDisabled={
                        // Disable if all URLs are blank
                        customUrls.every(url => url.trim() === "") ||
                        // Disable if any non-empty URL is not validated
                        customUrls.some((url, i) => url.trim() !== "" && !validatedUrls[i]) ||
                        // Disable if any URL has validation errors
                        Object.keys(validationErrors).length > 0 ||
                        // Disable if currently validating
                        validatingIndex !== null
                    }
                    className="flex items-center gap-2"
                    icon={<Save className="w-4 h-4" />}
                >
                    Save
                </SubmitButton>
            </div>
        </div>
    )
}

export default NetworkRpcEditView
