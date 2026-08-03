import { useCallback, useEffect, useState } from "react"
import { useInterval } from "./useInterval"

const twoDigits = (num: number) => String(num).padStart(2, '0')

/** Format a remaining-seconds count as [hh:]mm:ss. */
export function formatCountdown(secondsRemaining: number | undefined): string {
    const secondsToDisplay = Number(secondsRemaining?.toFixed()) % 60
    const minutesRemaining = (Number(secondsRemaining) - secondsToDisplay) / 60
    const minutesToDisplay = Number(minutesRemaining.toFixed()) % 60
    const hoursToDisplay = Number(((minutesRemaining - minutesToDisplay) / 60).toFixed())

    return `${hoursToDisplay > 0 ? `${twoDigits(hoursToDisplay)}:` : ''}${twoDigits(minutesToDisplay)}:${twoDigits(secondsToDisplay)}`
}

/**
 * Ticks down to a unix-seconds timelock, one interval per hook call.
 * `started` is false before the timelock arrives and once the count reaches zero.
 */
export function useCountdown(timelock: number) {
    const [secondsRemaining, setSecondsRemaining] = useState<number>()
    const [started, setStarted] = useState(false)

    useEffect(() => {
        if (timelock) {
            setSecondsRemaining(Number(timelock) - (Date.now() / 1000))
            setStarted(true)
        }
    }, [timelock])

    const callback = useCallback(() => {
        if (Number(secondsRemaining) > 0) {
            if (secondsRemaining == 1) {
                setStarted(false)
            }
            setSecondsRemaining(Number(secondsRemaining) - 1)
        }
    }, [secondsRemaining])

    useInterval(
        callback,
        started ? 1000 : null,
    )

    return { secondsRemaining, started }
}
