<template>
  <BriefShell @ready="load">
    <main class="page">
      <header class="head">
        <div>
          <p class="kicker">Morning Brief</p>
          <h1 v-if="run">{{ longDate(run.brief_date) }}</h1>
          <h1 v-else-if="loaded">No brief yet</h1>
        </div>
        <div class="head-side">
          <span v-if="run?.checked_label" class="stamp">{{ run.checked_label }}</span>
          <nav class="head-nav" aria-label="Brief">
            <RouterLink v-if="route.params.date" to="/brief">Latest</RouterLink>
            <RouterLink to="/brief/history">History</RouterLink>
          </nav>
        </div>
      </header>

      <p v-if="loadError" class="banner bad" role="alert">{{ loadError }}</p>

      <p v-if="loaded && !run" class="empty">
        Nothing stored{{ route.params.date ? ` for ${route.params.date}` : '' }} yet. Claude publishes the brief here every
        morning at 06:00 UK.
      </p>

      <template v-if="run">
        <details v-if="run.calendar_sync_lines.length" class="sync">
          <summary>Calendar sync · {{ run.calendar_sync_lines.length }} line{{ run.calendar_sync_lines.length === 1 ? '' : 's' }}</summary>
          <p v-for="(line, i) in run.calendar_sync_lines" :key="i" dir="auto">{{ line }}</p>
        </details>

        <ul v-if="tiles.length" class="tiles">
          <li v-for="(tile, i) in tiles" :key="i">
            <span class="t-value">{{ tile.value }}</span>
            <span class="t-label">{{ tile.label }}</span>
            <span v-if="tile.hint" class="t-hint">{{ tile.hint }}</span>
          </li>
        </ul>

        <section v-for="section in sections" :key="section.id" class="section" :aria-labelledby="`h-${section.id}`">
          <h2 :id="`h-${section.id}`">
            {{ section.title }} <span class="count">{{ section.active.length }}</span>
          </h2>
          <p v-if="!section.active.length && !section.handled.length" class="none">Nothing here.</p>

          <div class="list">
            <BriefItem
              v-for="item in section.active"
              :key="item.item_key"
              :item="item"
              :staged="staged[item.item_key] || null"
              :interactive="section.interactive && editable"
              :compact="section.id === 'closed'"
              @change="(c) => stage(item, c)"
            />
          </div>

          <details v-if="section.handled.length" class="handled" :open="section.handledOpen">
            <summary>Handled · {{ section.handled.length }}</summary>
            <div class="list">
              <BriefItem
                v-for="item in section.handled"
                :key="item.item_key"
                :item="item"
                :staged="staged[item.item_key] || null"
                :interactive="editable"
                compact
                @change="(c) => stage(item, c)"
              />
            </div>
          </details>
        </section>

        <section v-if="run.forecast.length" class="section" aria-labelledby="h-forecast">
          <h2 id="h-forecast">Next four days</h2>
          <BriefForecast :days="run.forecast" />
        </section>
      </template>
    </main>

    <!-- Sticky save bar: nothing leaves the page until Save -->
    <div v-if="changeCount || saving || saveError" class="savebar" role="region" aria-label="Unsaved changes">
      <span v-if="saveError" class="save-error" role="alert">{{ saveError }}</span>
      <span v-else class="save-count">{{ changeCount }} change{{ changeCount === 1 ? '' : 's' }}</span>
      <button class="btn" type="button" :disabled="saving" @click="discard">Discard</button>
      <button class="btn primary" type="button" :disabled="saving || !changeCount" @click="save">{{ saving ? 'Saving…' : 'Save' }}</button>
    </div>
  </BriefShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { briefApi } from '../api.js'
import { londonInputToUtc, longDate } from '../brief/time.js'
import BriefShell from '../components/brief/BriefShell.vue'
import BriefItem from '../components/brief/BriefItem.vue'
import BriefForecast from '../components/brief/BriefForecast.vue'

const route = useRoute()

const run = ref(null)
const items = ref([])
const loaded = ref(false)
const loadError = ref('')
const staged = reactive({}) // item_key -> { status?, to?, note? }
const saving = ref(false)
const saveError = ref('')

// Past briefs are read-only; decisions are made on the latest one.
const isLatest = ref(true)
const editable = computed(() => isLatest.value)

const SECTION_DEFS = [
  { id: 'dont_miss', title: "Don't miss", interactive: true },
  { id: 'waiting', title: 'Waiting on you', interactive: true },
  { id: 'unopened', title: 'Unopened', interactive: false },
  { id: 'closed', title: 'Closed since the last brief', interactive: false }
]

const STAGED_TO_STATUS = { done: 'done', wont_do: 'wont_do', reschedule: 'rescheduled', reopen: 'open' }
const statusOf = (item) => {
  const s = staged[item.item_key]?.status
  return s ? STAGED_TO_STATUS[s] : item.status
}

const byTime = (a, b) => {
  const ta = a.due_at ? Date.parse(a.due_at) : Infinity
  const tb = b.due_at ? Date.parse(b.due_at) : Infinity
  return ta - tb || a.position - b.position
}

const sections = computed(() =>
  SECTION_DEFS.map((def) => {
    const all = items.value.filter((i) => i.section === def.id)
    if (def.id === 'dont_miss') all.sort(byTime)
    const isHandled = (i) => def.interactive && ['done', 'wont_do'].includes(statusOf(i))
    return {
      ...def,
      active: all.filter((i) => !isHandled(i)),
      handled: all.filter(isHandled),
      handledOpen: all.some((i) => isHandled(i) && staged[i.item_key])
    }
  })
)

