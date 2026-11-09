import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import * as content from './content.js'
import * as brief from './brief.js'
import { briefInputs } from './brief-schema.js'

const httpUrl = z.string().url().describe('http(s) URL')

const newsShape = {
    title: z.string().min(1).describe('Headline of the article'),
    url: httpUrl.describe('Link to the article'),
    source: z.string().optional().describe('Publication or site name, e.g. "The Verge"'),
    summary: z.string().optional().describe('A sentence or two on what it is and why it was worth sharing'),
    image_url: httpUrl.optional().describe('Optional cover image'),
    published_at: z.string().optional().describe('Article publish date, ISO 8601 (YYYY-MM-DD)')
}

const hobbyShape = {
    name: z.string().min(1).describe('Name of the hobby'),
    description: z.string().optional().describe('A short paragraph about it'),
    icon: z.string().optional().describe('A single emoji to represent it'),
    image_url: httpUrl.optional().describe('Optional cover image, shown at 2:1 (e.g. 1200x600). A GitHub repo social preview (opengraph.githubassets.com) fits exactly; other ratios are center-cropped'),
    link: httpUrl.optional().describe('Optional related link (profile, gallery, ...)'),
    sort_order: z.number().int().optional().describe('Lower numbers show first; defaults to 0')
}

const partial = (shape) => Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, v.optional()]))

const result = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })

const failure = (message) => ({ isError: true, content: [{ type: 'text', text: message }] })

async function run(fn) {
    try {
        return await fn()
    } catch (err) {
        if (err instanceof content.ValidationError || err instanceof brief.BriefError) return failure(err.message)
        throw err
    }
}

function buildServer(env) {
    const server = new McpServer(
        { name: 'parhammonfared.com', version: '1.0.0' },
        {
            instructions:
                "Manages Parham Monfared's personal website: the news list (newest first; the home page shows " +
                'the latest three), the Hobbies & Projects list, and his private Morning Brief. ' +
                "Morning Brief loop: publish_brief pushes the day's run and items (upserted by item_key; Parham's " +
                'status, note and reschedule are never overwritten and are returned, so closed items can be dropped). ' +
                'get_item_states checks earlier decisions, e.g. key_prefix "chat:" with statuses ["wont_do","done"] so ' +
                'declined chat promises are not resurfaced. list_pending_actions claims the decisions he saved on ' +
                '/brief; apply each in the real tool (TickTick, Google Calendar, ...) and call report_action_result. ' +
                'Changes are live immediately.'
        }
    )

    const crud = (kind, singular, shape) => {
        server.registerTool(
            `list_${kind}`,
            { description: `List every ${singular} entry on the site.`, annotations: { readOnlyHint: true } },
            async () => result(await content.list(env.DB, kind))
        )
        server.registerTool(
            `add_${singular}`,
            { description: `Add a ${singular} entry to the site.`, inputSchema: shape },
            async (args) => run(async () => result(await content.create(env.DB, kind, args)))
        )
        server.registerTool(
            `update_${singular}`,
            {
                description: `Change fields of an existing ${singular} entry. Only the fields given are changed.`,
                inputSchema: { id: z.number().int().describe(`id from list_${kind}`), ...partial(shape) },
                annotations: { idempotentHint: true }
            },
            async ({ id, ...fields }) =>
                run(async () => {
                    const row = await content.update(env.DB, kind, id, fields)
                    return row ? result(row) : failure(`No ${singular} with id ${id}`)
                })
        )
        server.registerTool(
            `delete_${singular}`,
            {
                description: `Permanently delete a ${singular} entry.`,
                inputSchema: { id: z.number().int().describe(`id from list_${kind}`) },
                annotations: { destructiveHint: true }
            },
            async ({ id }) =>
                (await content.remove(env.DB, kind, id))
                    ? result({ deleted: id })
                    : failure(`No ${singular} with id ${id}`)
        )
    }

    crud('news', 'news', newsShape)
    crud('hobbies', 'hobby', hobbyShape)

    server.registerTool(
        'list_contact_messages',
        {
            description: 'Read messages people sent through the "Contact me" form, newest first.',
            inputSchema: { limit: z.number().int().min(1).max(500).optional() },
            annotations: { readOnlyHint: true }
        },
        async ({ limit }) => result(await content.listContacts(env.DB, { limit }))
    )

    // Morning Brief
    server.registerTool(
        'publish_brief',
        {
            description:
                "Store today's Morning Brief: creates a run and upserts every item by item_key. Only descriptive " +
                'fields are updated on existing items; status, user_note and rescheduled_to set by Parham are kept. ' +
                'Returns each pushed item with its stored status and note.',
            inputSchema: briefInputs.publish
        },
        async ({ run: r, items }) => run(async () => result(await brief.publishBrief(env.DB, r, items)))
    )
    server.registerTool(
        'get_item_states',
        {
            description:
                "Read Parham's stored decisions on brief items. Filter by exact item_keys, a key_prefix (e.g. " +
                '"chat:" for every chat commitment), statuses, and/or since (status changed at or after).',
            inputSchema: briefInputs.states,
            annotations: { readOnlyHint: true }
        },
        async (args) => run(async () => result({ items: await brief.getItemStates(env.DB, args) }))
    )
    server.registerTool(
        'list_pending_actions',
        {
            description:
                'Atomically claim the actions Parham saved on /brief (oldest first) and return them with their item, ' +
                'including source_ref. Report each with report_action_result; claims not reported within 30 minutes ' +
                'go back to pending.',
            inputSchema: briefInputs.pending
        },
        async ({ limit }) => run(async () => result({ actions: await brief.claimPending(env.DB, limit) }))
    )
    server.registerTool(
        'report_action_result',
        {
            description:
                'Report what happened when applying a claimed action: applied, failed (say why in message) or ' +
                'skipped. Shown to Parham on the brief page.',
            inputSchema: briefInputs.report
        },
        async ({ action_id, state, message }) =>
            run(async () => result(await brief.reportResult(env.DB, action_id, state, message)))
    )
    server.registerTool(
        'get_brief',
        {
            description:
                'Read a stored brief: the run for date (YYYY-MM-DD, Europe/London; latest run if omitted) and its ' +
                'items with current status, note and latest action states.',
            inputSchema: briefInputs.get,
            annotations: { readOnlyHint: true }
        },
        async ({ date }) =>
            run(async () => {
                const data = await brief.getBrief(env.DB, date)
                return data ? result(data) : failure(date ? `No brief stored for ${date}` : 'No brief stored yet')
            })
    )

    return server
}

// Stateless Streamable HTTP: a fresh server per request, JSON responses, no
// session affinity needed — fits Workers without Durable Objects.
export const mcpHandler = {
    async fetch(request, env) {
        const transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true
        })
        await buildServer(env).connect(transport)
        return transport.handleRequest(request)
    }
}
