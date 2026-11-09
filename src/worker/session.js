// Single-owner auth for /admin, /brief and the OAuth consent screen.
//
// Password: ADMIN_PASSWORD_HASH (PBKDF2-SHA256, made by `npm run hash-password`)
// is preferred; the plain ADMIN_PASSWORD secret still works until it is removed.
// Sessions are HMAC-signed cookies keyed off the password plus SESSION_SECRET
// (when set), so changing either signs every session out. Mutating requests
// also need a CSRF token derived from the session.

const COOKIE = '__Host-admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12

const encoder = new TextEncoder()

export const passwordEnabled = (env) => !!(env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD)

function credential(env) {
    const value = env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD || ''
    if (!value && !env.SESSION_SECRET) throw new Error('Set SESSION_SECRET (or a password secret) to sign sessions')
    return value
}

async function hmacKey(env) {
    const material = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(`session:${credential(env)}:${env.SESSION_SECRET || ''}`)
    )
    return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function toHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex) {
    if (!/^[0-9a-f]*$/.test(hex) || hex.length % 2) return new Uint8Array()
    return new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)))
}

function fromBase64(b64) {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

const equal = async (a, b) => {
    // Hash both sides so the comparison is constant-time regardless of length.
    const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', a), crypto.subtle.digest('SHA-256', b)])
    return crypto.subtle.timingSafeEqual(x, y)
}

// Format: pbkdf2-sha256$<iterations>$<salt base64>$<hash base64>
async function verifyHash(stored, candidate) {
    const [scheme, iterations, salt, hash] = stored.split('$')
    if (scheme !== 'pbkdf2-sha256' || !iterations || !salt || !hash) throw new Error('ADMIN_PASSWORD_HASH is malformed')
    const key = await crypto.subtle.importKey('raw', encoder.encode(candidate), 'PBKDF2', false, ['deriveBits'])
    const expected = fromBase64(hash)
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations: Number(iterations) },
        key,
        expected.length * 8
    )
    return equal(bits, expected)
}

export async function checkPassword(env, candidate) {
    if (typeof candidate !== 'string' || !candidate) return false
    if (env.ADMIN_PASSWORD_HASH) return verifyHash(env.ADMIN_PASSWORD_HASH, candidate)
    if (!env.ADMIN_PASSWORD) return false
    return equal(encoder.encode(candidate), encoder.encode(env.ADMIN_PASSWORD))
}

// ── Sessions ─────────────────────────────────────────────

function sessionValue(request) {
    const cookie = request.headers.get('Cookie') || ''
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+\\.[0-9a-f]+)`))
    return match ? match[1] : null
}

export async function createSession(env) {
    const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
    const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), encoder.encode(String(expires)))
    const value = `${expires}.${toHex(sig)}`
    return {
        cookie: `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`,
        csrf: await csrfFor(env, value)
    }
}

export async function createSessionCookie(env) {
    return (await createSession(env)).cookie
}

export function clearSessionCookie() {
    return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}

export async function hasSession(request, env) {
    const value = sessionValue(request)
    if (!value) return false
    const [expires, sig] = value.split('.')
    if (Number(expires) < Date.now() / 1000) return false
    try {
        return await crypto.subtle.verify('HMAC', await hmacKey(env), fromHex(sig), encoder.encode(expires))
    } catch {
        return false
    }
}

// ── CSRF ─────────────────────────────────────────────────
// The token is an HMAC of the session cookie, so it is bound to the session
// and needs no storage. Pages read it from /api/admin/session.

async function csrfFor(env, value) {
    return toHex(await crypto.subtle.sign('HMAC', await hmacKey(env), encoder.encode(`csrf:${value}`)))
}

export async function csrfToken(request, env) {
    const value = sessionValue(request)
    return value ? csrfFor(env, value) : null
}

export async function checkCsrf(request, env) {
    const sent = request.headers.get('X-CSRF-Token') || ''
    const expected = await csrfToken(request, env)
    if (!expected || !sent) return false
    return equal(encoder.encode(sent), encoder.encode(expected))
}

// Same-origin check for cookie-authenticated writes (defence in depth with
// SameSite=Strict and the CSRF token).
export function sameOrigin(request) {
    const origin = request.headers.get('Origin')
    return !!origin && origin === new URL(request.url).origin
}

// ── Login throttling ─────────────────────────────────────
// Per IP: 5 failures in 15 minutes locks that IP for 15 minutes.
// Global: 50 failures in 15 minutes locks sign-in for everyone for 15 minutes.

const WINDOW = 15 * 60
const LIMITS = { ip: 5, global: 50 }

const throttleKeys = (request) => [
    [`ip:${request.headers.get('CF-Connecting-IP') || 'unknown'}`, LIMITS.ip],
    ['global', LIMITS.global]
]

// Returns seconds until sign-in is allowed again, or 0.
export async function loginLockedFor(db, request) {
    const now = Math.floor(Date.now() / 1000)
    const keys = throttleKeys(request).map(([k]) => k)
    const { results } = await db
        .prepare('SELECT locked_until FROM login_throttle WHERE key IN (?, ?)')
        .bind(...keys)
        .all()
    return Math.max(0, ...results.map((r) => r.locked_until - now))
}

export async function recordLoginFailure(db, request) {
    const now = Math.floor(Date.now() / 1000)
    const stmt = db.prepare(
        `INSERT INTO login_throttle (key, failures, window_start, locked_until) VALUES (?1, 1, ?2, 0)
         ON CONFLICT(key) DO UPDATE SET
           failures = CASE WHEN window_start < ?2 - ${WINDOW} THEN 1 ELSE failures + 1 END,
           locked_until = CASE
             WHEN (CASE WHEN window_start < ?2 - ${WINDOW} THEN 1 ELSE failures + 1 END) >= ?3 THEN ?2 + ${WINDOW}
             ELSE locked_until END,
           window_start = CASE WHEN window_start < ?2 - ${WINDOW} THEN ?2 ELSE window_start END`
    )
    await db.batch(throttleKeys(request).map(([key, limit]) => stmt.bind(key, now, limit)))
}

export async function recordLoginSuccess(db, request) {
    await db.prepare('DELETE FROM login_throttle WHERE key = ?').bind(throttleKeys(request)[0][0]).run()
}

// One place for "check a password with lockout": { ok } or { locked: seconds }.
export async function attemptLogin(env, request, candidate) {
    const locked = await loginLockedFor(env.DB, request)
    if (locked > 0) return { ok: false, locked }
    if (await checkPassword(env, candidate)) {
        await recordLoginSuccess(env.DB, request)
        return { ok: true }
    }
    await recordLoginFailure(env.DB, request)
    return { ok: false, locked: 0 }
}
