import type { Configuracoes, ContaPix, Orcamento } from '../types'
import { pixCopiaECola } from './brcode'
import { numeroFormatado, total } from './calc'

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

/**
 * "PIX copia e cola" do orçamento, com o valor total (parcelado: sem valor, o cliente digita a parcela).
 * null quando não há chave.
 */
export function copiaEColaDoOrcamento(
  o: Pick<Orcamento, 'pix' | 'itens' | 'desconto_tipo' | 'desconto' | 'pagamento_forma' | 'pagamento_parcelas'> & { numero?: number },
  config: Pick<Configuracoes, 'pix_contas' | 'empresa_nome'>,
): string | null {
  const conta = pixDoOrcamento(o, config)
  if (!conta?.chave.trim()) return null
  const parcelado = o.pagamento_forma === 'parcelado' && o.pagamento_parcelas > 1
  return pixCopiaECola({
    chave: conta.chave,
    nome: conta.titular || config.empresa_nome,
    valor: parcelado ? 0 : total(o),
    identificador: o.numero ? numeroFormatado(o.numero) : undefined,
  })
}
