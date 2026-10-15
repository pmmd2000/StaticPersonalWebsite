<template>
  <p v-if="error" class="empty">Couldn't load news right now.</p>
  <p v-else-if="loaded && !items.length" class="empty">Nothing here yet.</p>

  <!-- Home: the latest few, numbered, in columns -->
  <ol v-else-if="variant === 'compact'" ref="root" class="grid">
    <li v-for="(item, i) in items" :key="item.id" data-reveal>
      <a class="card" :href="item.url" target="_blank" rel="noopener">
        <span class="card-top">
          <span class="num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="meta">{{ stamp(item, false) }}<template v-if="item.source"> · {{ item.source }}</template></span>
        </span>
        <span class="card-title">{{ item.title }} <span class="arrow" aria-hidden="true">↗</span></span>
        <span v-if="item.summary" class="card-summary">{{ item.summary }}</span>
      </a>
    </li>
  </ol>

  <!-- News page: every item as a row -->
  <ol v-else ref="root" class="rows">
    <li v-for="item in items" :key="item.id" data-reveal>
      <a class="row" :href="item.url" target="_blank" rel="noopener">
        <span class="row-meta">{{ stamp(item, true) }}<template v-if="item.source"><br />{{ item.source }}</template></span>
        <span class="node" aria-hidden="true"></span>
        <span class="row-body">
          <span class="row-title">{{ item.title }}</span>
          <span v-if="item.summary" class="row-summary">{{ item.summary }}</span>
        </span>
        <span class="arrow" aria-hidden="true">↗</span>
      </a>
    </li>
  </ol>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { formatStamp } from '../api.js'
import { useReveal } from '../motion.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loaded: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  // compact: the home page's latest three; full: the /news page
  variant: { type: String, default: 'full' }
})

const root = ref(null)
useReveal(root, toRef(props, 'items'), { y: 24, stagger: 0.07 })

const stamp = (item, withYear) => formatStamp(item.published_at || item.created_at, withYear)
</script>

<style scoped>
ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* ── Compact (home) ───────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 40px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: var(--fg);
  text-decoration: none;
  transition: color 0.25s ease;
}

.card-top {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 3.4rem;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px var(--faint);
  transition: -webkit-text-stroke-color 0.25s ease;
}

.meta {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: uppercase;
}

.card-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.3rem;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.card-summary {
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card:hover {
  color: var(--accent);
}

.card:hover .num {
  -webkit-text-stroke-color: var(--accent);
}

.card:hover .arrow,
.row:hover .arrow {
  transform: translate(3px, -3px);
}

/* ── Rows (news page) ─────────────────────────────── */
.rows li {
  border-bottom: 1px solid var(--line);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 140px) 24px minmax(0, 1fr) 32px;
  align-items: start;
  gap: 20px;
  padding: 32px 12px;
  color: var(--fg);
  text-decoration: none;
  transition: background-color 0.25s ease;
}

.row-meta {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.8;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: uppercase;
}

.node {
  width: 9px;
  height: 9px;
  margin-top: 10px;
  border-radius: 50%;
  background: var(--green);
  transition: background-color 0.25s ease;
}

.row-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.2rem, 2.2vw, 1.6rem);
  line-height: 1.25;
  letter-spacing: -0.015em;
  transition: color 0.25s ease;
}

.row-summary {
  max-width: 760px;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--muted);
}

.row .arrow {
  margin-top: 2px;
  font-size: 1.4rem;
  color: var(--faint);
  transition: transform 0.25s ease, color 0.25s ease;
}

.row:hover {
  background: var(--panel);
}

.row:hover .row-title,
.row:hover .arrow {
  color: var(--accent);
}

.row:hover .node {
  background: var(--accent);
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 16px minmax(0, 1fr);
    gap: 8px 14px;
    padding: 24px 4px;
  }
  .row-meta {
    grid-column: 1 / -1;
    line-height: 1.5;
  }
  .row-meta br {
    display: none;
  }
  .node {
    margin-top: 9px;
  }
  .row .arrow {
    display: none;
  }
}
</style>
