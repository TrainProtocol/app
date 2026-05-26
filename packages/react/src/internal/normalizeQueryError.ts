/** Coerce a TanStack Query error to Error | null */
export function normalizeQueryError(error: unknown): Error | null {
    if (error instanceof Error) return error
    if (error) return new Error(String(error))
    return null
}
