<template>
  <!-- "Contact me" pill: on hover / focus (or first tap on touch screens) it
       widens in place to show the address and a copy button. -->
  <div
    ref="root"
    class="contact"
    :class="{ open, copied }"
    @mouseenter="open = true"
    @mouseleave="open = false"
    @focusin="open = true"
    @focusout="onFocusOut"
  >
    <a class="seg label" :href="MAILTO" :aria-hidden="open" :tabindex="open ? -1 : 0" @click="onLabelClick">
      <span class="inner">Contact me <span class="arrow" aria-hidden="true">→</span></span>
    </a>
    <div class="seg reveal" :aria-hidden="!open">
      <span class="inner">
        <a class="email" :href="MAILTO" :tabindex="open ? 0 : -1">{{ EMAIL }}</a>
        <button
          class="copy"
          type="button"
          :tabindex="open ? 0 : -1"
          :aria-label="copied ? 'Copied' : 'Copy email address'"
          :title="copied ? 'Copied' : 'Copy'"
          @click="copy"
        >
          <svg v-if="!copied" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="7" y="7" width="10" height="10" rx="2" />
            <path d="M13 4.5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h.5" />
          </svg>
          <svg v-else viewBox="0 0 20 20" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
        </button>
      </span>
    </div>
    <span class="sr-only" aria-live="polite">{{ copied ? 'Email address copied' : '' }}</span>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const EMAIL = 'info@parhammonfared.com'
const MAILTO = `mailto:${EMAIL}`

const root = ref(null)
const open = ref(false)
const copied = ref(false)
let copiedTimer = 0

const touch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

// Touch screens have no hover: the first tap opens the pill instead of
// jumping straight into the mail app.
function onLabelClick(e) {
  if (touch && !open.value) {
    e.preventDefault()
    open.value = true
  }
}

function onFocusOut(e) {
  if (!root.value.contains(e.relatedTarget)) open.value = false
}

async function copy() {
  try {
    await navigator.clipboard.writeText(EMAIL)
  } catch {
    // Older browsers / non-secure contexts
    const field = Object.assign(document.createElement('textarea'), { value: EMAIL })
    field.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(field)
    field.select()
    document.execCommand('copy')
    field.remove()
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 1800)
}

// On touch, tapping anywhere else closes it again.
function onDocTap(e) {
  if (open.value && !root.value.contains(e.target)) open.value = false
}
onMounted(() => touch && document.addEventListener('pointerdown', onDocTap))
onBeforeUnmount(() => {
  clearTimeout(copiedTimer)
  document.removeEventListener('pointerdown', onDocTap)
})
</script>

<style scoped>
.contact {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  min-height: 48px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font: 600 1rem var(--font-body);
  overflow: hidden;
  transition: background-color 0.25s ease, box-shadow 0.35s ease;
}

.contact.open {
  background: #ffc296;
  box-shadow: 0 0 0 4px rgba(255, 178, 122, 0.18);
}

/* Each half collapses to zero width; max-width is what animates. */
.seg {
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  transition: max-width 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 0.3s ease;
}

.label {
  max-width: 12rem;
  color: inherit;
  text-decoration: none;
}

.reveal {
  max-width: 0;
  opacity: 0;
}

.contact.open .label {
  max-width: 0;
  opacity: 0;
}

.contact.open .reveal {
  max-width: 26rem;
  opacity: 1;
}

.inner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 22px;
}

.reveal .inner {
  gap: 4px;
  padding: 0 6px 0 22px;
}

.email {
  color: inherit;
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.92rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.email:hover {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.copy {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin-left: 6px;
  border: 0;
  border-left: 1px solid rgba(26, 18, 11, 0.18);
  border-radius: 0 999px 999px 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.copy:hover,
.copy:focus-visible {
  background: rgba(26, 18, 11, 0.08);
}

.copy svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.contact.copied .copy {
  color: #1d6b55;
}

.arrow {
  display: inline-block;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
