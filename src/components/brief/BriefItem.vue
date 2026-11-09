<template>
  <article class="item" :class="[`is-${effectiveStatus}`, { changed: !!staged, compact }]">
    <div class="top">
      <span class="src" :class="`app-${item.source_app}`">
        {{ APP_LABELS[item.source_app] || item.source_app }}<template v-if="item.source_account"> · {{ item.source_account }}</template>
      </span>
      <span v-if="item.time_label" class="time" :class="{ overdue: /overdue/i.test(item.time_label) }">{{ item.time_label }}</span>
      <span v-for="(pill, i) in item.pills" :key="i" class="tag" :class="`tag-${pill.type}`">{{ pill.label || PILL_LABELS[pill.type] || pill.type }}</span>
      <span v-if="staged" class="changed-mark">changed</span>
    </div>

    <h3 class="title" dir="auto">{{ item.title }}</h3>
    <p v-if="item.body && !compact" class="body" dir="auto">{{ item.body }}</p>
    <blockquote v-for="(quote, i) in compact ? [] : item.quotes" :key="i" class="quote" dir="auto">{{ quote }}</blockquote>

    <p v-if="metaLine" class="meta">{{ metaLine }}</p>

    <!-- Decision as it stands (saved, or staged and not yet saved) -->
    <p v-if="decisionLine" class="decision" :class="`d-${effectiveStatus}`">{{ decisionLine }}</p>
    <p v-if="effectiveNote" class="note" dir="auto"><span>Note</span>{{ effectiveNote }}</p>

    <!-- What Claude did with the saved decisions -->
    <ul v-if="actionChips.length" class="states">
      <li v-for="chip in actionChips" :key="chip.id" :class="`s-${chip.state}`">
        <span class="s-label">{{ chip.label }}</span>
        <span v-if="chip.message" class="s-msg" dir="auto">{{ chip.message }}</span>
      </li>
    </ul>

    <div v-if="interactive" class="controls">
      <template v-if="handled">
        <button class="btn" type="button" @click="undo">Undo</button>
      </template>
      <template v-else>
        <button class="btn" type="button" @click="setStatus('done')">Done</button>
        <button class="btn" type="button" @click="setStatus('wont_do')">Won't do</button>
        <button class="btn" type="button" :aria-expanded="panel === 'reschedule'" @click="toggle('reschedule')">Reschedule</button>
      </template>
      <button class="btn" type="button" :aria-expanded="panel === 'note'" @click="toggle('note')">Note</button>
      <button v-if="staged" class="btn ghost" type="button" @click="$emit('change', null)">Revert</button>
    </div>

    <div v-if="panel === 'reschedule'" class="panel">
      <label class="field">
        <span>New date and time (UK)</span>
        <input v-model="rescheduleTo" type="datetime-local" step="300" />
      </label>
      <div class="panel-actions">
        <button class="btn primary" type="button" :disabled="!rescheduleTo" @click="applyReschedule">Set</button>
        <button class="btn" type="button" @click="panel = null">Cancel</button>
      </div>
    </div>

    <div v-if="panel === 'note'" class="panel">
      <label class="field">
        <span>Note</span>
        <textarea v-model="noteDraft" rows="3" maxlength="4000" dir="auto"></textarea>
      </label>
      <div class="panel-actions">
        <button class="btn primary" type="button" @click="applyNote">Keep note</button>
        <button class="btn" type="button" @click="panel = null">Cancel</button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { londonInputToUtc, toLondonInput, whenLabel } from '../../brief/time.js'

const props = defineProps({
  item: { type: Object, required: true },
  // { status?: 'done'|'wont_do'|'reschedule'|'reopen', to?: 'YYYY-MM-DDTHH:mm', note?: string }
  staged: { type: Object, default: null },
  interactive: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }
})
const emit = defineEmits(['change'])

const APP_LABELS = { ticktick: 'TickTick', gcal: 'Calendar', gmail: 'Gmail', whatsapp: 'WhatsApp', telegram: 'Telegram', fitness: 'Fitness', other: 'Other' }
const PILL_LABELS = { clash: 'Clash', linked: 'Linked', overdue: 'Overdue', new: 'New' }
const STAGED_TO_STATUS = { done: 'done', wont_do: 'wont_do', reschedule: 'rescheduled', reopen: 'open' }

const panel = ref(null)
const rescheduleTo = ref('')
const noteDraft = ref('')

const effectiveStatus = computed(() => (props.staged?.status ? STAGED_TO_STATUS[props.staged.status] : props.item.status))
const handled = computed(() => ['done', 'wont_do'].includes(effectiveStatus.value))
const effectiveNote = computed(() => (props.staged && 'note' in props.staged ? props.staged.note : props.item.user_note))

const metaLine = computed(() => {
  const parts = []
  if (props.item.person) parts.push(props.item.person)
  if (props.item.waited_days != null) parts.push(`waiting ${props.item.waited_days} day${props.item.waited_days === 1 ? '' : 's'}`)
  if (props.item.unread_count) parts.push(`${props.item.unread_count} unread`)
  if (props.item.due_at && !props.item.time_label) parts.push(`due ${whenLabel(props.item.due_at)}`)
  return parts.join(' · ')
})

