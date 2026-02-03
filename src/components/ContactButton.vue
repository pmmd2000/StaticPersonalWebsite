<template>
  <button class="contact-button" @click="$emit('open')">
    Contact Me
  </button>
</template>

<script setup>
defineEmits(['open'])
</script>
