// Morning Brief data layer, shared by the MCP tools and the /api/brief routes.
//
// Writes go through json_each() so a whole run or a whole save is a handful of
// statements regardless of size (D1 caps statements per request and bound
// parameters per statement). db.batch() runs them as one transaction.

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
const CHUNK = 100 // items per statement: keeps each bound JSON blob well under D1's 2 MB row limit

export const SECTIONS = ['dont_miss', 'waiting', 'unopened', 'closed']
export const STATUSES = ['open', 'done', 'wont_do', 'rescheduled', 'dismissed']
export const ACTIONS = ['done', 'wont_do', 'reschedule', 'note', 'reopen']
export const ACTION_STATES = ['pending', 'claimed', 'applied', 'failed', 'skipped']

export class BriefError extends Error {}

const parse = (text, fallback) => {
    try {
        return text == null ? fallback : JSON.parse(text)
    } catch {
        return fallback
    }
}

const decodeRun = (row) =>
    row && {
        id: row.id,
        brief_date: row.brief_date,
        generated_at: row.generated_at,
        checked_label: row.checked_label,
        summary: parse(row.summary, []),
        forecast: parse(row.forecast, []),
        calendar_sync_lines: parse(row.calendar_sync_lines, []),
        created_at: row.created_at
    }

const decodeItem = (row) =>
    row && {
        ...row,
        source_ref: parse(row.source_ref, {}),
        quotes: parse(row.quotes, []),
        pills: parse(row.pills, [])
    }

const decodeAction = (row) => row && { ...row, payload: parse(row.payload, {}) }

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size))

// ── publish ──────────────────────────────────────────────

