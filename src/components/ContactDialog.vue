<template>
  <div 
    class="dialog-overlay" 
    :class="{ visible: visible }"
    @click.self="closeDialog"
  >
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h2 class="dialog-title">Get in Touch</h2>
        <button class="dialog-close" @click="closeDialog" aria-label="Close">
          ×
        </button>
      </div>
      
      <form class="contact-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="name">Name</label>
          <input 
            id="name"
            type="text" 
            class="form-input" 
            v-model="form.name"
            placeholder="Your name"
            required
            :disabled="isSubmitting"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input 
            id="email"
            type="email" 
            class="form-input" 
            v-model="form.email"
            placeholder="your@email.com"
            required
            :disabled="isSubmitting"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label" for="message">Message</label>
          <textarea 
            id="message"
            class="form-textarea" 
            v-model="form.message"
            placeholder="What would you like to say?"
            required
            :disabled="isSubmitting"
          ></textarea>
        </div>
        
        <div v-if="statusMessage" class="status-message" :class="statusType">
          {{ statusMessage }}
        </div>
        
        <button 
          type="submit" 
          class="submit-button"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Sending...' : 'Send Message' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { sendContact } from '../api.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const form = reactive({
  name: '',
  email: '',
  message: ''
})

const isSubmitting = ref(false)
const statusMessage = ref('')
const statusType = ref('')

// Reset form when dialog is opened
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

function resetForm() {
  form.name = ''
  form.email = ''
  form.message = ''
  statusMessage.value = ''
  statusType.value = ''
}

function closeDialog() {
  emit('close')
}

async function handleSubmit() {
  if (isSubmitting.value) return
  
  isSubmitting.value = true
  statusMessage.value = ''
  
  try {
    await sendContact({ ...form })
    statusType.value = 'success'
    statusMessage.value = "Message sent! I'll get back to you soon."
    form.name = ''
    form.email = ''
    form.message = ''
    setTimeout(closeDialog, 2000)
  } catch (error) {
    statusType.value = 'error'
    statusMessage.value = error.status ? error.message : 'Network error. Please check your connection and try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
