import { useEffect, useRef } from 'react'

export interface UseEventSourceOptions {
    /** Whether the SSE connection is enabled */
    enabled: boolean
    /** Event handlers keyed by event type. Return `'close'` from a handler to close the connection. */
    onEvent: Record<string, (data: unknown) => void | 'close'>
    /** Called on connection error */
    onError?: (error: Event) => void
    /** Max reconnection attempts before giving up (default: 5) */
    maxRetries?: number
}

const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30_000

/**
 * Lightweight SSE hook with auto-cleanup on unmount or dependency change.
 * Reconnects with exponential backoff on network errors.
 */
export function useEventSource(
    url: string | null,
    options: UseEventSourceOptions,
): void {
    const { enabled, onEvent, onError, maxRetries = 5 } = options
    const onEventRef = useRef(onEvent)
    const onErrorRef = useRef(onError)

    onEventRef.current = onEvent
    onErrorRef.current = onError

    useEffect(() => {
        if (!url || !enabled) return

        let es: EventSource | null = null
        let retryCount = 0
        let retryTimer: ReturnType<typeof setTimeout> | null = null
        let closed = false

        function connect() {
            if (closed || !url) return

            es = new EventSource(url)

            for (const eventType of Object.keys(onEventRef.current)) {
                es.addEventListener(eventType, (event: MessageEvent) => {
                    let data: unknown
                    try {
                        data = JSON.parse(event.data)
                    } catch {
                        data = event.data
                    }
                    const result = onEventRef.current[eventType]?.(data)
                    if (result === 'close') {
                        closed = true
                        es?.close()
                    }
                })
            }

            es.onopen = () => {
                retryCount = 0
            }

            es.onerror = (event) => {
                onErrorRef.current?.(event)
                es?.close()

                if (closed || retryCount >= maxRetries) return

                const delay = Math.min(BASE_DELAY_MS * 2 ** retryCount, MAX_DELAY_MS)
                retryCount++
                retryTimer = setTimeout(connect, delay)
            }
        }

        connect()

        return () => {
            closed = true
            es?.close()
            if (retryTimer) clearTimeout(retryTimer)
        }
    }, [url, enabled, maxRetries])
}
