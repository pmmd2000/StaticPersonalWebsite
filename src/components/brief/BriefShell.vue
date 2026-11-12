<template>
  <div class="brief">
    <p v-if="authed === null" class="shell-msg">Loading…</p>

    <form v-else-if="!authed" class="login" @submit.prevent="login">
      <h1>Morning Brief</h1>
      <p class="muted">Private. Sign in to continue.</p>
      <a v-if="methods.google" class="btn primary" :href="googleUrl">Sign in with Google</a>
      <template v-if="methods.password">
        <label class="field">
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required :autofocus="!methods.google" />
        </label>
        <p v-if="loginError" class="error" role="alert">{{ loginError }}</p>
        <button class="btn" :class="{ primary: !methods.google }" :disabled="busy">
          {{ busy ? 'Signing in…' : methods.google ? 'Sign in with password' : 'Sign in' }}
        </button>
      </template>
    </form>

    <slot v-else />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { admin } from '../../api.js'

const emit = defineEmits(['ready'])

const authed = ref(null)
const methods = ref({ password: true, google: false })
const password = ref('')
const loginError = ref('')
const busy = ref(false)
// Google sends you back to the page you started on.
const googleUrl = admin.googleSignInUrl(location.pathname + location.search)

// The brief has its own look (IBM Plex, light/dark) separate from the site.
const FONT_ID = 'brief-fonts'
let previousBg = ''

onMounted(async () => {
  if (!document.getElementById(FONT_ID)) {
    const link = Object.assign(document.createElement('link'), {
      id: FONT_ID,
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap'
    })
    document.head.appendChild(link)
  }
  previousBg = document.body.style.background
  document.body.classList.add('brief-body')

  try {
    const session = await admin.session()
    authed.value = session.authenticated === true
    if (session.methods) methods.value = session.methods
  } catch {
    authed.value = false
  }
  if (authed.value) emit('ready')
})

onBeforeUnmount(() => {
  document.body.classList.remove('brief-body')
  document.body.style.background = previousBg
})

async function login() {
  busy.value = true
  loginError.value = ''
  try {
    await admin.login(password.value)
    password.value = ''
    authed.value = true
    emit('ready')
  } catch (err) {
    loginError.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<style>
/* Theme tokens for every brief page. Light by default, dark when the system is. */
.brief {
  --b-bg: #f6f5f2;
  --b-surface: #ffffff;
  --b-sunken: #efede8;
  --b-ink: #1b1d1f;
  --b-muted: #5f646b;
  --b-faint: #8b9098;
  --b-line: #e2dfd8;
  --b-accent: #c2410c;
  --b-accent-wash: #fdeee6;
  --b-ok: #15803d;
  --b-ok-wash: #e7f6ec;
  --b-warn: #a16207;
  --b-warn-wash: #fdf5df;
  --b-bad: #b91c1c;
  --b-bad-wash: #fdeceb;
  --b-info: #1d4ed8;
  --b-info-wash: #e8eefd;
  --b-shadow: 0 1px 2px rgba(20, 20, 20, 0.05), 0 8px 24px -16px rgba(20, 20, 20, 0.25);
  --b-sans: 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --b-mono: 'IBM Plex Mono', ui-monospace, monospace;

  min-height: 100vh;
  background: var(--b-bg);
  color: var(--b-ink);
  font: 400 15px/1.55 var(--b-sans);
}

@media (prefers-color-scheme: dark) {
  .brief {
    --b-bg: #111315;
    --b-surface: #1a1d20;
    --b-sunken: #15181a;
    --b-ink: #eceef0;
    --b-muted: #a3a9b0;
    --b-faint: #7c838b;
    --b-line: #2b2f34;
    --b-accent: #fb923c;
    --b-accent-wash: #3a2416;
    --b-ok: #4ade80;
    --b-ok-wash: #15301f;
    --b-warn: #fbbf24;
    --b-warn-wash: #33290f;
    --b-bad: #f87171;
    --b-bad-wash: #3a1818;
    --b-info: #93c5fd;
    --b-info-wash: #172437;
    --b-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -16px rgba(0, 0, 0, 0.6);
  }
}

body.brief-body {
  background: #f6f5f2;
}

@media (prefers-color-scheme: dark) {
  body.brief-body {
    background: #111315;
  }
}

.brief a {
  color: var(--b-info);
}

.brief .muted {
  color: var(--b-muted);
}

.brief .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--b-line);
  border-radius: 8px;
  background: var(--b-surface);
  color: var(--b-ink);
  font: 500 13.5px var(--b-sans);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.brief .btn:hover {
  border-color: var(--b-faint);
}

.brief a.btn {
  text-decoration: none;
}

.brief .btn.primary {
  background: var(--b-ink);
  border-color: var(--b-ink);
  color: var(--b-bg);
}

.brief .btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.brief .field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--b-muted);
}

.brief input,
.brief textarea {
  font: 400 15px var(--b-sans);
  color: var(--b-ink);
  background: var(--b-surface);
  border: 1px solid var(--b-line);
  border-radius: 8px;
  padding: 8px 10px;
}

.brief input:focus,
.brief textarea:focus,
.brief .btn:focus-visible {
  outline: 2px solid var(--b-info);
  outline-offset: 1px;
}
</style>

<style scoped>
.shell-msg {
  padding: 40px 20px;
  text-align: center;
  color: var(--b-muted);
}

.login {
  max-width: 360px;
  margin: 0 auto;
  padding: 18vh 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
}

.login p {
  margin: 0;
}

.error {
  color: var(--b-bad);
  font-size: 14px;
}
</style>
