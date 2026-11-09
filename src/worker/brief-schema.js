// Input schemas for the Morning Brief, used by the MCP tools (and the page's
// save endpoint). Everything gathered is untrusted text: cap sizes, never trust
// structure.

import { z } from 'zod'
import { ACTION_STATES, SECTIONS, STATUSES } from './brief.js'

// Byte cap (UTF-8): Persian text is 2 bytes a letter, so a character cap would undercount.
const maxBytes = (schema, max, what) =>
    schema.refine((s) => new TextEncoder().encode(s).length <= max, { message: `${what} is over ${max} bytes` })
const text = (max) => z.string().max(max)
const isoTime = z.iso.datetime({ offset: true })
const isoDate = z.iso.date()

const ITEM_KEY = /^(ticktick|gcal|gmail|chat|fitness|note):\S{1,280}$/

export const itemKey = z
    .string()
    .regex(ITEM_KEY, 'item_key must look like ticktick:<id>, gcal:<cal>:<event>, gmail:<thread>, chat:<platform>:<chat>:<msg>, fitness:<id> or note:<uuid>')
    .describe('Stable key built by Claude, e.g. "ticktick:<taskId>" or "chat:whatsapp:<chatId>:<messageId>"')

const scalar = z.union([z.string().max(500), z.number(), z.boolean(), z.null()])

const item = z.object({
    item_key: itemKey,
    section: z.enum(SECTIONS).describe('dont_miss | waiting | unopened | closed'),
    source_app: z.enum(['ticktick', 'gcal', 'gmail', 'whatsapp', 'telegram', 'fitness', 'other']),
    source_account: text(120).optional().describe('e.g. "UK WhatsApp", "Telegram · parham_mnd"'),
    source_ref: z
        .record(z.string().max(60), scalar)
        .refine((v) => JSON.stringify(v).length <= 2048, 'source_ref is over 2 KB')
        .optional()
        .describe('Ids needed to act on it, e.g. {"projectId":"...","taskId":"..."} or {"calendarId":"...","eventId":"..."}'),
    kind: z.enum(['task', 'event', 'commitment', 'chat', 'workout', 'email']),
    title: z.string().min(1).max(300),
    body: maxBytes(z.string(), 4096, 'body').optional().describe('One sentence of prose (max 4 KB)'),
    quotes: z
        .array(maxBytes(z.string(), 2000, 'quote'))
        .max(10)
        .optional()
        .describe('Verbatim quotes; may be Persian (rendered with dir="auto")'),
    pills: z
        .array(z.object({ type: text(40), label: text(120).optional() }))
        .max(10)
        .optional()
        .describe('e.g. [{"type":"linked","label":"Linked: TickTick + Payam"},{"type":"clash"}]'),
    time_label: text(80).optional().describe('e.g. "Today 09:00", "Overdue"'),
    due_at: isoTime.nullable().optional(),
    person: text(120).nullable().optional(),
    waited_days: z.number().int().min(0).max(3650).nullable().optional(),
    unread_count: z.number().int().min(0).max(100000).nullable().optional()
})

const forecastEntry = z.object({
    title: z.string().min(1).max(200),
    start: isoTime,
    end: isoTime.optional(),
    all_day: z.boolean().optional(),
    calendar: text(80).optional(),
    kind: z.enum(['event', 'task', 'workout', 'other']).default('event')
})

const run = z.object({
    brief_date: isoDate.describe('YYYY-MM-DD, Europe/London'),
    generated_at: isoTime,
    checked_label: text(80).optional().describe('e.g. "Checked 06:25 UK"'),
    summary: z
        .array(z.object({ label: text(40), value: z.union([z.number(), text(20)]), hint: text(80).optional() }))
        .max(8)
        .optional()
        .describe('Summary tiles; the page shows the first four'),
    forecast: z
        .array(z.object({ date: isoDate, entries: z.array(forecastEntry).max(60) }))
        .max(7)
        .optional()
        .describe('Upcoming days (the page shows four), each with events/tasks'),
    calendar_sync_lines: z.array(text(300)).max(20).optional()
})

export const briefInputs = {
    publish: { run, items: z.array(item).max(500) },
    states: {
        item_keys: z.array(itemKey).max(2000).optional(),
        key_prefix: z.string().regex(/^[a-z]+:[^\s]{0,200}$/).optional().describe('e.g. "chat:" or "chat:whatsapp:"'),
        statuses: z.array(z.enum(STATUSES)).max(5).optional(),
        since: isoTime.optional().describe('Only items whose status changed at or after this time'),
        limit: z.number().int().min(1).max(5000).optional()
    },
    pending: { limit: z.number().int().min(1).max(200).default(50) },
    report: {
        action_id: z.number().int().positive(),
        state: z.enum(ACTION_STATES.filter((s) => ['applied', 'failed', 'skipped'].includes(s))),
        message: z.string().max(1000).optional()
    },
    get: { date: isoDate.optional() }
}

// Body of POST /api/brief/actions from the page.
export const saveSchema = z.object({
    changes: z
        .array(
            z.discriminatedUnion('action', [
                z.object({ item_key: itemKey, action: z.literal('done'), payload: z.object({}).optional() }),
                z.object({ item_key: itemKey, action: z.literal('wont_do'), payload: z.object({}).optional() }),
                z.object({ item_key: itemKey, action: z.literal('reopen'), payload: z.object({}).optional() }),
                z.object({
                    item_key: itemKey,
                    action: z.literal('reschedule'),
                    payload: z.object({
                        to: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
                        tz: z.literal('Europe/London'),
                        to_utc: isoTime
                    })
                }),
                z.object({
                    item_key: itemKey,
                    action: z.literal('note'),
                    payload: z.object({ note: z.string().max(4000) })
                })
            ])
        )
        .min(1)
        .max(300)
})
