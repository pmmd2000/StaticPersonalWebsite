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

// The provider is bound to the canonical site URL, which only exists at
// request time (env), so build it once per origin and reuse it.
let provider = null
let providerOrigin = null

function getProvider(env) {
    const origin = new URL(env.SITE_URL).origin
    if (provider && providerOrigin === origin) return provider
    provider = new OAuthProvider({
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
    providerOrigin = origin
    return provider
}

export default {
    fetch(request, env, ctx) {
        return getProvider(env).fetch(request, env, ctx)
    }
}
