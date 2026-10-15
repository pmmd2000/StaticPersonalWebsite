import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { SplitText } from 'gsap/SplitText'
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, SplitText)

export { gsap, SplitText }

export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function scrambleIn(el, { chars = 'upperCase', duration = 1.1, speed = 0.6, delay = 0, revealDelay = 0 } = {}) {
    if (!el || prefersReducedMotion()) return null
    return gsap.to(el, { delay, duration, scrambleText: { text: el.textContent, chars, speed, revealDelay } })
}

// Scrambles every [data-scramble-h] inside root as it scrolls into view.
export function useScrambleHeadings(rootRef) {
    let triggers = []
    onMounted(() => {
        if (prefersReducedMotion() || !rootRef.value) return
        triggers = [...rootRef.value.querySelectorAll('[data-scramble-h]')].map((h) =>
            ScrollTrigger.create({ trigger: h, start: 'top 90%', once: true, onEnter: () => scrambleIn(h, { duration: 0.9 }) })
        )
    })
    onBeforeUnmount(() => triggers.forEach((t) => t.kill()))
}

// Fades and lifts [data-reveal] children of rootRef as they scroll in. Runs
// again whenever `source` changes, since list items arrive after the fetch.
export function useReveal(rootRef, source, { y = 28, stagger = 0.1, start = 'top 92%' } = {}) {
    let triggers = []
    const run = async () => {
        await nextTick()
        if (!rootRef.value || prefersReducedMotion()) return
        const els = [...rootRef.value.querySelectorAll('[data-reveal]:not([data-revealed])')]
        if (!els.length) return
        els.forEach((el) => {
            el.dataset.revealed = ''
            gsap.set(el, { opacity: 0, y })
        })
        triggers.push(
            ...ScrollTrigger.batch(els, {
                once: true,
                start,
                onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger })
            })
        )
    }
    onMounted(run)
    if (source) watch(source, run)
    onBeforeUnmount(() => triggers.forEach((t) => t.kill()))
}
