import type { Custo, CustoTipo, Item, Orcamento, OrcamentoEditavel, Status } from '../types'
import { CUSTO_TIPOS, STATUS, STATUS_FATURADOS } from './constantes'

export function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

export function numeroFormatado(numero: number | undefined): string {
  return numero ? `ORC-${String(numero).padStart(4, '0')}` : 'Novo orçamento'
}

export function totalItem(item: Item): number {
  return arredondar((item.quantidade || 0) * (item.valor_unitario || 0))
}

export function subtotal(itens: Item[]): number {
  return arredondar(itens.reduce((soma, item) => soma + totalItem(item), 0))
}

type ParaTotais = Pick<OrcamentoEditavel, 'itens' | 'desconto_tipo' | 'desconto' | 'custos'>

/** Desconto em R$, nunca maior que o subtotal. */
export function valorDesconto(o: Pick<ParaTotais, 'itens' | 'desconto_tipo' | 'desconto'>): number {
  const base = subtotal(o.itens)
  const desconto = Math.max(0, o.desconto || 0)
  const valor = o.desconto_tipo === 'percentual' ? (base * Math.min(desconto, 100)) / 100 : desconto
  return arredondar(Math.min(valor, base))
}

export function total(o: Pick<ParaTotais, 'itens' | 'desconto_tipo' | 'desconto'>): number {
  return arredondar(subtotal(o.itens) - valorDesconto(o))
}

export function totalCustos(custos: Custo[]): number {
  return arredondar(custos.reduce((soma, c) => soma + (c.valor || 0), 0))
}

export interface Resultado {
  total: number
  custos: number
  lucro: number
  /** lucro ÷ total (0,25 = 25%); null quando o total é zero */
  margem: number | null
}

export function resultado(o: ParaTotais): Resultado {
  const t = total(o)
  const c = totalCustos(o.custos)
  const lucro = arredondar(t - c)
  return { total: t, custos: c, lucro, margem: t > 0 ? lucro / t : null }
}

export function valorParcela(valorTotal: number, parcelas: number): number {
  return arredondar(valorTotal / Math.max(1, parcelas))
}

/** Soma dias a uma data AAAA-MM-DD sem passar por fuso horário. */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number)
  const r = new Date(Date.UTC(a, m - 1, d + dias))
  return r.toISOString().slice(0, 10)
}

export function hojeISO(agora = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, '0')
  const d = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${m}-${d}`
}

/**
 * Mês de referência do orçamento no resumo: o mês da data do serviço.
 * Sem data de serviço (ex.: rascunho ainda sem agendamento), usa a data de emissão.
 */
export function mesReferencia(o: Pick<Orcamento, 'data_servico' | 'data_emissao'>): string {
  return (o.data_servico || o.data_emissao).slice(0, 7)
}

export function chaveMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** Volta n meses a partir de ano/mes (mes de 1 a 12). */
export function mesAnterior(ano: number, mes: number, n = 1): { ano: number; mes: number } {
  const indice = ano * 12 + (mes - 1) - n
  return { ano: Math.floor(indice / 12), mes: (indice % 12) + 1 }
}

export interface ResumoMes {
  faturamento: number
  custos: number
  lucro: number
  margem: number | null
  quantidadeFaturados: number
  porStatus: Record<Status, { quantidade: number; valor: number }>
  custosPorTipo: Record<CustoTipo, number>
}

export function resumoDoMes(orcamentos: Orcamento[], ano: number, mes: number): ResumoMes {
  const chave = chaveMes(ano, mes)
  const porStatus = Object.fromEntries(STATUS.map((s) => [s, { quantidade: 0, valor: 0 }])) as ResumoMes['porStatus']
  const custosPorTipo = Object.fromEntries(CUSTO_TIPOS.map((t) => [t, 0])) as ResumoMes['custosPorTipo']
  let faturamento = 0
  let custos = 0
  let quantidadeFaturados = 0

  for (const o of orcamentos) {
    if (mesReferencia(o) !== chave) continue
    const r = resultado(o)
    porStatus[o.status].quantidade += 1
    porStatus[o.status].valor = arredondar(porStatus[o.status].valor + r.total)
    if (!STATUS_FATURADOS.includes(o.status)) continue
    quantidadeFaturados += 1
    faturamento += r.total
    custos += r.custos
    for (const c of o.custos) custosPorTipo[c.tipo] = arredondar(custosPorTipo[c.tipo] + (c.valor || 0))
  }

  faturamento = arredondar(faturamento)
  custos = arredondar(custos)
  const lucro = arredondar(faturamento - custos)
  return {
    faturamento,
    custos,
    lucro,
    margem: faturamento > 0 ? lucro / faturamento : null,
    quantidadeFaturados,
    porStatus,
    custosPorTipo,
  }
}

export interface PontoMes {
  ano: number
  mes: number
  faturamento: number
  custos: number
  lucro: number
}

/** Os últimos `n` meses terminando em ano/mes, do mais antigo para o mais recente. */
export function ultimosMeses(orcamentos: Orcamento[], ano: number, mes: number, n = 6): PontoMes[] {
  const pontos: PontoMes[] = []
  for (let i = n - 1; i >= 0; i--) {
    const m = mesAnterior(ano, mes, i)
    const r = resumoDoMes(orcamentos, m.ano, m.mes)
    pontos.push({ ...m, faturamento: r.faturamento, custos: r.custos, lucro: r.lucro })
  }
  return pontos
}
