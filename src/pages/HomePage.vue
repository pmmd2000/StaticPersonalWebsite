<template>
  <main>
    <HeroSection />

    <section class="section" id="news">
      <div class="container">
        <header class="section-head">
          <div>
            <p class="eyebrow">Reading list</p>
            <h2 class="section-title">Tech news I liked</h2>
          </div>
          <RouterLink to="/news" class="more-link">More →</RouterLink>
        </header>
        <NewsList v-bind="news" variant="compact" />
      </div>
    </section>

    <section class="section" id="hobbies">
      <div class="container">
        <header class="section-head">
          <div>
            <p class="eyebrow">Off the clock</p>
            <h2 class="section-title">Hobbies</h2>
          </div>
          <RouterLink to="/hobbies" class="more-link">Open page →</RouterLink>
        </header>
        <HobbyList v-bind="hobbies" />
      </div>
    </section>

    <SiteFooter />
  </main>
</template>

<script setup>
import { reactive } from 'vue'
import { getHobbies, getNews } from '../api.js'
import { useContent } from '../useContent.js'
import HeroSection from '../components/HeroSection.vue'
import NewsList from '../components/NewsList.vue'
import HobbyList from '../components/HobbyList.vue'
import SiteFooter from '../components/SiteFooter.vue'

const news = reactive(useContent(() => getNews(3)))
const hobbies = reactive(useContent(getHobbies))
</script>
