// Europe/London helpers for the brief. All stored times are UTC ISO strings;
// everything shown or picked on the page is UK time.

export const TZ = 'Europe/London'

const partsFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
})

export function londonParts(date) {
    const o = {}
    for (const p of partsFormat.formatToParts(date)) o[p.type] = p.value
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute }
}

const pad = (n) => String(n).padStart(2, '0')

// "YYYY-MM-DD" for a moment, in UK time.
export function londonDate(date = new Date()) {
    const p = londonParts(date)
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

// Minutes since UK midnight.
export function londonMinutes(date) {
    const p = londonParts(date)
    return p.h * 60 + p.mi
}

// UTC ISO -> "YYYY-MM-DDTHH:mm" in UK time, for <input type="datetime-local">.
export function toLondonInput(iso) {
    const p = londonParts(new Date(iso))
    return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`
}

// "YYYY-MM-DDTHH:mm" read as UK time -> UTC ISO. Handles BST/GMT.
export function londonInputToUtc(value) {
    const [date, time] = value.split('T')
    const [y, m, d] = date.split('-').map(Number)
    const [h, mi] = time.split(':').map(Number)
    const wall = Date.UTC(y, m - 1, d, h, mi)
    const offset = (t) => {
        const p = londonParts(new Date(t))
        return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - t
    }
    let t = wall - offset(wall)
    t = wall - offset(t) // second pass settles DST boundaries
    return new Date(t).toISOString()
}

export const formatLondon = (iso, options) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...options }).format(new Date(iso))

// "YYYY-MM-DD" -> "Monday 9 November 2026"
export function longDate(day) {
    const [y, m, d] = day.split('-').map(Number)
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(Date.UTC(y, m - 1, d, 12))
    )
}

export function shortDay(day) {
    const [y, m, d] = day.split('-').map(Number)
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(
        new Date(Date.UTC(y, m - 1, d, 12))
    )
}

// "Tue 10 Nov, 09:00"; adds the year when it isn't this year.
export const whenLabel = (iso) =>
    formatLondon(iso, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(londonParts(new Date(iso)).y !== londonParts(new Date()).y ? { year: 'numeric' } : {}),
        hour: '2-digit',
        minute: '2-digit'
    })