const tiles = computed(() => (run.value?.summary || []).slice(0, 4))

// ── loading & polling ────────────────────────────────────

async function load() {
  loadError.value = ''
  try {
    const date = route.params.date || undefined
    const data = await briefApi.get(date)
    run.value = data.run
    items.value = data.items
    if (date) {
      const latest = await briefApi.get()
      isLatest.value = latest.run?.id === data.run?.id
    } else {
      isLatest.value = true
    }
  } catch (err) {
    loadError.value = err.status === 401 ? 'Your session has expired. Reload to sign in again.' : `Couldn't load the brief: ${err.message}`
  } finally {
    loaded.value = true
  }
}

const hasPending = computed(() => items.value.some((i) => (i.actions || []).some((a) => a.state === 'pending' || a.state === 'claimed')))

let poll = 0
watch(hasPending, (pending) => {
  clearInterval(poll)
  if (pending) poll = setInterval(load, 30_000)
})
watch(() => route.params.date, () => {
  discard()
  load()
})
onBeforeUnmount(() => clearInterval(poll))

// ── staging ──────────────────────────────────────────────

function stage(item, change) {
  if (!change) {
    delete staged[item.item_key]
    return
  }
  const next = {}
  if (change.status) {
    const same =
      (change.status === 'reopen' && item.status === 'open') ||
      (change.status !== 'reschedule' && change.status !== 'reopen' && STAGED_TO_STATUS[change.status] === item.status)
    if (!same) next.status = change.status
    if (change.status === 'reschedule') next.to = change.to
  }
  if (change.note !== undefined && change.note !== (item.user_note || '')) next.note = change.note
  if (Object.keys(next).length) staged[item.item_key] = next
  else delete staged[item.item_key]
}

const changeCount = computed(() =>
  Object.values(staged).reduce((n, s) => n + (s.status ? 1 : 0) + (s.note !== undefined ? 1 : 0), 0)
)

function discard() {
  for (const key of Object.keys(staged)) delete staged[key]
  saveError.value = ''
}

function buildChanges() {
  const changes = []
  for (const [item_key, s] of Object.entries(staged)) {
    if (s.status === 'reschedule') {
      changes.push({ item_key, action: 'reschedule', payload: { to: s.to, tz: 'Europe/London', to_utc: londonInputToUtc(s.to) } })
    } else if (s.status) {
      changes.push({ item_key, action: s.status, payload: {} })
    }
    if (s.note !== undefined) changes.push({ item_key, action: 'note', payload: { note: s.note } })
  }
  return changes
}

async function save() {
  saving.value = true
  saveError.value = ''
  try {
    await briefApi.save(buildChanges())
    discard()
    await load()
  } catch (err) {
    saveError.value = err.status === 401 ? 'Session expired: reload to sign in, your changes are still here.' : err.message
  } finally {
    saving.value = false
  }
}

// Don't lose staged changes by accident.
const warn = (e) => {
  if (changeCount.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', warn))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warn))
onBeforeRouteLeave(() => !changeCount.value || window.confirm('Discard your unsaved changes?'))
</script>

<style scoped>
.page {
  max-width: 920px;
  margin: 0 auto;
  padding: 28px 18px 120px;
}

.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--b-line);
}

.kicker {
  margin: 0;
  font: 500 12px var(--b-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--b-accent);
}

h1 {
  margin: 4px 0 0;
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.head-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.stamp {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--b-sunken);
  font: 500 12.5px var(--b-mono);
  color: var(--b-muted);
}

.head-nav {
  display: flex;
  gap: 14px;
  font-size: 14px;
}

@media (max-width: 560px) {
  .head-side {
    flex-direction: row;
    align-items: center;
    gap: 14px;
  }
}

.banner {
  margin: 16px 0 0;
  padding: 10px 14px;
  border-radius: 10px;
}

.banner.bad {
  background: var(--b-bad-wash);
  color: var(--b-bad);
}

.empty {
  margin: 40px 0;
  color: var(--b-muted);
}

.sync {
  margin-top: 14px;
  font: 400 12.5px var(--b-mono);
  color: var(--b-muted);
}

.sync summary {
  cursor: pointer;
}

.sync p {
  margin: 4px 0 0 14px;
}

.tiles {
  list-style: none;
  margin: 20px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.tiles li {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  border: 1px solid var(--b-line);
  border-radius: 12px;
  background: var(--b-surface);
}

.t-value {
  font: 600 26px/1.1 var(--b-sans);
}

.t-label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--b-muted);
}

.t-hint {
  font: 400 11.5px var(--b-mono);
  color: var(--b-faint);
}

@media (max-width: 640px) {
  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.section {
  margin-top: 32px;
}

.section h2 {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
}

.count {
  margin-left: 4px;
  font: 500 13px var(--b-mono);
  color: var(--b-faint);
}

.none {
  margin: 0;
  color: var(--b-faint);
  font-size: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.handled {
  margin-top: 14px;
}

.handled summary {
  cursor: pointer;
  margin-bottom: 10px;
  font: 500 13px var(--b-mono);
  color: var(--b-muted);
}

.savebar {
  position: fixed;
  left: 50%;
  bottom: max(16px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 16px;
  border: 1px solid var(--b-line);
  border-radius: 12px;
  background: var(--b-surface);
  box-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.35);
  width: min(560px, calc(100% - 24px));
}

.save-count {
  flex: 1;
  font-weight: 600;
}

.save-error {
  flex: 1;
  color: var(--b-bad);
  font-size: 14px;
}
</style>
