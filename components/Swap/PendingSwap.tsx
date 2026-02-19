import { useSwapStore } from "../../stores/swapStore";
import { useSettingsState } from "../../context/settings";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

export default function PendingSwap() {
    const swapModalOpen = useSwapStore(s => s.swapModalOpen)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const activeSwap = useSwapStore(s => activeHashlock ? s.swaps[activeHashlock] : null)
    const { networks } = useSettingsState()

    if (!activeHashlock || !activeSwap || swapModalOpen) return null

    const source_network = networks.find(n => n.slug.toUpperCase() === activeSwap.source?.toUpperCase())
    const destination_network = networks.find(n => n.slug.toUpperCase() === activeSwap.destination?.toUpperCase())

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
                    onClick={() => setSwapModalOpen(true)}
                    className="cursor-pointer relative bg-secondary-600 rounded-full hover:bg-secondary-400 transition-colors">
                    <div className="flex items-center">
                        <div className="text-primary-text flex px-3 p-2 items-center space-x-2">
                            <div className="shrink-0 h-5 w-5 relative">
                                {source_network ?
                                    <Image
                                        src={source_network.logo ?? ''}
                                        alt="From Logo"
                                        height="60"
                                        width="60"
                                        className="rounded-md object-contain"
                                    /> : null
                                }
                            </div>
                            <ChevronRight className="block h-4 w-4 mx-1" />
                            <div className="shrink-0 h-5 w-5 relative block">
                                {destination_network ?
                                    <Image
                                        src={destination_network.logo ?? ''}
                                        alt="To Logo"
                                        height="60"
                                        width="60"
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
