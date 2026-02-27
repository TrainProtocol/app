/**
 * Returns a group header label for a date:
 * "Today", "Yesterday", "3 days ago", or a formatted date string for older dates.
 */
export function getDaysAgoLabel(dateMs: number): string {
    const today = new Date()
    const input = new Date(dateMs)

    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const inputMidnight = new Date(input.getFullYear(), input.getMonth(), input.getDate())

    const dayDiff = Math.round((todayMidnight.getTime() - inputMidnight.getTime()) / (1000 * 60 * 60 * 24))

    if (dayDiff === 0) return 'Today'
    if (dayDiff === 1) return 'Yesterday'
    if (dayDiff <= 6) return `${dayDiff} days ago`

    return input.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Returns a relative time string in parentheses, e.g. "(1 day ago)", "(2 months, 5 days ago)".
 * Returns empty string if the date is today.
 */
export function getDateDifferenceString(dateMs: number): string {
    const from = new Date(dateMs)
    const to = new Date()

    let years = to.getFullYear() - from.getFullYear()
    let months = to.getMonth() - from.getMonth()
    let days = to.getDate() - from.getDate()

    if (days < 0) {
        months--
        const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0)
        days += prevMonth.getDate()
    }
    if (months < 0) {
        years--
        months += 12
    }

    const parts: string[] = []
    if (years > 0) {
        const totalDays = days + months * 30
        parts.push(`${years} year${years !== 1 ? 's' : ''}`)
        if (totalDays > 0) parts.push(`${totalDays} day${totalDays !== 1 ? 's' : ''}`)
    } else if (months > 0) {
        parts.push(`${months} month${months !== 1 ? 's' : ''}`)
        if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`)
    } else if (days > 0) {
        parts.push(`${days} day${days !== 1 ? 's' : ''}`)
    }

    return parts.length > 0 ? `(${parts.join(', ')} ago)` : ''
}
