// Single-owner auth. The ADMIN_PASSWORD secret unlocks both the admin page and
// the OAuth consent screen; sessions are HMAC-signed cookies keyed off that
// password, so rotating the password logs every session out.

const COOKIE = '__Host-admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12

const encoder = new TextEncoder()

async function hmacKey(env) {
    if (!env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD secret is not set')
    const material = await crypto.subtle.digest('SHA-256', encoder.encode(`session:${env.ADMIN_PASSWORD}`))
    return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function toHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex) {
    if (!/^[0-9a-f]*$/.test(hex) || hex.length % 2) return new Uint8Array()
    return new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)))
}

export async function checkPassword(env, candidate) {
    if (!env.ADMIN_PASSWORD || typeof candidate !== 'string') return false
    // Compare digests so the comparison is constant-time regardless of length.
    const [a, b] = await Promise.all([
        crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
        crypto.subtle.digest('SHA-256', encoder.encode(env.ADMIN_PASSWORD))
    ])
    return crypto.subtle.timingSafeEqual(a, b)
}

export async function createSessionCookie(env) {
    const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
    const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), encoder.encode(String(expires)))
    return `${COOKIE}=${expires}.${toHex(sig)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`
}

export function clearSessionCookie() {
    return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}

export async function hasSession(request, env) {
    const cookie = request.headers.get('Cookie') || ''
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([0-9a-f]+)`))
    if (!match) return false
    const [, expires, sig] = match
    if (Number(expires) < Date.now() / 1000) return false
    try {
        return await crypto.subtle.verify('HMAC', await hmacKey(env), fromHex(sig), encoder.encode(expires))
    } catch {
        return false
    }
}
