import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __DEV__: process.env.NODE_ENV !== 'production'
  },
  plugins: []
})
