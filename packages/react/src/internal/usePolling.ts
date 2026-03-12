import { useState, useEffect, useRef, useCallback } from 'react'

export interface UsePollingOptions<T> {
    /** Polling interval in ms */
    interval: number
    /** Whether polling is enabled */
    enabled: boolean
    /** Stop polling when this returns true */
    shouldStop?: (data: T) => boolean
}

export interface UsePollingResult<T> {
    data: T | null
    error: Error | null
    isLoading: boolean
}

export function usePolling<T>(
    fetcher: () => Promise<T>,
    options: UsePollingOptions<T>,
): UsePollingResult<T> {
    const { interval, enabled, shouldStop } = options
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const stoppedRef = useRef(false)
    const fetchingRef = useRef(false)
    const fetcherRef = useRef(fetcher)
    const shouldStopRef = useRef(shouldStop)

    fetcherRef.current = fetcher
    shouldStopRef.current = shouldStop

    const doFetch = useCallback(async () => {
        if (fetchingRef.current || stoppedRef.current) return
        fetchingRef.current = true
        setIsLoading(true)
        try {
            const result = await fetcherRef.current()
            setData(result)
            setError(null)
            if (shouldStopRef.current?.(result)) {
                stoppedRef.current = true
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            fetchingRef.current = false
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!enabled) {
            stoppedRef.current = false
            return
        }

        stoppedRef.current = false
        doFetch()

        const id = setInterval(() => {
            if (!stoppedRef.current) {
                doFetch()
            }
        }, interval)

        return () => clearInterval(id)
    }, [enabled, interval, doFetch])

    return { data, error, isLoading }
}
