<template>
  <div class="forecast">
    <div class="grid" :style="{ '--hours': HOURS.length - 1, '--hour-h': `${HOUR_PX}px` }">
      <div class="gutter" aria-hidden="true">
        <div class="col-head"></div>
        <div class="allday-head"></div>
        <div class="timeline">
          <span v-for="h in HOURS" :key="h" class="hour" :style="{ top: `${(h - START) * HOUR_PX}px` }">{{ String(h).padStart(2, '0') }}</span>
        </div>
      </div>

      <section v-for="day in shownDays" :key="day.date" class="day" :class="{ today: day.date === today }" :aria-label="longDate(day.date)">
        <h3 class="col-head">{{ shortDay(day.date) }}<span v-if="day.date === today" class="today-tag">Today</span></h3>

        <ul class="allday">
          <li v-for="(e, i) in day.untimed" :key="i" :class="`k-${e.kind}`" dir="auto" :title="e.title">{{ e.title }}</li>
        </ul>

        <div class="timeline">
          <span v-for="h in HOURS" :key="h" class="line" :style="{ top: `${(h - START) * HOUR_PX}px` }"></span>
          <div
            v-for="(e, i) in day.timed"
            :key="i"
            class="event"
            :class="[`k-${e.kind}`, { short: e.height < 34 }]"
            :style="{ top: `${e.top}px`, height: `${e.height}px`, left: `${e.left}%`, width: `${e.width}%` }"
            :title="`${e.timeLabel} ${e.title}`"
          >
            <span class="e-time">{{ e.timeLabel }}</span>
            <span class="e-title" dir="auto">{{ e.title }}</span>
          </div>
          <span v-if="day.date === today && nowTop !== null" class="now" :style="{ top: `${nowTop}px` }" aria-label="Now"></span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatLondon, londonDate, londonMinutes, longDate, shortDay } from '../../brief/time.js'

const props = defineProps({ days: { type: Array, default: () => [] } })

const START = 7
const END = 23
const HOURS = Array.from({ length: END - START + 1 }, (_, i) => START + i)
const HOUR_PX = 44
const px = (minutes) => ((minutes - START * 60) / 60) * HOUR_PX

const now = ref(new Date())
let timer = 0
onMounted(() => (timer = setInterval(() => (now.value = new Date()), 60_000)))
onBeforeUnmount(() => clearInterval(timer))

const today = computed(() => londonDate(now.value))
const nowTop = computed(() => {
  const m = londonMinutes(now.value)
  return m < START * 60 || m > END * 60 ? null : px(m)
})

// Lay out one day: timed entries get lanes so overlaps sit side by side.
function layout(day) {
  const timed = []
  const untimed = []
  for (const e of day.entries || []) {
    const start = new Date(e.start)
    const end = e.end ? new Date(e.end) : null
    if (e.all_day || !end || londonDate(start) !== day.date) {
      untimed.push({ ...e, kind: e.kind || 'event' })
      continue
    }
    const s = Math.max(londonMinutes(start), START * 60)
    const endsSameDay = londonDate(end) === day.date
    const f = Math.min(endsSameDay ? londonMinutes(end) : END * 60, END * 60)
    if (f <= START * 60 || s >= END * 60) {
      untimed.push({ ...e, kind: e.kind || 'event' })
      continue
    }
    timed.push({
      ...e,
      kind: e.kind || 'event',
      s,
      f: Math.max(f, s + 15),
      timeLabel: formatLondon(e.start, { hour: '2-digit', minute: '2-digit' })
    })
  }
  timed.sort((a, b) => a.s - b.s || b.f - a.f)

  // Greedy lanes within clusters of overlapping events.
  let cluster = []
  let clusterEnd = -1
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((e) => e.lane + 1))
    for (const e of cluster) {
      e.left = (e.lane / lanes) * 100
      e.width = 100 / lanes
    }
    cluster = []
  }
  for (const e of timed) {
    if (e.s >= clusterEnd && cluster.length) flush()
    const used = new Set(cluster.filter((c) => c.f > e.s).map((c) => c.lane))
    let lane = 0
    while (used.has(lane)) lane++
    e.lane = lane
    cluster.push(e)
    clusterEnd = Math.max(clusterEnd, e.f)
  }
  if (cluster.length) flush()

  for (const e of timed) {
    e.top = px(e.s)
    e.height = Math.max(px(e.f) - e.top, 20)
  }
  return { date: day.date, timed, untimed }
}

const shownDays = computed(() => props.days.slice(0, 4).map(layout))
</script>

<style scoped>
.forecast {
  overflow-x: auto;
  border: 1px solid var(--b-line);
  border-radius: 12px;
  background: var(--b-surface);
}

.grid {
  display: grid;
  grid-template-columns: 44px repeat(4, minmax(170px, 1fr));
  min-width: 740px;
}

.col-head {
  height: 40px;
  margin: 0;
  padding: 10px 10px 0;
  font: 600 13px var(--b-sans);
  border-bottom: 1px solid var(--b-line);
}

.today .col-head {
  color: var(--b-accent);
}

.today-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--b-accent-wash);
  font: 500 11px var(--b-mono);
}

.day {
  border-left: 1px solid var(--b-line);
}

.today {
  background: color-mix(in srgb, var(--b-accent-wash) 35%, transparent);
}

.allday-head,
.allday {
  min-height: 34px;
  border-bottom: 1px solid var(--b-line);
}

.allday {
  list-style: none;
  margin: 0;
  padding: 5px 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.allday li {
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: var(--b-sunken);
}

.allday li.k-task {
  border-left: 3px solid var(--b-ok);
}

.timeline {
  position: relative;
  height: calc(var(--hours) * var(--hour-h));
  margin: 10px 0;
}

.hour {
  position: absolute;
  right: 6px;
  transform: translateY(-50%);
  font: 400 11px var(--b-mono);
  color: var(--b-faint);
}

.line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed var(--b-line);
}

.event {
  position: absolute;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid var(--b-surface);
  background: var(--b-info-wash);
  border-left: 3px solid var(--b-info);
  overflow: hidden;
  font-size: 12px;
  line-height: 1.3;
  display: flex;
  flex-direction: column;
}

.event.k-task {
  background: var(--b-ok-wash);
  border-left-color: var(--b-ok);
}

.event.k-workout {
  background: var(--b-warn-wash);
  border-left-color: var(--b-warn);
}

.event.short {
  flex-direction: row;
  gap: 5px;
  white-space: nowrap;
}

.e-time {
  font: 500 11px var(--b-mono);
  color: var(--b-muted);
}

.e-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.now {
  position: absolute;
  left: -4px;
  right: 0;
  height: 2px;
  background: var(--b-bad);
  z-index: 2;
}

.now::before {
  content: '';
  position: absolute;
  left: 0;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--b-bad);
}
</style>
