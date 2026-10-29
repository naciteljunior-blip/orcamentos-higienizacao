import type { Backup, Configuracoes, Orcamento } from '../types'
import { STATUS } from './constantes'
import { hojeISO } from './calc'
import { salvarArquivo } from './plataforma'
import { blobParaDataUrl } from './imagem'

export function montarBackup(configuracoes: Configuracoes, orcamentos: Orcamento[]): Backup {
  return {
    app: 'orcamentos-higienizacao',
    versao: 1,
    exportado_em: new Date().toISOString(),
    configuracoes,
    orcamentos,
  }
}

/**
 * Coloca as fotos dentro do backup (como imagem), para o arquivo funcionar em outro lugar:
 * as fotos guardadas no claude.ai só abrem lá.
 */
export async function embutirFotos(orcamentos: Orcamento[], urlFoto: (ref: string) => string): Promise<Orcamento[]> {
  const resultado: Orcamento[] = []
  for (const o of orcamentos) {
    const fotos = []
    for (const f of o.fotos) {
      if (f.ref.startsWith('data:')) {
        fotos.push(f)
        continue
      }
      try {
        const resposta = await fetch(urlFoto(f.ref))
        if (!resposta.ok) throw new Error()
        fotos.push({ ...f, ref: await blobParaDataUrl(await resposta.blob()) })
      } catch {
        fotos.push(f) // foto inacessível: fica a referência, como antes
      }
    }
    resultado.push({ ...o, fotos })
  }
  return resultado
}

export function baixarBackup(backup: Backup): Promise<boolean> {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  return salvarArquivo(blob, `backup-orcamentos-${hojeISO()}.json`)
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
