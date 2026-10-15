<template>
  <p v-if="error" class="empty">Couldn't load news right now.</p>
  <p v-else-if="loaded && !items.length" class="empty">Nothing here yet.</p>

  <ol v-else class="news" :class="variant">
    <li v-for="(item, i) in items" :key="item.id" class="news-item">
      <a :href="item.url" target="_blank" rel="noopener" class="news-link">
        <span class="index">{{ String(i + 1).padStart(2, '0') }}</span>
        <div class="body">
          <p class="meta">
            <span v-if="item.source">{{ item.source }}</span>
            <span v-if="item.source"> · </span>
            <span>{{ formatDate(item.published_at || item.created_at) }}</span>
          </p>
          <h3 class="title">{{ item.title }}</h3>
          <p v-if="item.summary" class="summary">{{ item.summary }}</p>
        </div>
        <img v-if="variant === 'full' && item.image_url" :src="item.image_url" alt="" class="thumb" loading="lazy" />
      </a>
    </li>
  </ol>
</template>

<script setup>
import { formatDate } from '../api.js'

defineProps({
  items: { type: Array, default: () => [] },
  loaded: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  // compact: home-page strip of the latest few; full: the /news page
  variant: { type: String, default: 'full' }
})
</script>

<style scoped>
.news {
  list-style: none;
  margin: 0;
  padding: 0;
}

.news-link {
  display: flex;
  gap: 16px;
  text-decoration: none;
  height: 100%;
}

.index {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  padding-top: 3px;
  font-variant-numeric: tabular-nums;
}

.body {
  flex: 1;
  min-width: 0;
}

.meta {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  transition: color 0.2s;
}

.news-link:hover .title {
  color: #ffb3be;
}

.summary {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 15px;
}

/* Compact: three columns divided by hairlines, clamped so the whole strip
   stays well under half a screen tall. */
.compact {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--line-strong);
}

.compact .news-item {
  padding: 20px 20px 4px 0;
}

.compact .news-item + .news-item {
  padding-left: 20px;
  border-left: 1px solid var(--line);
}

.compact .title,
.compact .summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.compact .title { -webkit-line-clamp: 3; }
.compact .summary { -webkit-line-clamp: 2; }

@media (max-width: 760px) {
  .compact {
    grid-template-columns: 1fr;
  }
  .compact .news-item,
  .compact .news-item + .news-item {
    padding: 14px 0;
    border-left: 0;
    border-bottom: 1px solid var(--line);
  }
  .compact .summary { display: none; }
}

/* Full list */
.full .news-item {
  border-top: 1px solid var(--line);
}

.full .news-link {
  padding: 22px 0;
}

.full .title {
  font-size: 20px;
}

.thumb {
  width: 160px;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 10px;
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .thumb { display: none; }
}
</style>
