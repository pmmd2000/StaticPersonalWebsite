<template>
  <main class="container admin">
    <header class="admin-head">
      <RouterLink to="/" class="back-link">← Site</RouterLink>
      <button v-if="authed" class="pill" @click="logout">Sign out</button>
    </header>

    <p v-if="authed === null" class="muted">Loading…</p>

    <!-- Sign in -->
    <form v-else-if="!authed" class="card stack login" @submit.prevent="login">
      <h1>Admin</h1>
      <input v-model="password" type="password" class="form-input" placeholder="Password" autocomplete="current-password" required autofocus />
      <p v-if="loginError" class="status-message error">{{ loginError }}</p>
      <button class="submit-button">Sign in</button>
    </form>

    <template v-else>
      <p class="muted mcp-hint">
        MCP endpoint: <code>{{ mcpUrl }}</code> — add it as a remote MCP server in any client; it signs in with this password via OAuth.
      </p>

      <nav class="tabs">
        <button v-for="t in tabs" :key="t.key" class="tab" :class="{ active: tab === t.key }" @click="switchTab(t.key)">
          {{ t.label }}
        </button>
      </nav>

      <!-- Contact messages -->
      <section v-if="tab === 'contacts'">
        <p v-if="!contacts.length" class="empty">No messages yet.</p>
        <article v-for="c in contacts" :key="c.id" class="card message">
          <p class="muted">{{ c.name }} · <a :href="`mailto:${c.email}`">{{ c.email }}</a> · {{ formatDate(c.created_at) }}</p>
          <p class="pre">{{ c.message }}</p>
        </article>
      </section>

      <!-- News / hobbies -->
      <section v-else class="editor">
        <form class="card stack" @submit.prevent="save">
          <h2>{{ editingId ? 'Edit' : 'Add' }} {{ current.singular }}</h2>
          <div v-for="f in current.fields" :key="f.key" class="form-group">
            <label class="form-label" :for="f.key">{{ f.label }}<span v-if="f.required"> *</span></label>
            <textarea v-if="f.type === 'textarea'" :id="f.key" v-model="draft[f.key]" class="form-textarea" />
            <input v-else :id="f.key" v-model="draft[f.key]" :type="f.type || 'text'" class="form-input" :required="f.required" />
          </div>
          <p v-if="formError" class="status-message error">{{ formError }}</p>
          <div class="row">
            <button class="submit-button">{{ editingId ? 'Save changes' : 'Add' }}</button>
            <button v-if="editingId" type="button" class="pill" @click="resetDraft">Cancel</button>
          </div>
        </form>

        <div class="stack">
          <p v-if="!rows.length" class="empty">Nothing yet.</p>
          <article v-for="row in rows" :key="row.id" class="card row-item">
            <div class="row-text">
              <strong>{{ row.icon ? row.icon + ' ' : '' }}{{ row.title || row.name }}</strong>
              <span class="muted">{{ row.source || row.description || '' }}</span>
            </div>
            <div class="row">
              <button class="pill" @click="edit(row)">Edit</button>
              <button class="pill danger" @click="remove(row)">Delete</button>
            </div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { admin, formatDate } from '../api.js'

const SCHEMAS = {
  news: {
    singular: 'news item',
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'url', label: 'Article URL', type: 'url', required: true },
      { key: 'source', label: 'Source' },
      { key: 'summary', label: 'Why I liked it', type: 'textarea' },
      { key: 'image_url', label: 'Image URL', type: 'url' },
      { key: 'published_at', label: 'Published', type: 'date' }
    ]
  },
  hobbies: {
    singular: 'hobby',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'icon', label: 'Emoji' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'image_url', label: 'Image URL', type: 'url' },
      { key: 'link', label: 'Link', type: 'url' },
      { key: 'sort_order', label: 'Sort order (lower first)', type: 'number' }
    ]
  }
}

const tabs = [
  { key: 'news', label: 'News' },
  { key: 'hobbies', label: 'Hobbies' },
  { key: 'contacts', label: 'Messages' }
]

const authed = ref(null)
const password = ref('')
const loginError = ref('')
const tab = ref('news')
const rows = ref([])
const contacts = ref([])
const draft = reactive({})
const editingId = ref(null)
const formError = ref('')

const current = computed(() => SCHEMAS[tab.value])
const mcpUrl = `${location.origin}/mcp`

onMounted(async () => {
  authed.value = (await admin.session().catch(() => ({}))).authenticated === true
  if (authed.value) load()
})

async function login() {
  loginError.value = ''
  try {
    await admin.login(password.value)
    password.value = ''
    authed.value = true
    load()
  } catch (err) {
    loginError.value = err.message
  }
}

async function logout() {
  await admin.logout()
  authed.value = false
}

function switchTab(key) {
  tab.value = key
  resetDraft()
  load()
}

async function load() {
  if (tab.value === 'contacts') contacts.value = await admin.contacts()
  else rows.value = await admin.list(tab.value)
}

function resetDraft() {
  for (const key of Object.keys(draft)) delete draft[key]
  editingId.value = null
  formError.value = ''
}

function edit(row) {
  resetDraft()
  for (const f of current.value.fields) draft[f.key] = row[f.key] ?? ''
  editingId.value = row.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function save() {
  formError.value = ''
  try {
    if (editingId.value) await admin.update(tab.value, editingId.value, { ...draft })
    else await admin.create(tab.value, { ...draft })
    resetDraft()
    load()
  } catch (err) {
    formError.value = err.message
  }
}

async function remove(row) {
  if (!confirm(`Delete "${row.title || row.name}"?`)) return
  await admin.remove(tab.value, row.id)
  load()
}
</script>

<style scoped>
.admin {
  padding-top: 28px;
  padding-bottom: 80px;
}

.admin-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 20px;
}

.card h1,
.card h2 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.6rem;
  letter-spacing: -0.02em;
}

.login {
  max-width: 380px;
  margin: 10vh auto 0;
}

.muted {
  color: var(--muted);
}

.mcp-hint {
  font-size: 14px;
  word-break: break-all;
}

code {
  color: var(--accent);
  font-family: var(--font-mono);
}

.tabs {
  display: flex;
  gap: 6px;
  margin: 18px 0 24px;
  border-bottom: 1px solid var(--line);
}

.tab {
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 10px 14px;
  color: var(--muted);
  font: 500 0.85rem var(--font-mono);
  letter-spacing: 0.04em;
  min-height: 44px;
  cursor: pointer;
}

.tab.active {
  color: var(--fg);
  border-bottom-color: var(--accent);
}

.editor {
  display: grid;
  grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

@media (max-width: 820px) {
  .editor {
    grid-template-columns: 1fr;
  }
}

.row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.row .submit-button {
  flex: 1;
}

.row-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.row-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.row-text .muted {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message {
  margin-bottom: 12px;
}

.message p {
  margin: 0 0 8px;
}

.pre {
  white-space: pre-wrap;
}
</style>
