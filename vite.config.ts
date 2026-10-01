import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => ({
  // caminhos relativos: o mesmo build funciona no GitHub Pages (/nome-do-repo/) ou em qualquer domínio
  base: './',
  // a página do claude.ai precisa de um arquivo único, com CSS e JS embutidos
  plugins: mode === 'artifact' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'artifact' ? { outDir: 'dist-artifact', copyPublicDir: false } : {},
  server: {
    host: true,
  },
}))
