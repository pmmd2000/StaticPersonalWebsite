<template>
  <div class="app">
    <!-- Contact Button -->
    <ContactButton @open="showDialog = true" />
    
    <!-- Background Glow -->
    <div class="glow-effect" ref="glowEffect"></div>

    <!-- Volumetric mote field (parallaxes with the pointer) -->
    <div class="depth-field" aria-hidden="true">
      <div class="depth-field__inner" ref="depthField">
        <span
          v-for="(m, i) in motes"
          :key="i"
          class="mote"
          :style="m"
        ></span>
      </div>
    </div>


    <!-- Contact Dialog -->
    <ContactDialog 
      :visible="showDialog" 
      @close="showDialog = false" 
    />
    
    <!-- Scroll Container -->
    <div class="scroll-container" ref="scrollContainer">
      <section class="panel first" ref="firstPanel">
        <div class="tilt">
          <h1 class="text" ref="firstText">I'm Parham Monfared</h1>
        </div>
      </section>
      <section class="panel second" ref="secondPanel">
        <div class="tilt">
          <h1 class="text">An Infrastructure Engineer</h1>
        </div>
      </section>
      <section class="panel third" ref="thirdPanel">
        <div class="tilt">
          <div class="social-links">
            <a href="https://github.com/pmmd2000" target="_blank" class="social-link-wrapper">
              <img :src="githubLogo" alt="GitHub" class="social-icon" />
              <span class="social-link">GitHub</span>
            </a>
            <a href="https://www.linkedin.com/in/parham-monfared" target="_blank" class="social-link-wrapper">
              <img :src="linkedinLogo" alt="LinkedIn" class="social-icon" />
              <span class="social-link">LinkedIn</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ContactButton from './components/ContactButton.vue'
import ContactDialog from './components/ContactDialog.vue'
import githubLogo from './GitHub_Invertocat_White.png'
import linkedinLogo from './InBug-White.png'


gsap.registerPlugin(ScrollTrigger)

const showDialog = ref(false)
const scrollContainer = ref(null)
const firstPanel = ref(null)
const secondPanel = ref(null)
const thirdPanel = ref(null)
const firstText = ref(null)
const glowEffect = ref(null)
const depthField = ref(null)


let tl = null
let teardownPointer = null

// Deterministic mote cloud: a fixed seed means every visitor sees the same
// field, and there is no per-frame randomness to make the motion unpredictable.
const motes = buildMotes(70)

function buildMotes(count) {
  let seed = 20260805
  const rand = () => {
    // Mulberry32 — cheap, stable across browsers
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const out = []
  for (let i = 0; i < count; i++) {
    const z = -520 + rand() * 700           // depth, px
    const depth = (z + 520) / 700           // 0 = far, 1 = near
    // Floor of 1.7px: perspective shrinks distant motes by ~0.54x, and anything
    // that lands under a pixel renders inconsistently across screen densities.
    const size = 1.7 + depth * 2.9
    const crimson = rand() < 0.42

    out.push({
      width: size.toFixed(2) + 'px',
      height: size.toFixed(2) + 'px',
      transform: `translate3d(${(rand() * 144 - 72).toFixed(2)}vw, ${(rand() * 144 - 72).toFixed(2)}vh, ${z.toFixed(1)}px)`,
      background: crimson
        ? 'rgba(190, 30, 30, 0.95)'
        : 'rgba(255, 255, 255, 0.95)',
      boxShadow: crimson
        ? `0 0 ${(4 + depth * 9).toFixed(1)}px rgba(139, 0, 0, 0.9)`
        : `0 0 ${(3 + depth * 7).toFixed(1)}px rgba(255, 255, 255, 0.55)`,
      '--o-min': (0.06 + depth * 0.14).toFixed(3),
      '--o-max': (0.3 + depth * 0.55).toFixed(3),
      '--dur': (4 + rand() * 7).toFixed(2) + 's',
      '--delay': (rand() * -9).toFixed(2) + 's'
    })
  }
  return out
}

function refreshTriggers() {
  ScrollTrigger.refresh()
}

onMounted(async () => {
  // Wait for Vue to patch the DOM, then for the browser to lay it out. A fixed
  // setTimeout raced the layout: ScrollTrigger measured a page with no scroll
  // room, clamped `end` to 0, and never applied the 2000px of pin spacing —
  // which left the scroll narrative unreachable.
  await nextTick()
  initAnimations()
  initPointer3D()

  // Two frames, deliberately: the first lets the browser lay out the .pin-spacer
  // ScrollTrigger just injected, the second measures it. Refreshing any earlier
  // re-measures the same stale layout and `end` stays clamped at 0.
  requestAnimationFrame(() => requestAnimationFrame(refreshTriggers))

  // The web font and the social icons both change layout after first paint,
  // so re-measure once they land rather than trusting the first measurement.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refreshTriggers)
  }
  window.addEventListener('load', refreshTriggers)
})

