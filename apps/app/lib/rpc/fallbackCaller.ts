/**
 * Execute an async function against multiple RPC URLs,
 * falling back to the next on failure.
 */
export async function withFallback<T>(
    urls: string[],
    fn: (url: string) => Promise<T>,
): Promise<T> {
    if (!urls.length) throw new Error('No RPC URLs provided')

    let lastError: Error | undefined
    for (const url of urls) {
        try {
            return await fn(url)
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e))
        }
    }
    throw lastError!
}
