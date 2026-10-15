import { onMounted, ref } from 'vue'

// Loads a list from the public API with loaded/error flags for the views.
export function useContent(loader) {
    const items = ref([])
    const loaded = ref(false)
    const error = ref(false)
    onMounted(async () => {
        try {
            items.value = await loader()
        } catch {
            error.value = true
        } finally {
            loaded.value = true
        }
    })
    return { items, loaded, error }
}
