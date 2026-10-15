<template>
  <main ref="root" class="container">
    <SiteHeader />
    <HeroSection />

    <section class="about" aria-label="About">
      <p class="about-line">
        I'm Parham, a <span ref="role" class="role">platform engineer</span>, living in the UK.
      </p>
    </section>

    <section id="news" class="block" aria-labelledby="news-h">
      <div class="section-head">
        <h2 id="news-h" class="section-title" data-scramble-h>Tech news I liked</h2>
        <RouterLink to="/news" class="more-link">More <span aria-hidden="true">→</span></RouterLink>
      </div>
      <NewsList v-bind="news" variant="compact" />
    </section>

    <section id="hobbies" class="block last" aria-labelledby="hob-h">
      <div class="section-head">
        <h2 id="hob-h" class="section-title" data-scramble-h>Hobbies</h2>
        <RouterLink to="/hobbies" class="more-link">Open page <span aria-hidden="true">→</span></RouterLink>
      </div>
      <HobbyList v-bind="hobbies" variant="cards" />
    </section>

    <SiteFooter />
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getHobbies, getNews } from '../api.js'
import { scrambleIn, useScrambleHeadings } from '../motion.js'
import { useContent } from '../useContent.js'
import SiteHeader from '../components/SiteHeader.vue'
import HeroSection from '../components/HeroSection.vue'
import NewsList from '../components/NewsList.vue'
import HobbyList from '../components/HobbyList.vue'
import SiteFooter from '../components/SiteFooter.vue'

const news = reactive(useContent(() => getNews(3)))
const hobbies = reactive(useContent(getHobbies))

const root = ref(null)
const role = ref(null)
useScrambleHeadings(root)
onMounted(() => scrambleIn(role.value, { chars: '01/<>_', delay: 0.5, duration: 1.3, speed: 0.5, revealDelay: 0.3 }))
</script>

<style scoped>
.about {
  padding: 24px 0 96px;
  border-top: 1px solid var(--line);
}

.about-line {
  margin: 40px 0 0;
  max-width: 900px;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(1.6rem, 3.6vw, 2.75rem);
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.role {
  color: var(--accent);
}

.block {
  padding-bottom: 96px;
}

.block.last {
  padding-bottom: 112px;
}
</style>
