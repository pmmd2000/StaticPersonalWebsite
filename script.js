gsap.registerPlugin(ScrollTrigger);

// Intro animation for the first panel
gsap.to(".panel.first .text", {
    opacity: 1,
    y: 0,
    duration: 1.5,
    ease: "power2.out",
    delay: 0.2
});

// We want a timeline that is controlled by scrolling
// The "scroll-container" will be pinned, and we will scrub through the animations.
// However, since we used absolute positioning for panels, we need a "wrapper" to provide scroll height.
// Let's create a virtual scroll height logic or just wrap everything.

// Actually, let's use the standard "panels" approach where we pin the container
// and swap visibility.

// Create a main timeline
let tl = gsap.timeline({
    scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "+=3000", // 3000px of scrolling distance
        scrub: 1, // Smooth scrubbing
        pin: true, // Pin the body content
        // markers: true // Debug markers (remove later)
    }
});

// 1. Fade out the first text
tl.to(".panel.first .text", {
    opacity: 0,
    y: -50,
    blur: 10,
    duration: 1
});

// 2. Bring in the second panel and its text
tl.to(".panel.second", {
    autoAlpha: 1, // handles opacity and visibility
    duration: 0.5 // faster transition for the container
}, "-=0.5"); // overlap slightly

tl.fromTo(".panel.second .text",
    { opacity: 0, y: 50, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 1 }
);

// 3. Hold the second text for a bit (empty tween)
tl.to({}, { duration: 1 });

// 4. Fade out second text
tl.to(".panel.second .text", {
    opacity: 0,
    scale: 1.05,
    filter: "blur(10px)",
    duration: 1
});

// 5. Bring in third panel
tl.to(".panel.third", {
    autoAlpha: 1,
    duration: 0.5
}, "-=0.5");

tl.fromTo(".social-links",
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1 }
);

// Add some staggered animation for the links themselves if possible
tl.from(".social-link", {
    y: 20,
    opacity: 0,
    stagger: 0.2,
    duration: 0.5
}, "-=0.5");

// Final padding
tl.to({}, { duration: 1 });
