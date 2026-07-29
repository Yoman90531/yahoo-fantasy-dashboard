import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/fantasy/',
  plugins: [react()],
  server: {
    proxy: {
      '/fantasy/api': {
        target: 'http://localhost:8000',
        rewrite: path => path.replace(/^\/fantasy/, ''),
      },
    },
  },
})
