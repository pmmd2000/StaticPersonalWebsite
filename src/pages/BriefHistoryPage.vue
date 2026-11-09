<template>
  <BriefShell @ready="load">
    <main class="page">
      <header class="head">
        <div>
          <p class="kicker">Morning Brief</p>
          <h1>History</h1>
        </div>
        <RouterLink to="/brief">Latest brief</RouterLink>
      </header>

      <p v-if="error" class="banner" role="alert">{{ error }}</p>

      <section class="section" aria-labelledby="h-runs">
        <h2 id="h-runs">Past briefs</h2>
        <p v-if="loaded && !runs.length" class="none">No briefs stored yet.</p>
        <ul class="runs">
          <li v-for="r in runs" :key="r.id">
            <RouterLink :to="`/brief/${r.brief_date}`">{{ longDate(r.brief_date) }}</RouterLink>
            <span class="meta">{{ r.item_count }} item{{ r.item_count === 1 ? '' : 's' }}<template v-if="r.checked_label"> · {{ r.checked_label }}</template></span>
          </li>
        </ul>
      </section>

      <section class="section" aria-labelledby="h-commit">
        <h2 id="h-commit">Commitments</h2>
        <p class="muted intro">Everything promised or planned in WhatsApp and Telegram, and what you decided.</p>

        <div class="filters" role="group" aria-label="Filter by status">
          <button
            v-for="f in FILTERS"
            :key="f.id"
            type="button"
            class="btn"
            :class="{ active: filter === f.id }"
            :aria-pressed="filter === f.id"
            @click="filter = f.id"
          >
            {{ f.label }} <span class="n">{{ countFor(f.id) }}</span>
          </button>
        </div>

        <p v-if="loaded && !shown.length" class="none">Nothing here.</p>
        <div class="list">
          <article v-for="c in shown" :key="c.item_key" class="commit">
            <div class="c-top">
              <span>{{ c.source_app === 'telegram' ? 'Telegram' : 'WhatsApp' }}<template v-if="c.source_account"> · {{ c.source_account }}</template></span>
              <span class="status" :class="`st-${c.status}`">{{ STATUS_LABELS[c.status] }}</span>
            </div>
            <h3 dir="auto">{{ c.title }}</h3>
            <p v-if="c.body" class="body" dir="auto">{{ c.body }}</p>
            <blockquote v-for="(q, i) in c.quotes" :key="i" dir="auto">{{ q }}</blockquote>
            <p v-if="c.user_note" class="note" dir="auto"><span>Note</span>{{ c.user_note }}</p>
            <p class="meta">
              <template v-if="c.person">{{ c.person }} · </template>
              <template v-if="c.status_changed_at">decided {{ whenLabel(c.status_changed_at) }} · </template>
              last in the brief {{ c.last_brief_date ? shortDay(c.last_brief_date) : '—' }}
            </p>
          </article>
        </div>
      </section>
    </main>
  </BriefShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { briefApi } from '../api.js'
import { longDate, shortDay, whenLabel } from '../brief/time.js'
import BriefShell from '../components/brief/BriefShell.vue'

const runs = ref([])
const commitments = ref([])
const loaded = ref(false)
const error = ref('')
const filter = ref('all')

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'wont_do', label: "Won't do" },
  { id: 'rescheduled', label: 'Rescheduled' }
]
const STATUS_LABELS = { open: 'Open', done: 'Done', wont_do: "Won't do", rescheduled: 'Rescheduled', dismissed: 'Dismissed' }

const countFor = (id) => (id === 'all' ? commitments.value.length : commitments.value.filter((c) => c.status === id).length)
const shown = computed(() => (filter.value === 'all' ? commitments.value : commitments.value.filter((c) => c.status === filter.value)))

async function load() {
  try {
    const data = await briefApi.history()
    runs.value = data.runs
    commitments.value = data.commitments
  } catch (err) {
    error.value = err.message
  } finally {
    loaded.value = true
  }
}
</script>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 28px 18px 80px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
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
  font-size: 28px;
  font-weight: 600;
}

.banner {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--b-bad-wash);
  color: var(--b-bad);
}

.section {
  margin-top: 30px;
}

h2 {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 600;
}

.intro {
  margin: -4px 0 12px;
  font-size: 14px;
}

.none {
  color: var(--b-faint);
  font-size: 14px;
}

.runs {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--b-line);
  border-radius: 12px;
  background: var(--b-surface);
}

.runs li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  padding: 10px 14px;
}

.runs li + li {
  border-top: 1px solid var(--b-line);
}

.meta {
  font: 400 12.5px var(--b-mono);
  color: var(--b-faint);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.filters .btn.active {
  background: var(--b-ink);
  border-color: var(--b-ink);
  color: var(--b-bg);
}

.n {
  font: 500 11.5px var(--b-mono);
  opacity: 0.7;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.commit {
  padding: 12px 14px;
  border: 1px solid var(--b-line);
  border-radius: 12px;
  background: var(--b-surface);
}

.c-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font: 500 12px var(--b-mono);
  color: var(--b-muted);
}

.status {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--b-sunken);
}

.st-done {
  background: var(--b-ok-wash);
  color: var(--b-ok);
}

.st-wont_do {
  background: var(--b-bad-wash);
  color: var(--b-bad);
}

.st-rescheduled {
  background: var(--b-info-wash);
  color: var(--b-info);
}

.commit h3 {
  margin: 6px 0 0;
  font-size: 15.5px;
  font-weight: 600;
}

.body {
  margin: 4px 0 0;
  color: var(--b-muted);
}

blockquote {
  margin: 8px 0 0;
  padding: 6px 10px;
  border-inline-start: 3px solid var(--b-line);
  background: var(--b-sunken);
  border-radius: 0 6px 6px 0;
  white-space: pre-wrap;
  font-size: 14px;
}

.note {
  margin: 8px 0 0;
  white-space: pre-wrap;
  font-size: 14px;
}

.note span {
  margin-inline-end: 8px;
  font: 500 11px var(--b-mono);
  text-transform: uppercase;
  color: var(--b-faint);
}

.commit .meta {
  margin: 8px 0 0;
}
</style>
