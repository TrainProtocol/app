import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, startTransition } from "react"
import { buildHrefWithPersistantParams } from "../helpers/querryHelper"

export const useGoHome = (): () => void => {
    const router = useRouter()
    const searchParams = useSearchParams()
    return useCallback(() => {
        const href = buildHrefWithPersistantParams("/", searchParams)
        startTransition(() => router.push(href))
    }, [router, searchParams])
}