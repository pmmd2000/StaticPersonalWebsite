<template>
  <!-- Fallback art for a hobby without a photo or icon, in the design's
       line-art style: stroke follows currentColor, two fixed accent dots. -->
  <svg
    viewBox="0 0 150 96"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    aria-hidden="true"
    class="motif"
    :style="{ width: size }"
  >
    <rect x="1" y="1" width="148" height="94" rx="10" />
    <path d="M18 30h62M18 48h84M18 66h46" />
    <circle cx="122" cy="30" r="3" class="a" />
    <circle cx="132" cy="30" r="3" class="g" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: String, default: '60%' },
  strokeWidth: { type: [Number, String], default: 1.2 }
})
</script>

<style scoped>
.motif {
  display: block;
  max-width: 100%;
  height: auto;
}

.a,
.g {
  stroke: none;
}

.a {
  fill: var(--accent);
}

.g {
  fill: var(--green);
}
</style>
