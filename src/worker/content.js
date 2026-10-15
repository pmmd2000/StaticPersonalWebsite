// Data layer shared by the admin API and the MCP tools, so both paths
// validate and write content exactly the same way.

export const NEWS_FIELDS = ['title', 'url', 'source', 'summary', 'image_url', 'published_at']
export const HOBBY_FIELDS = ['name', 'description', 'icon', 'image_url', 'link', 'sort_order']

const REQUIRED = {
    news: ['title', 'url'],
    hobbies: ['name']
}

export class ValidationError extends Error {}

function clean(fields, input, { partial }) {
    const out = {}
    for (const key of fields) {
        if (!(key in input)) continue
        let value = input[key]
        if (typeof value === 'string') value = value.trim()
        if (value === '') value = null
        out[key] = value
    }
    if (out.sort_order != null) {
        out.sort_order = Number(out.sort_order)
        if (!Number.isInteger(out.sort_order)) throw new ValidationError('sort_order must be an integer')
    }
    for (const key of ['url', 'image_url', 'link']) {
        if (out[key] != null && !/^https?:\/\//i.test(out[key])) {
            throw new ValidationError(`${key} must be an http(s) URL`)
        }
    }
    if (!partial && Object.keys(out).length === 0) throw new ValidationError('No fields given')
    return out
}

function table(kind) {
    if (kind === 'news') return { name: 'news', fields: NEWS_FIELDS, order: 'created_at DESC, id DESC' }
    if (kind === 'hobbies') return { name: 'hobbies', fields: HOBBY_FIELDS, order: 'sort_order ASC, id ASC' }
    throw new Error(`Unknown content kind: ${kind}`)
}

export async function list(db, kind, { limit } = {}) {
    const t = table(kind)
    let sql = `SELECT * FROM ${t.name} ORDER BY ${t.order}`
    const binds = []
    if (limit) {
        sql += ' LIMIT ?'
        binds.push(Math.min(Math.max(Number(limit) || 1, 1), 100))
    }
    const { results } = await db.prepare(sql).bind(...binds).all()
    return results
}

export async function get(db, kind, id) {
    const t = table(kind)
    return db.prepare(`SELECT * FROM ${t.name} WHERE id = ?`).bind(id).first()
}

export async function create(db, kind, input) {
    const t = table(kind)
    const data = clean(t.fields, input, { partial: false })
    for (const key of REQUIRED[kind]) {
        if (data[key] == null) throw new ValidationError(`${key} is required`)
    }
    const keys = Object.keys(data)
    const row = await db
        .prepare(`INSERT INTO ${t.name} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')}) RETURNING *`)
        .bind(...keys.map((k) => data[k]))
        .first()
    return row
}

export async function update(db, kind, id, input) {
    const t = table(kind)
    const data = clean(t.fields, input, { partial: true })
    for (const key of REQUIRED[kind]) {
        if (key in data && data[key] == null) throw new ValidationError(`${key} cannot be empty`)
    }
    const keys = Object.keys(data)
    if (keys.length === 0) return get(db, kind, id)
    return db
        .prepare(
            `UPDATE ${t.name} SET ${keys.map((k) => `${k} = ?`).join(', ')},
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? RETURNING *`
        )
        .bind(...keys.map((k) => data[k]), id)
        .first()
}

export async function remove(db, kind, id) {
    const t = table(kind)
    const { meta } = await db.prepare(`DELETE FROM ${t.name} WHERE id = ?`).bind(id).run()
    return meta.changes > 0
}

export async function listContacts(db, { limit = 50 } = {}) {
    const { results } = await db
        .prepare('SELECT * FROM contacts ORDER BY created_at DESC, id DESC LIMIT ?')
        .bind(Math.min(Math.max(Number(limit) || 50, 1), 500))
        .all()
    return results
}
