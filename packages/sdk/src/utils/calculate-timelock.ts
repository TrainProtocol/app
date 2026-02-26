export const calculateEpochTimelock = (minutes: number): number => {
    const LOCK_TIME = 1000 * 60 * minutes
    const timeLockMS = Date.now() + LOCK_TIME
    return Math.floor(timeLockMS / 1000)
}
