<template>
  <p v-if="error" class="empty">Couldn't load hobbies right now.</p>
  <p v-else-if="loaded && !items.length" class="empty">Nothing here yet.</p>

  <!-- Home: every hobby as a card -->
  <div v-else-if="variant === 'cards'" ref="root" class="cards">
    <RouterLink
      v-for="(hobby, i) in items"
      :key="hobby.id"
      :to="`/hobbies#hobby-${hobby.id}`"
      class="card"
      data-reveal
    >
      <div class="card-art art" :class="{ 'has-cover': hobby.image_url }" :style="coverVar(hobby)">
        <img v-if="hobby.image_url" :src="hobby.image_url" alt="" loading="lazy" />
        <span v-else-if="hobby.icon" class="icon" aria-hidden="true">{{ hobby.icon }}</span>
        <HobbyMotif v-else size="150px" :stroke-width="1.5" />
      </div>
      <div class="card-body">
        <span class="index">{{ number(i) }}</span>
        <h3 class="card-title">{{ hobby.name }}</h3>
        <p v-if="hobby.description" class="card-text">{{ hobby.description }}</p>
      </div>
    </RouterLink>
  </div>

  <!-- Hobbies page: every hobby in full -->
  <div v-else ref="root" class="entries">
    <article v-for="(hobby, i) in items" :id="`hobby-${hobby.id}`" :key="hobby.id" class="entry" data-reveal>
      <div class="entry-art art">
        <img v-if="hobby.image_url" :src="hobby.image_url" alt="" loading="lazy" />
        <span v-else-if="hobby.icon" class="icon big" aria-hidden="true">{{ hobby.icon }}</span>
        <HobbyMotif v-else />
      </div>
      <div class="entry-body">
        <span class="index">{{ number(i) }}</span>
        <h2 class="entry-title">{{ hobby.name }}</h2>
        <p v-if="hobby.description" class="entry-text">{{ hobby.description }}</p>
        <div v-if="hobby.link">
          <a class="pill" :href="hobby.link" target="_blank" rel="noopener">More <span class="arrow" aria-hidden="true">↗</span></a>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useReveal } from '../motion.js'
import HobbyMotif from './HobbyMotif.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loaded: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  // cards: home page; full: the /hobbies page
  variant: { type: String, default: 'full' }
})

const root = ref(null)
useReveal(root, toRef(props, 'items'))

const number = (i) => String(i + 1).padStart(2, '0')

// Feeds the cover to CSS for the blurred fill behind it on home cards.
const coverVar = (h) => (h.image_url ? { '--cover': `url(${JSON.stringify(h.image_url)})` } : null)
</script>

<style scoped>
.art {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--faint);
  overflow: hidden;
  transition: color 0.3s ease, border-color 0.3s ease;
}

.art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon {
  font-size: 56px;
  line-height: 1;
}

.icon.big {
  font-size: 88px;
}

.index {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--accent);
}

/* Covers are a fixed 2:1 everywhere (GitHub social previews are 1200x600),
   so an image is framed the same on the card and on the hobbies page. */
.art {
  aspect-ratio: 2 / 1;
}

/* ── Cards (home): one full-width row per project, cover on the left ── */
.cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  align-items: center;
  color: var(--fg);
  text-decoration: none;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.card-art {
  position: relative;
  align-self: stretch;
  /* the cell matches the row's height; the cover inside stays 2:1 */
  aspect-ratio: auto;
  min-height: 210px;
  border-right: 1px solid var(--line);
}

.card-art img {
  position: relative;
  height: auto;
  aspect-ratio: 2 / 1;
}

/* Spare height above/below the cover shows a blurred, dimmed copy of it. */
.card-art.has-cover::before {
  content: '';
  position: absolute;
  inset: -24px;
  background: var(--cover) center / cover;
  filter: blur(22px) brightness(0.45) saturate(1.2);
}

.card-body {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.card-title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.45rem;
  letter-spacing: -0.01em;
}

.card-text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--muted);
  /* generous, but a runaway description can't blow up the row; the full
     text is always on /hobbies */
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card:hover {
  color: var(--fg);
  border-color: rgba(255, 178, 122, 0.55);
  transform: translateY(-4px);
}

.card:hover .art {
  color: var(--green);
}

@media (max-width: 720px) {
  .card {
    grid-template-columns: 1fr;
  }
  .card-art {
    aspect-ratio: 2 / 1;
    min-height: 0;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .card-body {
    padding: 22px;
  }
}

/* ── Entries (hobbies page) ───────────────────────── */
.entry {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(24px, 4vw, 56px);
  padding: 56px 0;
  border-bottom: 1px solid var(--line);
  scroll-margin-top: 24px;
}

.entry:last-child {
  border-bottom: 0;
  padding-bottom: 96px;
}

.entry-art {
  flex: 0 1 480px;
  min-width: min(100%, 320px);
  align-self: center;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
}

.entry:hover .entry-art {
  color: var(--green);
  border-color: rgba(255, 178, 122, 0.45);
}

.entry-body {
  flex: 999 1 420px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
}

.entry .index {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
}

.entry-title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.8rem, 3.6vw, 2.8rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.entry-text {
  margin: 0;
  max-width: 640px;
  font-size: 1.1rem;
  line-height: 1.65;
  color: var(--muted);
  white-space: pre-line;
}
</style>
