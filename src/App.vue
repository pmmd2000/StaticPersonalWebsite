<template>
  <div class="app">
    <!-- Contact Button -->
    <ContactButton @open="showDialog = true" />
    
    <!-- Contact Dialog -->
    <ContactDialog 
      :visible="showDialog" 
      @close="showDialog = false" 
    />
    
    <!-- Scroll Container -->
    <div class="scroll-container" ref="scrollContainer">
      <section class="panel first" ref="firstPanel">
        <h1 class="text" ref="firstText">I'm Parham Monfared</h1>
      </section>
      <section class="panel second" ref="secondPanel">
        <h1 class="text">An Infrastructure Engineer</h1>
      </section>
      <section class="panel third" ref="thirdPanel">
        <div class="social-links">
          <a href="https://github.com/pmmd2000" target="_blank" class="social-link">
            github.com/pmmd2000
          </a>
          <a href="https://www.linkedin.com/in/parham-monfared" target="_blank" class="social-link">
            linkedin.com/in/parham-monfared
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ContactButton from './components/ContactButton.vue'
import ContactDialog from './components/ContactDialog.vue'

gsap.registerPlugin(ScrollTrigger)

const showDialog = ref(false)
const scrollContainer = ref(null)
const firstPanel = ref(null)
const secondPanel = ref(null)
const thirdPanel = ref(null)
const firstText = ref(null)

let tl = null

onMounted(() => {
  // Small delay to ensure DOM is fully ready
  setTimeout(() => {
    initAnimations()
  }, 100)
})

onUnmounted(() => {
  // Clean up ScrollTrigger instances
  if (tl) {
    tl.kill()
  }
  ScrollTrigger.getAll().forEach(st => st.kill())
})

function initAnimations() {
  // Calculate total timeline duration needed
  // We want: first visible (0.5) -> fade out first (1) -> fade in second (1) -> 
  // hold second (0.5) -> fade out second (1) -> fade in third (1) -> hold third (1)
  // Total: ~6 duration units
  
  tl = gsap.timeline({
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "+=3000", // 3000px scroll distance
      scrub: 0.8,
      pin: true,
    }
  })

  // ===== PHASE 1: First Panel (0 - 1.5 duration) =====
  // Hold first panel visible at start
  tl.to({}, { duration: 0.5 })

  // Fade out first panel text
  tl.to(".panel.first .text", {
    opacity: 0,
    y: -50,
    duration: 1
  })

  // ===== PHASE 2: Second Panel (1.5 - 4 duration) =====
  // Show second panel container
  tl.to(".panel.second", {
    autoAlpha: 1,
    duration: 0.3
  }, "-=0.3")

  // Fade in second panel text
  tl.fromTo(".panel.second .text",
    { opacity: 0, y: 50, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 1 }
  )

  // Hold second panel visible
  tl.to({}, { duration: 0.5 })

  // Fade out second panel text
  tl.to(".panel.second .text", {
    opacity: 0,
    scale: 1.05,
    filter: "blur(10px)",
    duration: 1
  })

  // ===== PHASE 3: Third Panel (4 - 6 duration) =====
  // Show third panel container
  tl.to(".panel.third", {
    autoAlpha: 1,
    duration: 0.3
  }, "-=0.3")

  // Animate social links container with explicit fromTo
  tl.fromTo(".social-links",
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.8 }
  )

  // Animate individual links with explicit fromTo and stagger
  tl.fromTo(".social-link",
    { opacity: 0, y: 20 },
    { opacity: 0.7, y: 0, stagger: 0.2, duration: 0.6 }  // Target CSS opacity is 0.7
  , "-=0.4")

  // ===== PHASE 4: Hold at end =====
  // Extended hold to ensure third panel stays visible at scroll end
  tl.to({}, { duration: 1 })
}
</script>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
}
</style>
