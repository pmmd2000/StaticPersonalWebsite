import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { handleApi } from './api.js'
import { handleAuthorize } from './authorize.js'
import { mcpHandler } from './mcp.js'

// Routes that reach the Worker (see run_worker_first in wrangler.jsonc):
//   /mcp                  MCP endpoint, OAuth-protected (apiHandler)
//   /authorize            owner sign-in + consent page
//   /oauth/token|register token endpoint and dynamic client registration
//   /.well-known/*        OAuth discovery metadata
//   /api/*                public content API + password-protected admin API
// Everything else is the Vue SPA in ./dist.

const defaultHandler = {
    async fetch(request, env) {
        const { pathname } = new URL(request.url)
        if (pathname === '/authorize') return handleAuthorize(request, env)
        if (pathname.startsWith('/api/')) return handleApi(request, env)
        return env.ASSETS.fetch(request)
    }
}

// OAuth binds every token to a canonical resource URL. It is taken from the
// origin the request arrived on (Cloudflare only routes hostnames attached to
// this Worker), so apex, www and localhost each get their own provider and
// nothing about the domain has to be configured.
const providers = new Map()

function getProvider(origin) {
    if (providers.has(origin)) return providers.get(origin)
    const provider = new OAuthProvider({
        apiRoute: '/mcp',
        apiHandler: mcpHandler,
        defaultHandler,
        authorizeEndpoint: '/authorize',
        tokenEndpoint: '/oauth/token',
        clientRegistrationEndpoint: '/oauth/register',
        scopesSupported: ['site', 'offline_access'],
        requiredScopes: ['site'],
        resourceMetadata: {
            resource: `${origin}/mcp`,
            authorization_servers: [origin],
            resource_name: 'parhammonfared.com content'
        },
        clientIdMetadataDocumentEnabled: true
    })
    providers.set(origin, provider)
    return provider
}

export default {
    fetch(request, env, ctx) {
        return getProvider(new URL(request.url).origin).fetch(request, env, ctx)
    }
}
