// Converte o build de arquivo único (dist-artifact/index.html) no formato da página
// do claude.ai: sem <html>/<head>/<body> (o claude.ai cria o esqueleto) e sem
// manifest/ícones, que a página não usa.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const html = readFileSync('dist-artifact/index.html', 'utf8')
const estilos = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0])
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0])
if (!estilos.length || !scripts.length) throw new Error('build inesperado: CSS ou JS não embutido')

const pagina = [
  '<title>Orçamentos Higienização</title>',
  '<meta name="robots" content="noindex">',
  ...estilos,
  '<div id="root"></div>',
  ...scripts,
  '',
].join('\n')

mkdirSync('artifact', { recursive: true })
writeFileSync('artifact/orcamentos.html', pagina)
console.log(`artifact/orcamentos.html: ${(pagina.length / 1024).toFixed(0)} KB`)
