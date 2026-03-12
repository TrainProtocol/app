import { useEffect, useRef, useCallback } from 'react'

export interface UseEventSourceOptions {
    /** Whether the SSE connection is enabled */
    enabled: boolean
    /** Event handlers keyed by event type */
    onEvent: Record<string, (data: unknown) => void>
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
                try {
                    const parsed = JSON.parse(event.data)
                    onEventRef.current[eventType]?.(parsed)
                } catch {
                    onEventRef.current[eventType]?.(event.data)
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