export async function publishBrief(db, run, items) {
    const keys = new Set()
    for (const item of items) {
        if (keys.has(item.item_key)) throw new BriefError(`Duplicate item_key in this run: ${item.item_key}`)
        keys.add(item.item_key)
    }

    const runRow = await db
        .prepare(
            `INSERT INTO brief_runs (brief_date, generated_at, checked_label, summary, forecast, calendar_sync_lines)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
        )
        .bind(
            run.brief_date,
            run.generated_at,
            run.checked_label ?? null,
            JSON.stringify(run.summary ?? []),
            JSON.stringify(run.forecast ?? []),
            JSON.stringify(run.calendar_sync_lines ?? [])
        )
        .first()

    const rows = items.map((it, position) => ({
        item_key: it.item_key,
        section: it.section,
        source_app: it.source_app,
        source_account: it.source_account ?? null,
        source_ref: JSON.stringify(it.source_ref ?? {}),
        kind: it.kind,
        title: it.title,
        body: it.body ?? null,
        quotes: JSON.stringify(it.quotes ?? []),
        pills: JSON.stringify(it.pills ?? []),
        time_label: it.time_label ?? null,
        due_at: it.due_at ?? null,
        person: it.person ?? null,
        waited_days: it.waited_days ?? null,
        unread_count: it.unread_count ?? null,
        position
    }))

    const f = (name) => `json_extract(value, '$.${name}')`
    const upsert = db.prepare(
        `INSERT INTO brief_items (item_key, section, source_app, source_account, source_ref, kind, title, body,
            quotes, pills, time_label, due_at, person, waited_days, unread_count,
            first_seen_run_id, last_seen_run_id, last_brief_date)
         SELECT ${['item_key', 'section', 'source_app', 'source_account', 'source_ref', 'kind', 'title', 'body', 'quotes', 'pills', 'time_label', 'due_at', 'person', 'waited_days', 'unread_count'].map(f).join(', ')},
            ?2, ?2, ?3
         FROM json_each(?1) WHERE true
         ON CONFLICT(item_key) DO UPDATE SET
            section = excluded.section, source_app = excluded.source_app, source_account = excluded.source_account,
            source_ref = excluded.source_ref, kind = excluded.kind, title = excluded.title, body = excluded.body,
            quotes = excluded.quotes, pills = excluded.pills, time_label = excluded.time_label, due_at = excluded.due_at,
            person = excluded.person, waited_days = excluded.waited_days, unread_count = excluded.unread_count,
            last_seen_run_id = excluded.last_seen_run_id, last_brief_date = excluded.last_brief_date,
            updated_at = ${NOW}`
        // status, status_changed_at, rescheduled_to and user_note are deliberately absent:
        // those belong to the owner and a re-publish must never touch them.
    )
    const membership = db.prepare(
        `INSERT INTO brief_run_items (run_id, item_key, section, position)
         SELECT ?2, ${f('item_key')}, ${f('section')}, ${f('position')} FROM json_each(?1)`
    )

    const statements = []
    for (const part of chunks(rows, CHUNK)) {
        const blob = JSON.stringify(part)
        statements.push(upsert.bind(blob, runRow.id, run.brief_date), membership.bind(blob, runRow.id))
    }
    if (statements.length) await db.batch(statements)

    const states = await getItemStates(db, { item_keys: [...keys], limit: keys.size || 1 })
    return { run_id: runRow.id, brief_date: runRow.brief_date, items: states }
}

// ── read ─────────────────────────────────────────────────

const STATE_COLUMNS = `item_key, status, status_changed_at, rescheduled_to, user_note, title, source_app, kind, last_brief_date`

export async function getItemStates(db, { item_keys, key_prefix, statuses, since, limit = 500 } = {}) {
    const where = []
    const binds = []
    if (item_keys?.length) {
        where.push('item_key IN (SELECT value FROM json_each(?))')
        binds.push(JSON.stringify(item_keys))
    }
    if (key_prefix) {
        where.push('substr(item_key, 1, length(?)) = ?')
        binds.push(key_prefix, key_prefix)
    }
    if (statuses?.length) {
        where.push('status IN (SELECT value FROM json_each(?))')
        binds.push(JSON.stringify(statuses))
    }
    if (since) {
        where.push('status_changed_at >= ?')
        binds.push(since)
    }
    binds.push(Math.min(Math.max(Number(limit) || 500, 1), 5000))
    const { results } = await db
        .prepare(
            `SELECT ${STATE_COLUMNS} FROM brief_items ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
             ORDER BY item_key LIMIT ?`
        )
        .bind(...binds)
        .all()
    return results
}

// Latest non-skipped action per item and per group ("status" vs "note").
async function latestActions(db, keys) {
    if (!keys.length) return new Map()
    const { results } = await db
        .prepare(
            `SELECT * FROM brief_actions WHERE id IN (
               SELECT MAX(id) FROM brief_actions
               WHERE state != 'skipped' AND item_key IN (SELECT value FROM json_each(?))
               GROUP BY item_key, CASE WHEN action = 'note' THEN 'note' ELSE 'status' END
             ) ORDER BY id`
        )
        .bind(JSON.stringify(keys))
        .all()
    const map = new Map()
    for (const row of results) {
        if (!map.has(row.item_key)) map.set(row.item_key, [])
        map.get(row.item_key).push(decodeAction(row))
    }
    return map
}

export async function getRun(db, date) {
    const row = date
        ? await db.prepare('SELECT * FROM brief_runs WHERE brief_date = ? ORDER BY id DESC LIMIT 1').bind(date).first()
        : await db.prepare('SELECT * FROM brief_runs ORDER BY brief_date DESC, id DESC LIMIT 1').first()
    return decodeRun(row)
}

export async function getBrief(db, date) {
    const run = await getRun(db, date)
    if (!run) return null
    const { results } = await db
        .prepare(
            `SELECT i.*, r.section AS run_section, r.position
             FROM brief_run_items r JOIN brief_items i ON i.item_key = r.item_key
             WHERE r.run_id = ? ORDER BY r.position`
        )
        .bind(run.id)
        .all()
    const actions = await latestActions(db, results.map((r) => r.item_key))
    const items = results.map((row) => {
        const item = decodeItem(row)
        // Show the section the item had in *this* run, not wherever it is now.
        item.section = row.run_section
        delete item.run_section
        item.actions = actions.get(item.item_key) || []
        return item
    })
    return { run, items }
}

export async function listRuns(db, limit = 90) {
    const { results } = await db
        .prepare(
            `SELECT r.id, r.brief_date, r.generated_at, r.checked_label,
                    (SELECT COUNT(*) FROM brief_run_items x WHERE x.run_id = r.id) AS item_count
             FROM brief_runs r
             WHERE r.id = (SELECT MAX(id) FROM brief_runs y WHERE y.brief_date = r.brief_date)
             ORDER BY r.brief_date DESC LIMIT ?`
        )
        .bind(limit)
        .all()
    return results
}

export async function listCommitments(db, limit = 500) {
    const { results } = await db
        .prepare(
            `SELECT * FROM brief_items WHERE substr(item_key, 1, 5) = 'chat:'
             ORDER BY COALESCE(status_changed_at, updated_at) DESC LIMIT ?`
        )
        .bind(limit)
        .all()
    const items = results.map(decodeItem)
    const actions = await latestActions(db, items.map((i) => i.item_key))
    for (const item of items) item.actions = actions.get(item.item_key) || []
    return items
}

// ── owner decisions ──────────────────────────────────────
// changes: [{ item_key, action, payload }]. At most one status action
// (done | wont_do | reschedule | reopen) and one note per item per save.

const STATUS_FOR = { done: 'done', wont_do: 'wont_do', reschedule: 'rescheduled', reopen: 'open' }

export async function saveActions(db, changes) {
    const seen = new Set()
    for (const c of changes) {
        const group = c.action === 'note' ? 'note' : 'status'
        const id = `${c.item_key}|${group}`
        if (seen.has(id)) throw new BriefError(`More than one ${group} change for ${c.item_key}`)
        seen.add(id)
        if (c.action === 'reschedule' && !c.payload?.to_utc) throw new BriefError('reschedule needs payload.to_utc')
    }

    const keys = [...new Set(changes.map((c) => c.item_key))]
    const known = await getItemStates(db, { item_keys: keys, limit: keys.length })
    if (known.length !== keys.length) {
        const have = new Set(known.map((k) => k.item_key))
        throw new BriefError(`Unknown item_key: ${keys.find((k) => !have.has(k))}`)
    }

    const rows = changes.map((c) => ({
        item_key: c.item_key,
        action: c.action,
        grp: c.action === 'note' ? 'note' : 'status',
        payload: JSON.stringify(c.payload ?? {}),
        status: STATUS_FOR[c.action] ?? null,
        to_utc: c.action === 'reschedule' ? c.payload.to_utc : null,
        note: c.action === 'note' ? (c.payload?.note ?? '') : null
    }))
    const blob = JSON.stringify(rows)
    const j = (name) => `json_extract(value, '$.${name}')`

    await db.batch([
        // 1. A newer change supersedes older *pending* ones in the same group.
        db
            .prepare(
                `UPDATE brief_actions SET state = 'skipped', result_message = 'Superseded by a newer change'
                 WHERE state = 'pending' AND EXISTS (
                   SELECT 1 FROM json_each(?1)
                   WHERE ${j('item_key')} = brief_actions.item_key
                     AND ${j('grp')} = CASE WHEN brief_actions.action = 'note' THEN 'note' ELSE 'status' END)`
            )
            .bind(blob),
        // 2. Append the new actions.
        db
            .prepare(
                `INSERT INTO brief_actions (item_key, action, payload)
                 SELECT ${j('item_key')}, ${j('action')}, ${j('payload')} FROM json_each(?1)`
            )
            .bind(blob),
        // 3. Reflect status changes on the item right away.
        db
            .prepare(
                `UPDATE brief_items SET
                   status = c.status,
                   rescheduled_to = CASE WHEN c.status = 'rescheduled' THEN c.to_utc
                                         WHEN c.status = 'open' THEN NULL ELSE rescheduled_to END,
                   status_changed_at = ${NOW}, updated_at = ${NOW}
                 FROM (SELECT ${j('item_key')} AS item_key, ${j('status')} AS status, ${j('to_utc')} AS to_utc
                       FROM json_each(?1) WHERE ${j('grp')} = 'status') AS c
                 WHERE brief_items.item_key = c.item_key`
            )
            .bind(blob),
        // 4. ...and notes.
        db
            .prepare(
                `UPDATE brief_items SET user_note = NULLIF(c.note, ''), updated_at = ${NOW}
                 FROM (SELECT ${j('item_key')} AS item_key, ${j('note')} AS note
                       FROM json_each(?1) WHERE ${j('grp')} = 'note') AS c
                 WHERE brief_items.item_key = c.item_key`
            )
            .bind(blob)
    ])
    return { saved: rows.length, keys }
}

// ── Claude's side of the queue ───────────────────────────

const CLAIM_TIMEOUT_MINUTES = 30

export async function claimPending(db, limit = 50) {
    const n = Math.min(Math.max(Number(limit) || 50, 1), 200)
    const [, claimed] = await db.batch([
        // Claims Claude never reported on go back to the queue.
        db.prepare(
            `UPDATE brief_actions SET state = 'pending', claimed_at = NULL
             WHERE state = 'claimed' AND claimed_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${CLAIM_TIMEOUT_MINUTES} minutes')`
        ),
        // One statement, so concurrent callers can never claim the same row.
        db
            .prepare(
                `UPDATE brief_actions SET state = 'claimed', claimed_at = ${NOW}
                 WHERE id IN (SELECT id FROM brief_actions WHERE state = 'pending' ORDER BY id LIMIT ?)
                 RETURNING *`
            )
            .bind(n)
    ])
    const actions = (claimed.results || []).map(decodeAction).sort((a, b) => a.id - b.id)
    if (!actions.length) return []
    const { results } = await db
        .prepare(
            `SELECT item_key, title, kind, section, source_app, source_account, source_ref, status,
                    rescheduled_to, user_note, due_at, time_label, person
             FROM brief_items WHERE item_key IN (SELECT value FROM json_each(?))`
        )
        .bind(JSON.stringify([...new Set(actions.map((a) => a.item_key))]))
        .all()
    const items = new Map(results.map((r) => [r.item_key, { ...r, source_ref: parse(r.source_ref, {}) }]))
    return actions.map((a) => ({ ...a, item: items.get(a.item_key) || null }))
}

export async function reportResult(db, id, state, message) {
    const row = await db
        .prepare(
            `UPDATE brief_actions SET state = ?2, result_message = ?3,
               applied_at = CASE WHEN ?2 = 'applied' THEN ${NOW} ELSE applied_at END
             WHERE id = ?1 AND state IN ('pending', 'claimed') RETURNING *`
        )
        .bind(id, state, message ?? null)
        .first()
    if (row) return decodeAction(row)
    const existing = await db.prepare('SELECT id, state FROM brief_actions WHERE id = ?').bind(id).first()
    if (!existing) throw new BriefError(`No action with id ${id}`)
    throw new BriefError(`Action ${id} is already ${existing.state}`)
}

export async function pendingCount(db) {
    const row = await db.prepare(`SELECT COUNT(*) AS n FROM brief_actions WHERE state IN ('pending', 'claimed')`).first()
    return row.n
}
