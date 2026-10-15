<template>
  <RouterView />
  <ContactDialog :visible="contactOpen" @close="contactOpen = false" />
</template>

<script setup>
import { provide, ref } from 'vue'
import ContactDialog from './components/ContactDialog.vue'

// Any page can open the contact dialog via inject('openContact').
const contactOpen = ref(false)
provide('openContact', () => (contactOpen.value = true))
</script>
