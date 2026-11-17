// "Sign in with Google" for the site owner: an authorization-code flow with
// PKCE that ends in the same owner session the password creates, so /brief,
// /admin and the MCP consent page need nothing new.
//
// Config: GOOGLE_CLIENT_ID (var), GOOGLE_CLIENT_SECRET and OWNER_EMAILS
// (secrets; OWNER_EMAILS is a comma-separated allowlist). The OAuth client is
// "parhammonfared.com site" in the Google Cloud project `parhammonfared`, with
// <origin>/api/admin/google/callback registered for each origin it serves.
//
// ParhamApp (the Android app) shows /brief in a WebView, and Google refuses to
// run OAuth inside one. So the app opens /start in a real browser tab with
// ?app_challenge=<S256 of a verifier it keeps>; the callback then hands back a
// two-minute signed code on parhamapp://auth/google instead of a session, and
// the WebView trades code + verifier for the session at /app-session. The code
// alone is useless to anything else that catches that redirect.

import {
    createSession,
    loginLockedFor,
    recordLoginFailure,
    recordLoginSuccess,
    signValue,
    verifyValue
} from './session.js'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])
const COOKIE = '__Host-google_oauth'
const FLOW_TTL_SECONDS = 600
const APP_REDIRECT = 'parhamapp://auth/google'
const APP_CODE_TTL_SECONDS = 120
// A base64url SHA-256 (the challenge) or a base64url 32-byte verifier.
const PKCE_VALUE = /^[A-Za-z0-9_-]{43}$/

const encoder = new TextEncoder()

const ownerEmails = (env) =>
    new Set(
        String(env.OWNER_EMAILS || '')
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)
    )

export const googleEnabled = (env) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && ownerEmails(env).size)

export const googleStartPath = (returnTo) => `/api/admin/google/start?return_to=${encodeURIComponent(returnTo)}`

const toBase64Url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function fromBase64Url(text) {
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
    return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))
}

const randomToken = () => toBase64Url(crypto.getRandomValues(new Uint8Array(32)))

// Same-site paths only, so the post-login redirect can't be aimed elsewhere.
function safeReturn(value) {
    const path = typeof value === 'string' ? value : ''
    return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/brief'
}

const s256 = async (text) => toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text))))

const appCodeLabel = (expires, challenge) => `app-handoff:${expires}:${challenge}`

function appRedirect(params, cookies = []) {
    const headers = new Headers({ Location: `${APP_REDIRECT}?${new URLSearchParams(params)}`, 'Cache-Control': 'no-store' })
    for (const cookie of cookies) headers.append('Set-Cookie', cookie)
    return new Response(null, { status: 302, headers })
}

const redirectUri = (request) => `${new URL(request.url).origin}/api/admin/google/callback`

// The flow state lives in a short-lived cookie. SameSite=Lax (not Strict) so it
// comes back on Google's top-level redirect; __Host- keeps other subdomains
// from planting one.
function flowCookie(flow) {
    const value = toBase64Url(encoder.encode(JSON.stringify(flow)))
    return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${FLOW_TTL_SECONDS}`
}

const clearFlowCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

function readFlow(request) {
    const match = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9_-]+)`))
    if (!match) return null
    try {
        const flow = JSON.parse(new TextDecoder().decode(fromBase64Url(match[1])))
        return flow && typeof flow.state === 'string' ? flow : null
    } catch {
        return null
    }
}

