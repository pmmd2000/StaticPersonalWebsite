<template>
  <main>
    <div class="container page-header">
      <RouterLink to="/" class="back-link">← Parham Monfared</RouterLink>
    </div>
    <section class="section">
      <div class="container">
        <header class="section-head">
          <div>
            <p class="eyebrow">Off the clock</p>
            <h1 class="section-title">Hobbies</h1>
          </div>
        </header>
        <HobbyList v-bind="hobbies" />
      </div>
    </section>
    <SiteFooter />
  </main>
</template>

<script setup>
import { reactive } from 'vue'
import { getHobbies } from '../api.js'
import { useContent } from '../useContent.js'
import HobbyList from '../components/HobbyList.vue'
import SiteFooter from '../components/SiteFooter.vue'

const hobbies = reactive(useContent(getHobbies))
</script>
