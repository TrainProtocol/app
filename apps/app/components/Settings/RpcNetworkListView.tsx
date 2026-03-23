import { FC, useState } from "react"
import { Settings2, Search, Zap } from "lucide-react"
import { useSettingsState } from "../../context/settings"
import { Network } from "../../Models/Network"
import { useRpcConfigStore } from "../../stores/rpcConfigStore"
import { supportsLightClient } from "../../lib/lightClient/supportsNetwork"
import Image from 'next/image'

interface RpcNetworkListViewProps {
    onNetworkSelect: (network: Network) => void
}

const RpcNetworkListView: FC<RpcNetworkListViewProps> = ({ onNetworkSelect }) => {
    const settings = useSettingsState()
    const { rpcConfigs, isUsingCustomRpc } = useRpcConfigStore()
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Filter for all networks with RPC URLs
    const networksWithRpc = settings?.networks?.filter(
        network => network.nodes?.[0]?.url && network.nodes[0].url !== ""
    ) || []

    // Get filtered networks based on search query
    const filteredNetworks = networksWithRpc.filter(network => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            network.displayName.toLowerCase().includes(query) ||
            network.caip2Id.toLowerCase().includes(query) ||
            network.type?.name?.toLowerCase().includes(query)
        )
    })

    return (
        <div className="h-full">
            <p className="text-sm text-secondary-text mb-4">
                Configure custom RPC URLs for each network to use your own nodes
            </p>

            {/* Search Input */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-text" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search networks..."
                    className="w-full pl-10 pr-4 py-2 bg-secondary-500 border border-secondary-500 rounded-lg text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                />
            </div>

            <div className="space-y-2 overflow-y-auto">
                {filteredNetworks.length === 0 ? (
                    <div className="text-center py-8 text-secondary-text">
                        {searchQuery ? 'No networks found matching your search' : 'No networks with RPC support available'}
                    </div>
                ) : (
                    filteredNetworks.map((network) => {
                        const isCustom = isUsingCustomRpc(network.caip2Id)
                        const config = rpcConfigs[network.caip2Id]

                        return (
                            <button
                                key={network.caip2Id}
                                onClick={() => onNetworkSelect(network)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary-500 hover:bg-secondary-400 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <Image
                                        src={network.logoUrl ?? ''}
                                        alt={network.displayName}
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        fetchPriority='high'
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div className="flex flex-col text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-primary-text">
                                                {network.displayName}
                                            </span>
                                            {supportsLightClient(network) && (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-blue-900/20 text-blue-400 rounded">
                                                    <Zap className="w-3 h-3" />
                                                    Light Client
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-secondary-text">
                                            <span className="flex items-center gap-1">
                                                <span>{isCustom ? `Custom (${config?.customRpcUrls?.length || 1}):` : 'Default:'}</span>
                                                <span className="truncate max-w-[200px]">
                                                    {isCustom
                                                        ? (config?.customRpcUrls?.[0] || config?.customRpcUrl || '')
                                                        : network.nodes?.[0]?.url
                                                    }
                                                </span>
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
        </div>
    )
}

export default RpcNetworkListView
