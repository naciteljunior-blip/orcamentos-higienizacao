// Onde o app está rodando: site próprio (GitHub Pages) ou página do claude.ai.
// Na página do claude.ai o banco, os downloads e as confirmações funcionam de outro jeito.

export const MODO_ARTIFACT = import.meta.env.VITE_MODO === 'artifact'

interface DownloadsCap {
  save(pedido: { filename: string; data: Blob | string }): Promise<{ status: 'saved' | 'delivered' }>
}

interface ClaudeGlobal {
  use(nome: string): Promise<unknown>
}

/** Recurso do claude.ai (`db`, `downloads`, ...) ou null quando indisponível. */
export async function usarRecurso<T>(nome: string): Promise<T | null> {
  const claude = (window as unknown as { claude?: ClaudeGlobal }).claude
  if (!claude?.use) return null
  try {
    return ((await claude.use(nome)) as T | null) ?? null
  } catch {
    return null
  }
}

function baixarPorLink(conteudo: Blob, nome: string) {
  const url = URL.createObjectURL(conteudo)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Entrega um arquivo ao usuário. No claude.ai pede confirmação ao app
 * (no celular abre o compartilhamento); no site próprio baixa direto.
 * Retorna false se o usuário cancelou.
 */
export async function salvarArquivo(conteudo: Blob, nome: string): Promise<boolean> {
  if (MODO_ARTIFACT) {
    const downloads = await usarRecurso<DownloadsCap>('downloads')
    if (!downloads) throw new Error('Não foi possível salvar arquivos nesta tela.')
    try {
      await downloads.save({ filename: nome, data: conteudo })
      return true
    } catch (e) {
      const codigo = (e as { code?: string }).code
      if (codigo === 'declined') return false
      if (codigo === 'rate_limited') throw new Error('Já existe um arquivo aguardando confirmação.')
      throw new Error((e as { message?: string }).message ?? 'Não foi possível salvar o arquivo.')
    }
  }
  baixarPorLink(conteudo, nome)
  return true
}
