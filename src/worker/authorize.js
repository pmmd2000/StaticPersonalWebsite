import { AuthorizationError, CimdFetchError } from '@cloudflare/workers-oauth-provider'
import { checkPassword, createSessionCookie, hasSession } from './session.js'

// The /authorize endpoint: sign the owner in (same password as /admin), then
// ask whether the MCP client may manage the site.

const OWNER = 'owner'

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function page(title, body, headers = new Headers(), status = 200) {
    headers.set('Content-Type', 'text/html; charset=utf-8')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('Content-Security-Policy', "frame-ancestors 'none'")
    return new Response(
        `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<style>
  :root { color-scheme: dark; --bg:#07070a; --card:#111117; --line:#24242e; --fg:#eceaf2; --muted:#9a98a8; --accent:#c8344a; }
  * { box-sizing: border-box }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--bg); color:var(--fg);
         font: 15px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; padding:16px }
  .card { width:100%; max-width:420px; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:28px }
  h1 { font-size:20px; margin:0 0 12px }
  p { color:var(--muted); margin:0 0 14px }
  strong { color:var(--fg) }
  .warn { color:#f0b35a }
  .err { color:#ff7b8a }
  input[type=password] { width:100%; padding:10px 12px; border-radius:10px; border:1px solid var(--line); background:#0b0b10; color:var(--fg); font:inherit; margin-bottom:14px }
  label.scope { display:block; color:var(--fg); margin-bottom:8px }
  .row { display:flex; gap:10px; margin-top:18px }
  button { flex:1; padding:10px 14px; border-radius:10px; border:1px solid var(--line); background:transparent; color:var(--fg); font:inherit; cursor:pointer }
  button.primary { background:var(--accent); border-color:var(--accent) }
</style></head>
<body><main class="card">${body}</main></body></html>`,
        { status, headers }
    )
}

function loginPage(error) {
    return page(
        'Sign in',
        `<h1>Sign in to authorize</h1>
<p>An app wants to manage this website's content. Sign in as the site owner to continue.</p>
${error ? `<p class="err">${escape(error)}</p>` : ''}
<form method="post">
  <input type="hidden" name="action" value="login">
  <input type="password" name="password" placeholder="Admin password" autocomplete="current-password" required autofocus>
  <div class="row"><button class="primary">Continue</button></div>
</form>`,
        new Headers(),
        error ? 401 : 200
    )
}

function consentPage(details, consent) {
    const name = escape(details.clientName || 'An unnamed app')
    const origin = details.clientDomain
        ? `Published by <strong>${escape(details.clientDomain)}</strong>.`
        : 'This app registered itself; its name is not verified.'
    const scopes = details.scope
        .map((s) => `<label class="scope"><input type="checkbox" name="scope" value="${escape(s)}" checked> ${escape(s)}</label>`)
        .join('')
    return page(
        `Authorize ${details.clientName || 'app'}`,
        `<h1>Allow ${name} to manage this site?</h1>
<p>${origin} Access will be sent to <strong>${escape(details.redirectHost)}</strong>.</p>
${details.redirectIsLoopback ? '<p class="warn">This sends access to an app on your computer. Continue only if you just started signing in from it.</p>' : ''}
<p>It will be able to add, edit and delete news and hobbies, and read contact messages.</p>
<form method="post">
  <input type="hidden" name="action" value="consent">
  <input type="hidden" name="handle" value="${escape(consent.handle)}">
  ${scopes}
  <div class="row">
    <button name="decision" value="deny">Deny</button>
    <button name="decision" value="approve" class="primary">Allow</button>
  </div>
</form>`,
        consent.headers
    )
}

export async function handleAuthorize(request, env) {
    const oauth = env.OAUTH_PROVIDER
    try {
        if (request.method === 'GET') {
            if (!(await hasSession(request, env))) return loginPage()
            const authRequest = await oauth.parseAuthRequest(request)
            const details = await oauth.describeConsent(authRequest)
            const consent = await oauth.beginConsent(authRequest)
            return consentPage(details, consent)
        }

        if (request.method === 'POST') {
            const form = await request.formData()

            if (form.get('action') === 'login') {
                if (!(await checkPassword(env, form.get('password')))) return loginPage('Wrong password.')
                // Back to the same /authorize URL (query intact), now with a session.
                return new Response(null, {
                    status: 303,
                    headers: { Location: request.url, 'Set-Cookie': await createSessionCookie(env) }
                })
            }

            if (!(await hasSession(request, env))) return loginPage('Your session expired, sign in again.')
            const handle = String(form.get('handle') || '')
            if (form.get('decision') !== 'approve') {
                const denied = await oauth.denyConsent(request, handle)
                return new Response(null, { status: 302, headers: denied.headers })
            }
            const approved = await oauth.approveConsent(request, handle, { scope: form.getAll('scope').map(String) })
            const { redirectTo } = await oauth.completeAuthorization({
                request: approved.request,
                userId: OWNER,
                metadata: { label: 'Site owner' },
                scope: approved.request.scope,
                props: { userId: OWNER }
            })
            approved.headers.set('Location', redirectTo)
            return new Response(null, { status: 302, headers: approved.headers })
        }

        return new Response('Method not allowed', { status: 405 })
    } catch (error) {
        if (error instanceof AuthorizationError && error.redirectTo) {
            return Response.redirect(error.redirectTo, 302)
        }
        if (error instanceof AuthorizationError || error instanceof CimdFetchError) {
            const message = error instanceof AuthorizationError ? error.description : 'This app could not be verified.'
            return page('Authorization failed', `<h1>Authorization failed</h1><p>${escape(message)}</p>`, new Headers(), 400)
        }
        throw error
    }
}
