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
      <div class="card-art art">
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

/* ── Cards (home) ─────────────────────────────────── */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 20px;
}

.card {
  display: flex;
  flex-direction: column;
  color: var(--fg);
  text-decoration: none;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.card-art {
  height: 150px;
  border-bottom: 1px solid var(--line);
}

.card-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
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
}

.card:hover {
  color: var(--fg);
  border-color: rgba(255, 178, 122, 0.55);
  transform: translateY(-4px);
}

.card:hover .art {
  color: var(--green);
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
  flex: 1 1 320px;
  max-width: 460px;
  aspect-ratio: 4 / 3;
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
