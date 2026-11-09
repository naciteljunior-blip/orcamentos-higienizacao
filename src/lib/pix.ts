import type { Configuracoes, ContaPix, Orcamento } from '../types'

/**
 * Chave PIX que vale para o orçamento: a escolhida nele (com os dados atuais dos ajustes,
 * se a chave ainda existir lá) ou, sem escolha, a padrão. null quando não há chave nenhuma.
 */
export function pixDoOrcamento(o: Pick<Orcamento, 'pix'>, config: Pick<Configuracoes, 'pix_contas'>): ContaPix | null {
  if (o.pix) return config.pix_contas.find((c) => c.id === o.pix!.id) ?? o.pix
  return config.pix_contas[0] ?? null
}

/** "Nubank · 11 91234-5678" para mostrar nas opções. */
export function nomeContaPix(c: ContaPix): string {
  return [c.banco.trim(), c.chave.trim()].filter(Boolean).join(' · ') || 'Chave sem nome'
}
