# parhammonfared.com

Personal site: a hero (name, links, intro), the latest three tech news items I liked, and my hobbies. Content lives in Cloudflare D1 and is managed through an OAuth-protected **MCP server**, with a small `/admin` page as a fallback.

## Layout

| Path | What |
| --- | --- |
| `src/pages/` | Vue routes: `/`, `/news`, `/hobbies`, `/admin`, `/brief` (private Morning Brief) |
| `src/components/` | Hero, news list, hobby grid, contact pill, footer; `brief/` holds the Morning Brief UI |
| `src/worker/index.js` | Worker entry: wires the OAuth provider, MCP, API and SPA assets |
| `src/worker/mcp.js` | MCP tools (stateless Streamable HTTP at `/mcp`) |
| `src/worker/authorize.js` | OAuth sign-in + consent page at `/authorize` |
| `src/worker/api.js` | Public content API, admin API, Morning Brief API |
| `src/worker/brief.js` | Morning Brief data layer (publish, states, claim queue, saves) |
| `src/worker/session.js` | Owner sign-in: password hash, sessions, CSRF, login lockout |
| `src/worker/content.js` | Shared data layer (validation + SQL) used by MCP and admin |
| `migrations/` | D1 schema, applied by `npm run deploy` |

## MCP server

Endpoint: `https://parhammonfared.com/mcp` (any hostname routed to the Worker works; OAuth is bound to the one you use). Add it as a remote MCP server in any client (Claude, Cursor, VS Code, …). The client discovers OAuth via `/.well-known/oauth-protected-resource/mcp`, registers itself (Dynamic Client Registration or Client ID Metadata Documents), and sends you to `/authorize`, where you sign in with the admin password and approve it.

Tools: `list_news`, `add_news`, `update_news`, `delete_news`, `list_hobbies`, `add_hobby`, `update_hobby`, `delete_hobby`, `list_contact_messages`, and the Morning Brief tools `publish_brief`, `get_item_states`, `list_pending_actions`, `report_action_result`, `get_brief` (see [docs/morning-brief.md](docs/morning-brief.md)).

## Deployment

Cloudflare's Git integration (Workers Builds) deploys `main` to production and uploads a preview version for every other branch. GitHub Actions only runs `CI` (build + Worker dry-run) on pushes and PRs; merging to `main` is the approval step.

Workers Builds settings (Cloudflare dashboard → Worker → Settings → Build):

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` (builds, applies pending D1 migrations, deploys) |
| Non-production branch deploy command | `npx wrangler versions upload` (default; previews never run migrations) |

Sign-in password (unlocks `/admin`, `/brief` and the MCP OAuth sign-in): store it as a hash with `npm run hash-password`, then `npx wrangler secret put ADMIN_PASSWORD_HASH`. The older plain `ADMIN_PASSWORD` secret still works until it is deleted. The current password is in Bitwarden as "parhammonfared.com admin". Other optional secrets are listed in [docs/morning-brief.md](docs/morning-brief.md).

## Local development

```bash
npm install
echo "ADMIN_PASSWORD=change-me" > .dev.vars   # or ADMIN_PASSWORD_HASH=... from npm run hash-password
npm run dev        # builds, migrates the local D1, serves on http://localhost:8787
npm run dev:ui     # optional: Vite hot reload on :5173, proxying the Worker
```
