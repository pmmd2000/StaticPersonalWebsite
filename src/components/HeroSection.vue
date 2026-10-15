<template>
  <section class="hero">
    <div class="hero-bg" aria-hidden="true">
      <span class="orb orb-a"></span>
      <span class="orb orb-b"></span>
      <span class="grid"></span>
    </div>

    <div class="container hero-inner">
      <h1 class="name" aria-label="Parham Monfared">
        <span v-for="(word, w) in words" :key="w" class="word" aria-hidden="true">
          <span
            v-for="(ch, i) in word.chars"
            :key="i"
            class="letter"
            :style="{ '--i': word.offset + i }"
          >{{ ch }}</span>
        </span>
      </h1>

      <nav class="links" aria-label="Elsewhere">
        <a class="btn" href="https://github.com/pmmd2000" target="_blank" rel="noopener">
          <img :src="githubLogo" alt="" /> GitHub
        </a>
        <a class="btn" href="https://www.linkedin.com/in/parham-monfared" target="_blank" rel="noopener">
          <img :src="linkedinLogo" alt="" /> LinkedIn
        </a>
        <button class="btn primary" type="button" @click="openContact">Contact me</button>
      </nav>

      <p class="intro">I'm Parham, a platform engineer, living in the UK.</p>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue'
import githubLogo from '../GitHub_Invertocat_White.png'
import linkedinLogo from '../InBug-White.png'

const openContact = inject('openContact')
// Letters animate individually; words stay unbreakable so the name only
// wraps between "Parham" and "Monfared".
let offset = 0
const words = 'Parham Monfared'.split(' ').map((word) => {
  const entry = { chars: [...word], offset }
  offset += word.length
  return entry
})
</script>

<style scoped>
.hero {
  position: relative;
  min-height: min(88vh, 820px);
  display: flex;
  align-items: center;
  overflow: hidden;
  isolation: isolate;
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 28px;
}

/* Name: letters rise out of a blur one after another, then an accent rule
   draws in underneath. */
.name {
  position: relative;
  margin: 0;
  padding-bottom: 18px;
  font-size: clamp(48px, 11vw, 132px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.03em;
  color: #f6f4fa;
  text-shadow: 0 0 60px rgba(200, 52, 74, 0.35);
}

.name::after {
  content: '';
  position: absolute;
  left: 0.04em;
  bottom: 0;
  height: 3px;
  width: 22%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transform: scaleX(0);
  transform-origin: left;
  animation: draw 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) 0.9s forwards;
}

.word {
  display: inline-block;
  white-space: nowrap;
  margin-right: 0.22em;
}

.letter {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.35em);
  filter: blur(8px);
  animation: rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
  animation-delay: calc(var(--i) * 45ms + 150ms);
}

@keyframes rise {
  to { opacity: 1; transform: none; filter: none; }
}

@keyframes draw {
  to { transform: scaleX(1); }
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  opacity: 0;
  animation: fade 0.8s ease 0.9s forwards;
}

.intro {
  margin: 0;
  font-size: clamp(18px, 2.2vw, 24px);
  color: var(--muted);
  font-weight: 200;
  opacity: 0;
  animation: fade 0.8s ease 1.1s forwards;
}

@keyframes fade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

/* Background: two drifting colour fields over a faint grid. */
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.orb {
  position: absolute;
  width: 55vmax;
  height: 55vmax;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.35;
}

.orb-a {
  background: var(--accent);
  top: -30vmax;
  right: -18vmax;
  animation: drift 22s ease-in-out infinite alternate;
}

.orb-b {
  background: var(--accent-2);
  bottom: -38vmax;
  left: -20vmax;
  opacity: 0.22;
  animation: drift 26s ease-in-out infinite alternate-reverse;
}

@keyframes drift {
  to { transform: translate(-6vmax, 5vmax) scale(1.08); }
}

.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse at 30% 50%, #000 0%, transparent 70%);
}

@media (prefers-reduced-motion: reduce) {
  .letter, .links, .intro { opacity: 1; transform: none; filter: none; }
  .name::after { transform: none; }
}
</style>
