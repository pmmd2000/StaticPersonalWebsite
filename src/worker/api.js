import * as content from './content.js'
import * as brief from './brief.js'
import { saveSchema } from './brief-schema.js'
import { googleCallback, googleEnabled, googleStart } from './google.js'
import {
    attemptLogin,
    checkCsrf,
    clearSessionCookie,
    createSession,
    csrfToken,
    hasSession,
    passwordEnabled,
    sameOrigin
} from './session.js'

const json = (data, init = {}) =>
    new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...init.headers }
    })

const error = (status, message, headers) => json({ error: message }, { status, headers })

const KINDS = new Set(['news', 'hobbies'])
const PRIVATE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }

export async function handleApi(request, env, ctx) {
    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean) // ['api', ...]
    const method = request.method

    try {
        // ── Public ──────────────────────────────────────────────
        if (parts[1] === 'news' && parts.length === 2 && method === 'GET') {
            const items = await content.list(env.DB, 'news', { limit: url.searchParams.get('limit') })
            return json(items, { headers: { 'Cache-Control': 'public, max-age=60' } })
        }
        if (parts[1] === 'hobbies' && parts.length === 2 && method === 'GET') {
            const items = await content.list(env.DB, 'hobbies')
            return json(items, { headers: { 'Cache-Control': 'public, max-age=60' } })
        }

        // ── Owner-only (cookie session) ─────────────────────────
        if (parts[1] === 'admin' || parts[1] === 'brief') {
            // Every cookie-authenticated write must come from this origin.
            if (method !== 'GET' && !sameOrigin(request)) return error(403, 'Cross-origin request refused')
            if (parts[1] === 'admin') return await handleAdmin(request, env, parts.slice(2), method)
            return await handleBrief(request, env, ctx, parts.slice(2), method, url)
        }

        return error(404, 'Not found')
    } catch (err) {
        if (err instanceof content.ValidationError || err instanceof brief.BriefError) return error(400, err.message)
        console.error('API error', err)
        return error(500, 'Internal error')
    }
}

// Signed-in check plus, for writes, a valid CSRF token.
async function guard(request, env, method) {
    if (!(await hasSession(request, env))) return error(401, 'Not signed in', PRIVATE)
    if (method !== 'GET' && !(await checkCsrf(request, env))) return error(403, 'Missing or invalid CSRF token', PRIVATE)
    return null
}

async function handleAdmin(request, env, parts, method) {
    if (parts[0] === 'login' && method === 'POST') {
        if (!passwordEnabled(env)) return error(404, 'Password sign-in is off')
        const body = await request.json().catch(() => ({}))
        const attempt = await attemptLogin(env, request, body.password)
        if (attempt.locked) {
            return error(429, `Too many attempts. Try again in ${Math.ceil(attempt.locked / 60)} min.`, {
                'Retry-After': String(attempt.locked)
            })
        }
        if (!attempt.ok) return error(401, 'Wrong password')
        const session = await createSession(env)
        return json({ ok: true, csrf: session.csrf }, { headers: { 'Set-Cookie': session.cookie } })
    }
    if (parts[0] === 'google' && method === 'GET') {
        if (parts[1] === 'start') return googleStart(request, env)
        if (parts[1] === 'callback') return googleCallback(request, env)
    }
    if (parts[0] === 'logout' && method === 'POST') {
        return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
    }
    if (parts[0] === 'session' && method === 'GET') {
        const authenticated = await hasSession(request, env)
        return json({
            authenticated,
            csrf: authenticated ? await csrfToken(request, env) : null,
            methods: { password: passwordEnabled(env), google: googleEnabled(env) }
        })
    }

    const denied = await guard(request, env, method)
    if (denied) return denied

    if (parts[0] === 'contacts' && method === 'GET') {
        return json(await content.listContacts(env.DB))
    }

    const [kind, rawId] = parts
    if (!KINDS.has(kind)) return error(404, 'Not found')
    const id = rawId === undefined ? null : Number(rawId)
    if (rawId !== undefined && !Number.isInteger(id)) return error(400, 'Bad id')

    if (id === null && method === 'GET') return json(await content.list(env.DB, kind))
    if (id === null && method === 'POST') {
        return json(await content.create(env.DB, kind, await request.json()), { status: 201 })
    }
    if (id !== null && method === 'PUT') {
        const row = await content.update(env.DB, kind, id, await request.json())
        return row ? json(row) : error(404, 'Not found')
    }
    if (id !== null && method === 'DELETE') {
        return (await content.remove(env.DB, kind, id)) ? json({ ok: true }) : error(404, 'Not found')
    }
    return error(405, 'Method not allowed')
}

// ── Morning Brief ────────────────────────────────────────

async function handleBrief(request, env, ctx, parts, method, url) {
    const denied = await guard(request, env, method)
    if (denied) return denied

    // GET /api/brief[?date=YYYY-MM-DD]
    if (parts.length === 0 && method === 'GET') {
        const date = url.searchParams.get('date')
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return error(400, 'date must be YYYY-MM-DD', PRIVATE)
        const data = await brief.getBrief(env.DB, date || undefined)
        return json({ ...(data || { run: null, items: [] }), pending: await brief.pendingCount(env.DB) }, { headers: PRIVATE })
    }

    // GET /api/brief/history
    if (parts[0] === 'history' && method === 'GET') {
        const [runs, commitments] = await Promise.all([brief.listRuns(env.DB), brief.listCommitments(env.DB)])
        return json({ runs, commitments }, { headers: PRIVATE })
    }

    // POST /api/brief/actions  { changes: [...] }
    if (parts[0] === 'actions' && method === 'POST') {
        const parsed = saveSchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success) {
            const issue = parsed.error.issues[0]
            return error(400, `Invalid changes: ${issue?.path?.join('.') || ''} ${issue?.message || ''}`.trim(), PRIVATE)
        }
        const saved = await brief.saveActions(env.DB, parsed.data.changes)
        notifySaved(env, ctx, saved.saved)
        return json(saved, { headers: PRIVATE })
    }

    return error(404, 'Not found', PRIVATE)
}

// Optional "Parham pressed Save" ping. Never blocks or fails the save: it runs
// after the response, retries once, and only logs errors.
function notifySaved(env, ctx, count) {
    const url = env.BRIEF_SAVE_WEBHOOK_URL
    if (!url || !ctx?.waitUntil) return
    ctx.waitUntil(
        (async () => {
            const body = JSON.stringify({ event: 'brief_actions_saved', count })
            const timestamp = String(Math.floor(Date.now() / 1000))
            const headers = { 'Content-Type': 'application/json', 'X-Brief-Timestamp': timestamp }
            if (env.BRIEF_WEBHOOK_SECRET) {
                const key = await crypto.subtle.importKey(
                    'raw',
                    new TextEncoder().encode(env.BRIEF_WEBHOOK_SECRET),
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['sign']
                )
                const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`))
                headers['X-Brief-Signature'] = `sha256=${[...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')}`
            }
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) })
                    if (res.ok) return
                    console.warn('brief webhook responded', res.status)
                } catch (err) {
                    console.warn('brief webhook failed', err?.message)
                }
                if (attempt === 1) await new Promise((r) => setTimeout(r, 2000))
            }
        })()
    )
}
