<template>
  <main>
    <div class="container page-header">
      <RouterLink to="/" class="back-link">← Parham Monfared</RouterLink>
    </div>
    <section class="section">
      <div class="container">
        <header class="section-head">
          <div>
            <p class="eyebrow">Reading list</p>
            <h1 class="section-title">Tech news I liked</h1>
          </div>
        </header>
        <NewsList v-bind="news" variant="full" />
      </div>
    </section>
    <SiteFooter />
  </main>
</template>

<script setup>
import { reactive } from 'vue'
import { getNews } from '../api.js'
import { useContent } from '../useContent.js'
import NewsList from '../components/NewsList.vue'
import SiteFooter from '../components/SiteFooter.vue'

const news = reactive(useContent(() => getNews()))
</script>
