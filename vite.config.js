import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// `npm run dev:ui` serves the SPA with hot reload and proxies the Worker
// routes to `npm run dev` (wrangler) on :8787.
const worker = 'http://localhost:8787'

export default defineConfig({
    plugins: [vue()],
    build: {
        outDir: 'dist'
    },
    server: {
        proxy: {
            '/api': worker,
            '/mcp': worker,
            '/authorize': worker,
            '/oauth': worker,
            '/.well-known': worker
        }
    }
})
