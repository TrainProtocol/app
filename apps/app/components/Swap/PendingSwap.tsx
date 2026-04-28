import { useEffect, useState } from "react";
import { useSwapStore } from "../../stores/swapStore";
import { useSwap } from "@train-protocol/react";
import { useSettingsState } from "../../context/settings";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper";
import { buildSwapQuery } from "@/helpers/swapUrl";

export default function PendingSwap() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const swapModalOpen = useSwapStore(s => s.swapModalOpen)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const activeSwap = useSwap(activeHashlock)
    const settings = useSettingsState()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()

    if (!mounted || !activeHashlock || !activeSwap || swapModalOpen || !settings) return null

    const { networks } = settings
    const source_network = networks.find(n => n.caip2Id.toUpperCase() === activeSwap.source?.toUpperCase())
    const destination_network = networks.find(n => n.caip2Id.toUpperCase() === activeSwap.destination?.toUpperCase())

    const handleClick = () => {
        if (pathname === "/") {
            setSwapModalOpen(true)
            return
        }
        if (activeSwap.source && activeSwap.txId) {
            router.push(buildHrefWithPersistantParams('/swap', searchParams, buildSwapQuery(activeSwap.source, activeSwap.txId)))
        }
    }

    return (
        <AnimatePresence mode='wait'>
            <motion.div
                key="pendingSwap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <div
                    onClick={handleClick}
                    className="cursor-pointer relative bg-secondary-700 border border-border rounded-xl hover:bg-secondary-500 transition-colors">
                    <div className="flex items-center">
                        <div className="text-primary-text flex px-3 p-2 items-center space-x-2">
                            <div className="shrink-0 h-5 w-5 relative">
                                {source_network ?
                                    <ImageWithFallback
                                        src={source_network.logoUrl ?? ''}
                                        alt="From Logo"
                                        height="20"
                                        width="20"
                                        className="rounded-md object-contain"
                                    /> : null
                                }
                            </div>
                            <ChevronRight className="block h-4 w-4 mx-1" />
                            <div className="shrink-0 h-5 w-5 relative block">
                                {destination_network ?
                                    <ImageWithFallback
                                        src={destination_network.logoUrl ?? ''}
                                        alt="To Logo"
                                        height="20"
                                        width="20"
                                        className="rounded-md object-contain"
                                    /> : null
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
