<template>
  <main class="container">
    <SiteHeader />
    <section class="page-intro">
      <h1 ref="title" class="page-title">Hobbies &amp; Projects</h1>
    </section>
    <HobbyList v-bind="hobbies" variant="full" />
    <SiteFooter />
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getHobbies } from '../api.js'
import { scrambleIn } from '../motion.js'
import { useContent } from '../useContent.js'
import SiteHeader from '../components/SiteHeader.vue'
import HobbyList from '../components/HobbyList.vue'
import SiteFooter from '../components/SiteFooter.vue'

const hobbies = reactive(useContent(getHobbies))
const title = ref(null)
onMounted(() => scrambleIn(title.value))
</script>

<style scoped>
:deep(.empty) {
  margin: 56px 0 96px;
}
</style>