onUnmounted(() => {
  // Clean up ScrollTrigger instances
  if (tl) {
    tl.kill()
  }
  ScrollTrigger.getAll().forEach(st => st.kill())
  window.removeEventListener('load', refreshTriggers)
  if (teardownPointer) {
    teardownPointer()
  }
})


function initAnimations() {
  // Calculate total timeline duration needed
  // Total: ~6 duration units
  
  // Pin the scroll container, NOT body. Pinning body makes GSAP wrap <body> in
  // a .pin-spacer div, which leaves document.body === null — GSAP then throws on
  // its next DOM write, the timeline reverts, and the third panel never appears
  // at the end of the scroll.
  tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".scroll-container",
      start: "top top",
      end: "+=2000", // Reduced scroll distance to remove extra space
      scrub: 0.8,
      pin: ".scroll-container",
      anticipatePin: 1,
      invalidateOnRefresh: true,
    }
  })

  // ===== PHASE 1: First Panel (0 - 1.5 duration) =====
  // Hold first panel visible at start
  tl.to({}, { duration: 0.5 })

  // Animate Glow: slight pulse
  tl.to(".glow-effect", { 
    scale: 1.2, 
    opacity: 0.8, 
    duration: 1.5,
    ease: "power2.inOut" 
  }, 0)

  // Fade out first panel CONTAINER (fixes z-index blocking issue)
  // autoAlpha: 0 handles opacity and visibility: hidden
  tl.to(".panel.first", {
    autoAlpha: 0,
    y: -50,
    duration: 1
  }, 0.5)

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

  // Animate Glow: shift position/shape for second panel
  tl.to(".glow-effect", { 
    scale: 1.5, 
    width: "800px", 
    height: "500px",
    borderRadius: "40%",
    duration: 2
  }, "<")

  // Hold second panel visible
  tl.to({}, { duration: 0.5 })

  // Fade out second panel container (safety)
  tl.to(".panel.second", {
    autoAlpha: 0, 
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
  
  // Animate Glow: large expansion for finale
  tl.to(".glow-effect", { 
    scale: 2, 
    opacity: 1,
    width: "1000px",
    height: "1000px",
    borderRadius: "50%",
    duration: 2
  }, "<")

  // Animate social links container with explicit fromTo
  tl.fromTo(".social-links",
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.8 }
  )

  // Animate individual links with explicit fromTo and stagger
  tl.fromTo(".social-link",
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, stagger: 0.2, duration: 0.6 } 
  , "-=0.4")

  // ===== PHASE 4: Hold at end =====
  // Short hold to ensure stability, but reduced to prevent "extra space"
  tl.to({}, { duration: 0.5 })
}

// ===== Pointer-driven 3D =====
// Every value is clamped and eased toward its target via quickTo, so the scene
// tracks the cursor without snapping or overshoot. Nothing here writes to the
// elements the scroll timeline owns (.panel, .text, .social-links).
function initPointer3D() {
  const coarse = !window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (coarse || reduced) return

  const tilts = Array.from(document.querySelectorAll('.tilt'))
  const ease = 'power3.out'

  // Content planes: a restrained tilt, plus a little lift toward the cursor.
  const plane = tilts.map(el => ({
    rx: gsap.quickTo(el, 'rotationX', { duration: 0.75, ease }),
    ry: gsap.quickTo(el, 'rotationY', { duration: 0.75, ease }),
    x: gsap.quickTo(el, 'x', { duration: 0.9, ease }),
    y: gsap.quickTo(el, 'y', { duration: 0.9, ease })
  }))

  // Mote cloud: rotates further than the content, which is what produces the
  // depth separation between near and far points.
  const field = depthField.value
    ? {
        rx: gsap.quickTo(depthField.value, 'rotationX', { duration: 1.1, ease }),
        ry: gsap.quickTo(depthField.value, 'rotationY', { duration: 1.1, ease })
      }
    : null

  // Glow drifts opposite the cursor — reads as a light source behind the scene.
  // Safe to animate x/y here: the scroll timeline only touches scale/size/opacity.
  const glow = glowEffect.value
    ? {
        x: gsap.quickTo(glowEffect.value, 'x', { duration: 1.4, ease }),
        y: gsap.quickTo(glowEffect.value, 'y', { duration: 1.4, ease })
      }
    : null

  let queued = false
  let nx = 0
  let ny = 0

  const apply = () => {
    queued = false

    plane.forEach(p => {
      p.ry(nx * 9)
      p.rx(-ny * 7)
      p.x(nx * 14)
      p.y(ny * 10)
    })

    if (field) {
      field.ry(nx * 17)
      field.rx(-ny * 13)
    }

    if (glow) {
      glow.x(-nx * 55)
      glow.y(-ny * 40)
    }
  }

  const onMove = e => {
    nx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1))
    ny = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1))
    if (!queued) {
      queued = true
      requestAnimationFrame(apply)
    }
  }

  const onLeave = () => {
    nx = 0
    ny = 0
    if (!queued) {
      queued = true
      requestAnimationFrame(apply)
    }
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerleave', onLeave)

  teardownPointer = () => {
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerleave', onLeave)
  }
}
</script>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
}
</style>
