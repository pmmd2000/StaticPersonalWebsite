// CSRF token for owner-only writes; set by session() and login().
let csrf = null

async function request(path, options = {}) {
    const write = options.method && options.method !== 'GET'
    const res = await fetch(path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(write && csrf ? { 'X-CSRF-Token': csrf } : {}),
            ...options.headers
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status })
    return data
}

const remember = (data) => {
    csrf = data?.csrf || null
    return data
}

export const getNews = (limit) => request(`/api/news${limit ? `?limit=${limit}` : ''}`)
export const getHobbies = () => request('/api/hobbies')

export const admin = {
    session: () => request('/api/admin/session').then(remember),
    login: (password) => request('/api/admin/login', { method: 'POST', body: { password } }).then(remember),
    logout: () => request('/api/admin/logout', { method: 'POST' }),
    list: (kind) => request(`/api/admin/${kind}`),
    create: (kind, body) => request(`/api/admin/${kind}`, { method: 'POST', body }),
    update: (kind, id, body) => request(`/api/admin/${kind}/${id}`, { method: 'PUT', body }),
    remove: (kind, id) => request(`/api/admin/${kind}/${id}`, { method: 'DELETE' }),
    contacts: () => request('/api/admin/contacts')
}

export const briefApi = {
    get: (date) => request(`/api/brief${date ? `?date=${encodeURIComponent(date)}` : ''}`),
    history: () => request('/api/brief/history'),
    save: (changes) => request('/api/brief/actions', { method: 'POST', body: { changes } })
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// "13 OCT" or "13 OCT 2026"
export function formatStamp(value, withYear = true) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    const day = String(date.getUTCDate()).padStart(2, '0')
    const stamp = `${day} ${MONTHS[date.getUTCMonth()]}`
    return withYear ? `${stamp} ${date.getUTCFullYear()}` : stamp
}

export function formatDate(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
