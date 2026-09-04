import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo, Vite corre en su propio puerto (5173) pero las llamadas a
// /api se redirigen al backend Express (puerto 3000) — así el navegador
// nunca nota la diferencia y las cookies de sesión funcionan igual que en
// producción (donde Express sirve directamente el build de este frontend).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
