# parhammonfared.com

Personal site: a hero (name, links, intro), the latest three tech news items I liked, and my hobbies. Content lives in Cloudflare D1 and is managed through an OAuth-protected **MCP server**, with a small `/admin` page as a fallback.

## Layout

| Path | What |
| --- | --- |
| `src/pages/` | Vue routes: `/`, `/news`, `/hobbies`, `/admin` |
| `src/components/` | Hero, news list, hobby grid, contact dialog, footer |
| `src/worker/index.js` | Worker entry: wires the OAuth provider, MCP, API and SPA assets |
| `src/worker/mcp.js` | MCP tools (stateless Streamable HTTP at `/mcp`) |
| `src/worker/authorize.js` | OAuth sign-in + consent page at `/authorize` |
| `src/worker/api.js` | Public content API, contact form, admin API |
| `src/worker/content.js` | Shared data layer (validation + SQL) used by MCP and admin |
| `migrations/` | D1 schema, applied by `npm run deploy` |

## MCP server

Endpoint: `https://parhammonfared.com/mcp` (any hostname routed to the Worker works; OAuth is bound to the one you use). Add it as a remote MCP server in any client (Claude, Cursor, VS Code, …). The client discovers OAuth via `/.well-known/oauth-protected-resource/mcp`, registers itself (Dynamic Client Registration or Client ID Metadata Documents), and sends you to `/authorize`, where you sign in with the admin password and approve it.

Tools: `list_news`, `add_news`, `update_news`, `delete_news`, `list_hobbies`, `add_hobby`, `update_hobby`, `delete_hobby`, `list_contact_messages`.

## Deployment

Cloudflare's Git integration (Workers Builds) deploys `main` to production and uploads a preview version for every other branch. GitHub Actions only runs `CI` (build + Worker dry-run) on pushes and PRs; merging to `main` is the approval step.

Workers Builds settings (Cloudflare dashboard → Worker → Settings → Build):

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` (builds, applies pending D1 migrations, deploys) |
| Non-production branch deploy command | `npx wrangler versions upload` (default; previews never run migrations) |

Runtime secret, set once: `npx wrangler secret put ADMIN_PASSWORD` (long random value; it unlocks `/admin` and the MCP OAuth sign-in, and rotating it signs out every admin session). The current value is in Bitwarden as "parhammonfared.com admin".

## Local development

```bash
npm install
echo "ADMIN_PASSWORD=change-me" > .dev.vars
npm run dev        # builds, migrates the local D1, serves on http://localhost:8787
npm run dev:ui     # optional: Vite hot reload on :5173, proxying the Worker
```
