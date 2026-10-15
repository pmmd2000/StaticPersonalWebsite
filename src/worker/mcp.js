import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import * as content from './content.js'

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
        if (err instanceof content.ValidationError) return failure(err.message)
        throw err
    }
}

function buildServer(env) {
    const server = new McpServer(
        { name: 'parhammonfared.com', version: '1.0.0' },
        {
            instructions:
                "Manages the content of Parham Monfared's personal website: the 'tech news I liked' list " +
                '(newest first; the home page shows the latest three) and the hobbies list. ' +
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
