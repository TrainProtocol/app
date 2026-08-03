import { useEffect, useRef } from "react"

export function useInterval(callback, delay) {
    const savedCallback = useRef<any>(undefined)

    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(() => {
        function tick() {
            typeof savedCallback.current === "function" && savedCallback.current()
        }
        if (delay !== null) {
            let id = setInterval(tick, delay)
            return () => clearInterval(id)
        }
    }, [delay])
}
