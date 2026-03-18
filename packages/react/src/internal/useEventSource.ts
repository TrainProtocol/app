import { useEffect, useRef, useCallback } from 'react'

export interface UseEventSourceOptions {
    /** Whether the SSE connection is enabled */
    enabled: boolean
    /** Event handlers keyed by event type. Return `'close'` from a handler to close the connection. */
    onEvent: Record<string, (data: unknown) => void | 'close'>
    /** Called on connection error */
    onError?: (error: Event) => void
}

/**
 * Lightweight SSE hook with auto-cleanup on unmount or dependency change.
 */
export function useEventSource(
    url: string | null,
    options: UseEventSourceOptions,
): void {
    const { enabled, onEvent, onError } = options
    const onEventRef = useRef(onEvent)
    const onErrorRef = useRef(onError)

    onEventRef.current = onEvent
    onErrorRef.current = onError

    const connect = useCallback(() => {
        if (!url || !enabled) return undefined

        const es = new EventSource(url)

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
                    es.close()
                }
            })
        }

        es.onerror = (event) => {
            onErrorRef.current?.(event)
        }

        return es
    }, [url, enabled])

    useEffect(() => {
        const es = connect()
        return () => es?.close()
    }, [connect])
}
