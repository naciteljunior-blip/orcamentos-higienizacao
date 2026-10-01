import type { Backup, Configuracoes, Orcamento } from '../types'
import { STATUS } from './constantes'
import { hojeISO } from './calc'

export function montarBackup(configuracoes: Configuracoes, orcamentos: Orcamento[]): Backup {
  return {
    app: 'orcamentos-higienizacao',
    versao: 1,
    exportado_em: new Date().toISOString(),
    configuracoes,
    orcamentos,
  }
}

export function baixarArquivo(conteudo: Blob, nome: string) {
  const url = URL.createObjectURL(conteudo)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function baixarBackup(backup: Backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  baixarArquivo(blob, `backup-orcamentos-${hojeISO()}.json`)
}

/** Lê e confere um arquivo de backup. Lança erro com mensagem amigável se for inválido. */
export function lerBackup(texto: string): Backup {
  let dados: unknown
  try {
    dados = JSON.parse(texto)
  } catch {
    throw new Error('O arquivo não é um backup válido (não foi possível ler o JSON).')
  }
  const b = dados as Partial<Backup>
  if (!b || b.app !== 'orcamentos-higienizacao' || !Array.isArray(b.orcamentos)) {
    throw new Error('Este arquivo não é um backup deste sistema.')
  }
  if (b.versao !== 1) {
    throw new Error(`Versão de backup não suportada (${String(b.versao)}).`)
  }
  for (const o of b.orcamentos) {
    if (typeof o?.numero !== 'number' || !STATUS.includes(o.status)) {
      throw new Error('O backup tem orçamentos com dados inválidos.')
    }
  }
  const numeros = new Set(b.orcamentos.map((o) => o.numero))
  if (numeros.size !== b.orcamentos.length) {
    throw new Error('O backup tem orçamentos com número repetido.')
  }
  return b as Backup
}