// The ID token comes straight from Google's token endpoint over TLS, so its
// claims can be trusted without checking the signature (Google's guidance for
// server-side code flows); the claims themselves are still checked.
function idTokenClaims(idToken) {
    try {
        return JSON.parse(new TextDecoder().decode(fromBase64Url(idToken.split('.')[1])))
    } catch {
        return null
    }
}

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// The session cookie is SameSite=Strict, so it isn't sent on a redirect chain
// that started at Google. Finishing with a same-site page hop (a meta refresh)
// makes the next request same-site, which server-rendered pages like
// /authorize need to see the new session.
function finish(target, cookies, error) {
    const headers = new Headers({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow'
    })
    for (const cookie of cookies) headers.append('Set-Cookie', cookie)
    const href = escape(target)
    const body = error
        ? `<p>${escape(error)}</p><p><a href="${href}">Back</a></p>`
        : `<meta http-equiv="refresh" content="0;url=${href}"><p>Signing in… <a href="${href}">Continue</a></p>`
    return new Response(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d0c;color:#f2f1ec;font:15px/1.5 system-ui,sans-serif;padding:16px;text-align:center}a{color:#ffb27a}</style>
</head><body><main>${body}</main></body></html>`,
        { status: error ? 400 : 200, headers }
    )
}

// GET /api/admin/google/start?return_to=/brief[&app_challenge=…]
export async function googleStart(request, env) {
    if (!googleEnabled(env)) return new Response('Google sign-in is off', { status: 404 })
    const params = new URL(request.url).searchParams
    const flow = {
        state: randomToken(),
        nonce: randomToken(),
        verifier: randomToken(),
        returnTo: safeReturn(params.get('return_to'))
    }
    const appChallenge = params.get('app_challenge')
    if (appChallenge !== null) {
        if (!PKCE_VALUE.test(appChallenge)) return new Response('Bad app_challenge', { status: 400 })
        flow.app = appChallenge
    }
    const challenge = await s256(flow.verifier)
    const auth = new URL(AUTH_URL)
    auth.search = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri(request),
        response_type: 'code',
        scope: 'openid email',
        state: flow.state,
        nonce: flow.nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        prompt: 'select_account'
    })
    return new Response(null, {
        status: 302,
        headers: { Location: auth.toString(), 'Set-Cookie': flowCookie(flow), 'Cache-Control': 'no-store' }
    })
}

// GET /api/admin/google/callback?code=…&state=…
export async function googleCallback(request, env) {
    if (!googleEnabled(env)) return new Response('Google sign-in is off', { status: 404 })
    const params = new URL(request.url).searchParams
    const flow = readFlow(request)
    const back = flow?.returnTo || '/brief'
    // A flow the app started ends back in the app, whichever way it goes.
    const fail = (message) =>
        flow?.app ? appRedirect({ error: message }, [clearFlowCookie()]) : finish(back, [clearFlowCookie()], message)

    if (!flow || params.get('state') !== flow.state) return fail('That sign-in link expired. Try again.')
    if (params.get('error') || !params.get('code')) return fail('Google sign-in was cancelled.')

    const locked = await loginLockedFor(env.DB, request)
    if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 60)} min.`)

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code: params.get('code'),
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri(request),
            grant_type: 'authorization_code',
            code_verifier: flow.verifier
        })
    })
    const tokens = await res.json().catch(() => ({}))
    if (!res.ok || typeof tokens.id_token !== 'string') {
        console.warn('google token exchange failed', res.status, tokens.error)
        return fail('Google sign-in failed. Try again.')
    }

    const claims = idTokenClaims(tokens.id_token)
    const email = String(claims?.email || '').toLowerCase()
    const valid =
        !!claims &&
        claims.aud === env.GOOGLE_CLIENT_ID &&
        ISSUERS.has(claims.iss) &&
        Number(claims.exp) * 1000 > Date.now() &&
        claims.nonce === flow.nonce &&
        claims.email_verified === true &&
        ownerEmails(env).has(email)
    if (!valid) {
        await recordLoginFailure(env.DB, request)
        return fail('That Google account is not allowed here.')
    }

    await recordLoginSuccess(env.DB, request)
    if (flow.app) {
        // No session for this browser: the app's WebView collects it.
        const expires = Math.floor(Date.now() / 1000) + APP_CODE_TTL_SECONDS
        const code = `${expires}.${await signValue(env, appCodeLabel(expires, flow.app))}`
        return appRedirect({ code }, [clearFlowCookie()])
    }
    const session = await createSession(env)
    return finish(flow.returnTo, [clearFlowCookie(), session.cookie])
}

// GET /api/admin/google/app-session?code=…&verifier=…[&return_to=/brief]
// Loaded by the app's WebView, so the session cookie lands in its cookie jar.
export async function googleAppSession(request, env) {
    if (!googleEnabled(env)) return new Response('Google sign-in is off', { status: 404 })
    const params = new URL(request.url).searchParams
    const back = safeReturn(params.get('return_to'))

    const locked = await loginLockedFor(env.DB, request)
    if (locked > 0) return finish(back, [], `Too many attempts. Try again in ${Math.ceil(locked / 60)} min.`)

    const [expires = '', signature = ''] = String(params.get('code') || '').split('.')
    const verifier = params.get('verifier') || ''
    const valid =
        /^\d+$/.test(expires) &&
        Number(expires) > Date.now() / 1000 &&
        PKCE_VALUE.test(verifier) &&
        (await verifyValue(env, appCodeLabel(expires, await s256(verifier)), signature))
    if (!valid) {
        await recordLoginFailure(env.DB, request)
        return finish(back, [], 'That sign-in link expired. Try again.')
    }

    const session = await createSession(env)
    return finish(back, [session.cookie])
}
