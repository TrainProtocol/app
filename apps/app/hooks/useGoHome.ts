import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { buildHrefWithPersistantParams } from "../helpers/querryHelper"

export const useGoHome = (): () => void => {
    const router = useRouter()
    const searchParams = useSearchParams()
    return useCallback(() => {
        router.push(buildHrefWithPersistantParams("/", searchParams))
    }, [router, searchParams])
}