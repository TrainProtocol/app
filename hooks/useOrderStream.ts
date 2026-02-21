import { useEffect, useRef } from 'react'
import { fetchEventSource, EventStreamContentType } from '@microsoft/fetch-event-source'
import { HTLCFromApi } from '../lib/trainApiClient'
import AppSettings from '../lib/AppSettings'

const MAX_RETRIES = 8
const INITIAL_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

type UseOrderStreamParams = {
    solverId: string | undefined
    hashlock: string | undefined
    enabled: boolean
    onOrder: (order: HTLCFromApi) => void
}

export default function useOrderStream({ solverId, hashlock, enabled, onOrder }: UseOrderStreamParams) {
    const onOrderRef = useRef(onOrder)
    onOrderRef.current = onOrder

    useEffect(() => {
        if (!solverId || !hashlock || !enabled) return

        const ctrl = new AbortController()
        let retryCount = 0

        const url = `${AppSettings.TrainApiUri}/api/v1/orders/${solverId}/${hashlock}/stream`

        fetchEventSource(url, {
            signal: ctrl.signal,

            async onopen(response) {
                if (response.ok && response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
                    retryCount = 0
                    return
                }
                // Non-retryable server error — stop
                throw new Error(`SSE open failed: ${response.status} ${response.statusText}`)
            },

            onmessage(ev) {
                if (ev.event === 'done') {
                    ctrl.abort()
                    return
                }

                if (ev.event === 'order' || ev.event === 'order_event') {
                    try {
                        const response = JSON.parse(ev.data)
                        const order: HTLCFromApi = response.order ?? response
                        if (order) onOrderRef.current(order)
                    } catch { /* malformed JSON — skip */ }
                }
            },

            onerror(err) {
                if (ctrl.signal.aborted) throw err

                retryCount++
                if (retryCount > MAX_RETRIES) {
                    console.warn('[useOrderStream] Max retries reached, stopping SSE')
                    throw err // stops reconnection
                }

                const delay = Math.min(INITIAL_RETRY_MS * 2 ** (retryCount - 1), MAX_RETRY_MS)
                console.log(`[useOrderStream] Reconnecting in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`)
                return delay
            },

            openWhenHidden: false, // pause when tab is hidden, resume on focus
        })

        return () => ctrl.abort()
    }, [solverId, hashlock, enabled])
}
