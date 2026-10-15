<template>
  <p v-if="error" class="empty">Couldn't load hobbies right now.</p>
  <p v-else-if="loaded && !items.length" class="empty">Nothing here yet.</p>

  <ul v-else class="hobbies">
    <li v-for="hobby in items" :key="hobby.id" class="hobby">
      <img v-if="hobby.image_url" :src="hobby.image_url" alt="" class="photo" loading="lazy" />
      <div class="content">
        <span v-if="hobby.icon" class="icon" aria-hidden="true">{{ hobby.icon }}</span>
        <h3 class="name">{{ hobby.name }}</h3>
        <p v-if="hobby.description" class="description">{{ hobby.description }}</p>
        <a v-if="hobby.link" :href="hobby.link" target="_blank" rel="noopener" class="link">More →</a>
      </div>
    </li>
  </ul>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  loaded: { type: Boolean, default: false },
  error: { type: Boolean, default: false }
})
</script>

<style scoped>
.hobbies {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.hobby {
  background: var(--bg-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}

.hobby:hover {
  border-color: var(--line-strong);
  transform: translateY(-2px);
}

.photo {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.content {
  padding: 20px;
}

.icon {
  font-size: 28px;
  line-height: 1;
}

.name {
  margin: 10px 0 6px;
  font-size: 18px;
}

.description {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
}

.link {
  display: inline-block;
  margin-top: 12px;
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
}

.link:hover {
  color: var(--fg);
}
</style>