const decisionLine = computed(() => {
  const s = effectiveStatus.value
  if (s === 'done') return 'Marked done'
  if (s === 'wont_do') return "Marked won't do"
  if (s === 'dismissed') return 'Dismissed'
  if (s === 'rescheduled') {
    const to = props.staged?.status === 'reschedule' ? londonInputToUtc(props.staged.to) : props.item.rescheduled_to
    return to ? `Rescheduled to ${whenLabel(to)}` : 'Rescheduled'
  }
  if (props.staged?.status === 'reopen') return 'Reopened'
  return ''
})

// Saved actions and how they went. Hidden while a newer change is staged.
const actionChips = computed(() =>
  (props.item.actions || [])
    .filter((a) => !(props.staged && (a.action === 'note' ? 'note' in props.staged : props.staged.status)))
    .map((a) => ({
      id: a.id,
      state: a.state === 'claimed' ? 'pending' : a.state,
      label: `${ACTION_LABELS[a.action]}: ${STATE_LABELS[a.state]}`,
      message: a.state === 'failed' || a.state === 'applied' ? a.result_message : null
    }))
)
const ACTION_LABELS = { done: 'Done', wont_do: "Won't do", reschedule: 'Reschedule', note: 'Note', reopen: 'Reopen' }
const STATE_LABELS = { pending: 'pending', claimed: 'in progress', applied: 'applied ✓', failed: 'failed', skipped: 'skipped' }

function toggle(name) {
  panel.value = panel.value === name ? null : name
  if (name === 'reschedule' && !rescheduleTo.value) {
    const base = props.item.rescheduled_to || props.item.due_at
    rescheduleTo.value = base ? toLondonInput(base) : ''
  }
  if (name === 'note') noteDraft.value = effectiveNote.value || ''
}

function patch(change) {
  emit('change', { ...(props.staged || {}), ...change })
}

function setStatus(status) {
  panel.value = null
  patch({ status, to: undefined })
}

function applyReschedule() {
  panel.value = null
  patch({ status: 'reschedule', to: rescheduleTo.value })
}

function applyNote() {
  panel.value = null
  patch({ note: noteDraft.value.trim() })
}

// Undo a handled item: drop an unsaved status, or record a reopen.
function undo() {
  if (props.staged?.status && props.item.status === 'open') patch({ status: undefined, to: undefined })
  else patch({ status: 'reopen', to: undefined })
}
</script>

<style scoped>
.item {
  position: relative;
  padding: 14px 16px;
  background: var(--b-surface);
  border: 1px solid var(--b-line);
  border-radius: 12px;
  box-shadow: var(--b-shadow);
}

.item.changed {
  border-color: var(--b-accent);
  box-shadow: 0 0 0 3px var(--b-accent-wash);
}

.item.compact {
  padding: 10px 14px;
  box-shadow: none;
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  font: 500 12px var(--b-mono);
  color: var(--b-muted);
}

.src {
  text-transform: none;
}

.time {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--b-sunken);
  color: var(--b-ink);
}

.time.overdue {
  background: var(--b-bad-wash);
  color: var(--b-bad);
}

.tag {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--b-info-wash);
  color: var(--b-info);
}

.tag-clash {
  background: var(--b-warn-wash);
  color: var(--b-warn);
}

.changed-mark {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--b-accent-wash);
  color: var(--b-accent);
}

.title {
  margin: 8px 0 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
}

.compact .title {
  margin-top: 4px;
  font-size: 15px;
}

.body {
  margin: 4px 0 0;
  color: var(--b-muted);
}

.quote {
  margin: 8px 0 0;
  padding: 6px 10px;
  border-inline-start: 3px solid var(--b-line);
  background: var(--b-sunken);
  border-radius: 0 6px 6px 0;
  white-space: pre-wrap;
  font-size: 14px;
}

.meta {
  margin: 8px 0 0;
  font: 400 12.5px var(--b-mono);
  color: var(--b-faint);
}

.decision {
  margin: 8px 0 0;
  font-weight: 500;
  font-size: 14px;
}

.d-done {
  color: var(--b-ok);
}

.d-wont_do,
.d-dismissed {
  color: var(--b-muted);
}

.d-rescheduled,
.d-open {
  color: var(--b-info);
}

.note {
  margin: 6px 0 0;
  white-space: pre-wrap;
  font-size: 14px;
}

.note span {
  margin-inline-end: 8px;
  font: 500 11px var(--b-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--b-faint);
}

.states {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.states li {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 6px;
  font: 500 12px var(--b-mono);
}

.s-pending {
  background: var(--b-warn-wash);
  color: var(--b-warn);
}

.s-applied {
  background: var(--b-ok-wash);
  color: var(--b-ok);
}

.s-failed {
  background: var(--b-bad-wash);
  color: var(--b-bad);
}

.s-skipped {
  background: var(--b-sunken);
  color: var(--b-muted);
}

.s-msg {
  font-family: var(--b-sans);
  font-weight: 400;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.btn.ghost {
  border-color: transparent;
  background: transparent;
  color: var(--b-muted);
}

.panel {
  margin-top: 10px;
  padding: 12px;
  border-radius: 10px;
  background: var(--b-sunken);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel textarea {
  resize: vertical;
}

.panel-actions {
  display: flex;
  gap: 6px;
}

@media (max-width: 520px) {
  .controls .btn {
    flex: 1 1 calc(50% - 6px);
  }
}
</style>
