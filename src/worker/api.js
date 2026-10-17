import * as content from './content.js'
import { checkPassword, clearSessionCookie, createSessionCookie, hasSession } from './session.js'

const json = (data, init = {}) =>
    new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...init.headers }
    })

const error = (status, message) => json({ error: message }, { status })

const KINDS = new Set(['news', 'hobbies'])

export async function handleApi(request, env) {
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

        // ── Admin ───────────────────────────────────────────────
        if (parts[1] === 'admin') {
            return await handleAdmin(request, env, parts.slice(2), method)
        }

        return error(404, 'Not found')
    } catch (err) {
        if (err instanceof content.ValidationError) return error(400, err.message)
        console.error('API error', err)
        return error(500, 'Internal error')
    }
}

async function handleAdmin(request, env, parts, method) {
    if (parts[0] === 'login' && method === 'POST') {
        const body = await request.json().catch(() => ({}))
        if (!(await checkPassword(env, body.password))) return error(401, 'Wrong password')
        return json({ ok: true }, { headers: { 'Set-Cookie': await createSessionCookie(env) } })
    }
    if (parts[0] === 'logout' && method === 'POST') {
        return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
    }
    if (parts[0] === 'session' && method === 'GET') {
        return json({ authenticated: await hasSession(request, env) })
    }

    if (!(await hasSession(request, env))) return error(401, 'Not signed in')

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
