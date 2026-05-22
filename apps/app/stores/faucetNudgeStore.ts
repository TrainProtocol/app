import { useEffect } from "react"
import { create } from "zustand"

export const mintedKey = (caip2Id: string, tokenSymbol: string) =>
    `${caip2Id}:${tokenSymbol.toUpperCase()}`

interface FaucetNudgeState {
    caip2Id: string | undefined
    tokenSymbol: string | undefined
    mintedAt: Record<string, number>
    setSource: (caip2Id: string | undefined, tokenSymbol: string | undefined) => void
    markMinted: (caip2Id: string, tokenSymbol: string) => void
    clear: () => void
}

export const useFaucetNudgeStore = create<FaucetNudgeState>()((set) => ({
    caip2Id: undefined,
    tokenSymbol: undefined,
    mintedAt: {},
    setSource: (caip2Id, tokenSymbol) => set({ caip2Id, tokenSymbol }),
    markMinted: (caip2Id, tokenSymbol) => set(s => ({
        mintedAt: { ...s.mintedAt, [mintedKey(caip2Id, tokenSymbol)]: Date.now() },
    })),
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
