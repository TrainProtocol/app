import { QueryParams } from "../Models/QueryParams";

type ReadableSearchParams = { get: (key: string) => string | null }

export const getPersistantSearchParams = (searchParams: ReadableSearchParams | null | undefined): Record<string, string> => {
    if (!searchParams) return {}
    const persistantParams = new QueryParams()
    const res: Record<string, string> = {}
    Object.keys(persistantParams).forEach(key => {
        const value = searchParams.get(key)
        if (value !== null && value !== undefined) {
            res[key] = value
        }
    })
    return res
}

export const buildHrefWithPersistantParams = (
    pathname: string,
    searchParams: ReadableSearchParams | null | undefined,
    extraParams?: Record<string, string | undefined>
): string => {
    const params = new URLSearchParams(getPersistantSearchParams(searchParams))
    if (extraParams) {
        for (const [key, value] of Object.entries(extraParams)) {
            if (value !== undefined) params.set(key, value)
        }
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
}