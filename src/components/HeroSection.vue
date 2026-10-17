<template>
  <section ref="hero" class="hero" :class="{ touch }" aria-label="Introduction">
    <!-- Touch screens: a fixed strip of light the name scrolls through -->
    <div ref="band" class="light-band" aria-hidden="true"></div>

    <div class="dots" aria-hidden="true">
      <span v-for="i in DOTS" :key="i" ref="dots" class="grid-dot"></span>
    </div>

    <h1 ref="name" class="name">Parham<br />Monfared</h1>

    <div class="links">
      <a class="pill" href="https://github.com/pmmd2000" target="_blank" rel="noopener">
        GitHub <span class="arrow" aria-hidden="true">↗</span>
      </a>
      <span class="dot" aria-hidden="true"></span>
      <a class="pill" href="https://www.linkedin.com/in/parham-monfared" target="_blank" rel="noopener">
        LinkedIn <span class="arrow" aria-hidden="true">↗</span>
      </a>
      <span class="dot" aria-hidden="true"></span>
      <ContactPill />
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap, prefersReducedMotion, SplitText } from '../motion.js'
import ContactPill from './ContactPill.vue'


// 32 columns x 14 rows of dots behind the name; they swell near the cursor.
const DOTS = 448
const hero = ref(null)
const name = ref(null)
const dots = ref([])
const band = ref(null)

// With no hover to reveal the name, touch screens get a fixed horizontal
// light: the page scrolls under it and whatever passes through lights up.
const touch = ref(false)
const BAND_AT = 0.26 // of the viewport height, from the top
const BAND_REACH = 130 // px from the band's centre line to where its light ends
const smooth = (x) => x * x * (3 - 2 * x)

let cleanup = () => {}

onMounted(async () => {
  if (prefersReducedMotion()) return
  await document.fonts?.ready

  // Name: characters rise out of a mask, then fill and thicken near the cursor.
  const split = new SplitText(name.value, { type: 'words,chars', mask: 'words', charsClass: 'ch' })
  const chars = split.chars
  gsap.set(chars, { '--k': 0, '--f': 0 })
  gsap.from(chars, { yPercent: 115, duration: 0.9, ease: 'expo.out', stagger: 0.03 })

  const dotSetters = dots.value.map((d) => ({
    scale: gsap.quickTo(d, 'scale', { duration: 0.5, ease: 'power3' }),
    opacity: gsap.quickTo(d, 'opacity', { duration: 0.5, ease: 'power3' })
  }))

  let dotPos = []
  let charPos = []
  const centre = (el, box) => {
    const r = el.getBoundingClientRect()
    return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]
  }
  const measure = () => {
    const box = hero.value.getBoundingClientRect()
    dotPos = dots.value.map((d) => centre(d, box))
    charPos = chars.map((c) => centre(c, box))
  }
  touch.value = window.matchMedia('(hover: none)').matches
  // Measure once the entrance has settled, so the chars are in place.
  const measureTimer = setTimeout(() => {
    measure()
    if (touch.value) onScroll()
  }, 1000)

  // t: 0 (unlit) .. 1 (fully lit)
  const lightDot = (i, t, swell = 2.4) => {
    dotSetters[i].scale(1 + swell * t)
    dotSetters[i].opacity(0.16 + 0.84 * t)
  }
  const lightChar = (i, t) =>
    gsap.to(chars[i], {
      fontVariationSettings: `"wght" ${Math.round(500 + 300 * t)}, "opsz" 96`,
      '--k': t,
      '--f': t * 0.9,
      duration: 0.45,
      ease: 'power2.out',
      overwrite: 'auto'
    })

  const onMove = (e) => {
    if (!charPos.length) return
    const box = hero.value.getBoundingClientRect()
    const x = e.clientX - box.left
    const y = e.clientY - box.top
    dotPos.forEach(([dx, dy], i) => lightDot(i, Math.max(0, 1 - Math.hypot(dx - x, dy - y) / 170)))
    charPos.forEach(([cx, cy], i) => lightChar(i, Math.max(0, 1 - Math.hypot(cx - x, cy - y) / 280)))
  }

  // Touch: light by vertical distance to the fixed band, recomputed per frame
  // while scrolling.
  let frame = 0
  const onScroll = () => {
    if (frame || !charPos.length) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const box = hero.value.getBoundingClientRect()
      const bandY = innerHeight * BAND_AT - box.top // band centre, in hero coordinates
      const lit = (y) => smooth(Math.max(0, 1 - Math.abs(y - bandY) / BAND_REACH))
      dotPos.forEach(([, dy], i) => lightDot(i, lit(dy), 1.6))
      charPos.forEach(([, cy], i) => lightChar(i, lit(cy)))
      // Fade the strip out once the hero has scrolled up past it.
      const left = Math.min(1, Math.max(0, (box.bottom - innerHeight * BAND_AT) / 160))
      band.value.style.opacity = String(left)
      // Pin it in px: mobile browsers resize the viewport as the URL bar hides.
      band.value.style.top = `${innerHeight * BAND_AT}px`
    })
  }
  const onLeave = () => {
    dotSetters.forEach((s) => {
      s.scale(1)
      s.opacity(0.16)
    })
    gsap.to(chars, { fontVariationSettings: '"wght" 500, "opsz" 96', '--k': 0, '--f': 0, duration: 0.6, overwrite: 'auto' })
  }

  if (touch.value) {
    window.addEventListener('scroll', onScroll, { passive: true })
  } else {
    hero.value.addEventListener('pointermove', onMove)
    hero.value.addEventListener('pointerleave', onLeave)
  }
  window.addEventListener('resize', measure)

  cleanup = () => {
    clearTimeout(measureTimer)
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', onScroll)
    hero.value?.removeEventListener('pointermove', onMove)
    hero.value?.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('resize', measure)
    split.revert()
  }
})

onBeforeUnmount(() => cleanup())
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 560px;
  padding: 56px 0 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* The light strip: fixed to the viewport, soft at both edges, only on touch
   screens. Scrolling moves the page under it. */
.light-band {
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  top: 26vh;
  height: 260px;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 0;
  background:
    linear-gradient(
      to bottom,
      transparent 0%,
      rgba(255, 178, 122, 0.05) 30%,
      rgba(255, 178, 122, 0.11) 50%,
      rgba(255, 178, 122, 0.05) 70%,
      transparent 100%
    );
  transition: opacity 0.3s linear;
}

.hero.touch .light-band {
  display: block;
}

.dots {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(32, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  place-items: center;
  pointer-events: none;
}

.grid-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--green);
  opacity: 0.16;
}

.name {
  position: relative;
  margin: 0;
  font-family: var(--font-display);
  font-weight: 500;
  font-variation-settings: 'wght' 500, 'opsz' 96;
  font-size: clamp(3.6rem, 12.5vw, 11rem);
  line-height: 0.92;
  letter-spacing: -0.035em;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--stroke);
}

/* SplitText chars: --f fills with the accent, --k tints the outline. */
.name :deep(.ch) {
  color: color-mix(in srgb, var(--accent) calc(var(--f, 0) * 100%), transparent);
  -webkit-text-stroke-color: color-mix(in srgb, var(--accent) calc(var(--k, 0) * 100%), var(--stroke));
}

.links {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 44px;
}

@media (max-width: 560px) {
  .hero {
    min-height: 460px;
  }
  .links .dot {
    display: none;
  }
}
</style>
