import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // caminhos relativos: o mesmo build funciona no GitHub Pages (/nome-do-repo/) ou em qualquer domínio
  base: './',
  plugins: [react()],
  server: {
    host: true,
  },
})
