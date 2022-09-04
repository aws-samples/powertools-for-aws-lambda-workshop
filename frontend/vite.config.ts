import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "./runtimeConfig": "./runtimeConfig.browser" } },
  build: {
    outDir: "build",
  },
  server: {
    host: true,
    port: 8080,
  }
})
