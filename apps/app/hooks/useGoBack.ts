import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { buildHrefWithPersistantParams } from "../helpers/querryHelper"

/**
 * Navigates back, falling back to the home route when there is no history entry.
 *
 * Reads `window.location.search` rather than `useSearchParams` so callers can live
 * above the provider tree's Suspense boundary (see CLAUDE.md on useSearchParams placement).
 */
export const useGoBack = (): () => void => {
    const router = useRouter()
    return useCallback(() => {
        if (window?.['navigation']?.['canGoBack']) {
            router.back()
            return
        }
        const sp = new URLSearchParams(window.location.search)
        router.push(buildHrefWithPersistantParams("/", sp))
    }, [router])
}
