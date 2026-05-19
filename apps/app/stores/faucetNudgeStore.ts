import { useEffect } from "react"
import { create } from "zustand"

interface FaucetNudgeState {
    caip2Id: string | undefined
    tokenSymbol: string | undefined
    setSource: (caip2Id: string | undefined, tokenSymbol: string | undefined) => void
    clear: () => void
}

export const useFaucetNudgeStore = create<FaucetNudgeState>()((set) => ({
    caip2Id: undefined,
    tokenSymbol: undefined,
    setSource: (caip2Id, tokenSymbol) => set({ caip2Id, tokenSymbol }),
    clear: () => set({ caip2Id: undefined, tokenSymbol: undefined }),
}))

export function useSyncFaucetNudgeSource(
    caip2Id: string | undefined,
    tokenSymbol: string | undefined,
) {
    const setSource = useFaucetNudgeStore(s => s.setSource)
    const clear = useFaucetNudgeStore(s => s.clear)
    useEffect(() => {
        setSource(caip2Id, tokenSymbol)
    }, [caip2Id, tokenSymbol, setSource])
    useEffect(() => () => clear(), [clear])
}
