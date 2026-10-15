<template>
  <footer class="footer">
    <span>© {{ year }} Parham Monfared</span>
    <nav aria-label="Footer">
      <RouterLink to="/news">News</RouterLink>
      <RouterLink to="/hobbies">Hobbies &amp; Projects</RouterLink>
      <a href="#" @click.prevent="openContact">Contact</a>
    </nav>
  </footer>
</template>

<script setup>
import { inject } from 'vue'

const openContact = inject('openContact')
const year = new Date().getFullYear()
</script>

<style scoped>
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 28px 0 40px;
  border-top: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--dim);
}

nav {
  display: flex;
  gap: 20px;
}

a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--muted);
  text-decoration: none;
}

a:hover {
  color: var(--accent);
}
</style>
