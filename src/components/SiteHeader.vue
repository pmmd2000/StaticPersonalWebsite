<template>
  <header class="site-header">
    <RouterLink to="/" class="brand" aria-label="Parham Monfared, home">
      <span class="brand-dot" aria-hidden="true"></span>parhammonfared.com
    </RouterLink>
    <nav class="nav" aria-label="Pages">
      <RouterLink to="/news">News</RouterLink>
      <RouterLink to="/hobbies">Hobbies</RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 28px 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  color: var(--fg);
  text-decoration: none;
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 12px var(--green);
}

.nav {
  display: flex;
  gap: 28px;
}

.nav a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav a:hover,
.nav a.router-link-active {
  color: var(--accent);
}
</style>
