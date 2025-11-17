export const calculateEpochTimelock = (minutes: number) => {
    const LOCK_TIME = 1000 * 60 * minutes; // Convert minutes to milliseconds
    const timeLockMS = Date.now() + LOCK_TIME
    const timelock = Math.floor(timeLockMS / 1000)
    
    return timelock;
}