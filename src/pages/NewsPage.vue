<template>
  <main class="container">
    <SiteHeader />
    <section class="page-intro">
      <h1 ref="title" class="page-title">Latest news I follow</h1>
    </section>
    <div class="list">
      <NewsList v-bind="news" variant="full" />
    </div>
    <SiteFooter />
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getNews } from '../api.js'
import { scrambleIn } from '../motion.js'
import { useContent } from '../useContent.js'
import SiteHeader from '../components/SiteHeader.vue'
import NewsList from '../components/NewsList.vue'
import SiteFooter from '../components/SiteFooter.vue'

const news = reactive(useContent(() => getNews()))
const title = ref(null)
onMounted(() => scrambleIn(title.value))
</script>

<style scoped>
.list {
  padding-bottom: 96px;
}

.list :deep(.empty) {
  margin-top: 56px;
}
</style>
