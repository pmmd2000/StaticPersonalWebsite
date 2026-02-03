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
  // Create main timeline controlled by scrolling
  // Extended scroll distance to ensure all panels are reachable
  tl = gsap.timeline({
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "+=4000", // Extended for all animations to complete
      scrub: 0.5, // Faster scrub for more responsive feel
      pin: true,
    }
  })

  // Phase 1: First text visible, then fades out (0-1.5)
  // Initial hold so first panel is visible at start
  tl.to({}, { duration: 0.3 })

  // Fade out the first text
  tl.to(".panel.first .text", {
    opacity: 0,
    y: -50,
    duration: 0.7
  })

  // Phase 2: Second panel appears (1.5-3.5)
  // Bring in the second panel container
  tl.to(".panel.second", {
    autoAlpha: 1,
    duration: 0.3
  }, "-=0.2")

  // Animate second text in
  tl.fromTo(".panel.second .text",
    { opacity: 0, y: 50, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.7 }
  )

  // Hold the second text visible
  tl.to({}, { duration: 0.5 })

  // Fade out second text
  tl.to(".panel.second .text", {
    opacity: 0,
    scale: 1.05,
    filter: "blur(10px)",
    duration: 0.7
  })

  // Phase 3: Third panel appears and stays (3.5-5)
  // Bring in third panel
  tl.to(".panel.third", {
    autoAlpha: 1,
    duration: 0.3
  }, "-=0.2")

  // Animate social links container
  tl.fromTo(".social-links",
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.7 }
  )

  // Staggered animation for individual links
  tl.from(".social-link", {
    y: 20,
    opacity: 0,
    stagger: 0.15,
    duration: 0.4
  }, "-=0.3")

  // Phase 4: Long final hold to keep third panel visible at end of scroll
  // This is critical - ensures the final state persists
  tl.to({}, { duration: 1.5 })
}
</script>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
}
</style>
