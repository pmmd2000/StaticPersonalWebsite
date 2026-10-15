<template>
  <footer class="footer">
    <div class="container footer-inner">
      <span>© {{ year }} Parham Monfared</span>
      <nav>
        <RouterLink to="/news">News</RouterLink>
        <RouterLink to="/hobbies">Hobbies</RouterLink>
        <a href="#" @click.prevent="openContact">Contact</a>
      </nav>
    </div>
  </footer>
</template>

<script setup>
import { inject } from 'vue'

const openContact = inject('openContact')
const year = new Date().getFullYear()
</script>

<style scoped>
.footer {
  border-top: 1px solid var(--line);
  padding: 28px 0 40px;
  color: var(--muted);
  font-size: 14px;
}

.footer-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

nav {
  display: flex;
  gap: 18px;
}

a {
  text-decoration: none;
}

a:hover {
  color: var(--fg);
}
</style>
