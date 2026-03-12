import { useState, useEffect } from 'react'

/**
 * Sets a timer that fires when the timelock expires.
 * @param timelockSeconds Unix timestamp in seconds, or undefined if not yet known
 * @returns Whether the timelock has expired
 */
export function useTimelockExpiry(timelockSeconds: number | undefined): boolean {
    const [expired, setExpired] = useState(false)

    useEffect(() => {
        if (timelockSeconds == null) {
            setExpired(false)
            return
        }

        const expiryMs = timelockSeconds * 1000
        const remaining = expiryMs - Date.now()

        if (remaining <= 0) {
            setExpired(true)
            return
        }

        setExpired(false)
        const timer = setTimeout(() => setExpired(true), remaining)
        return () => clearTimeout(timer)
    }, [timelockSeconds])

    return expired
}
