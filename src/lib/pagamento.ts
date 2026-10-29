import type { Orcamento } from '../types'
import { valorParcela } from './calc'
import { reais } from './formato'

export function textoPagamento(o: Pick<Orcamento, 'tipo' | 'pagamento_forma' | 'pagamento_parcelas'>, valorTotal: number): string {
  if (o.pagamento_forma === 'parcelado' && o.pagamento_parcelas > 1) {
    return `Parcelado em ${o.pagamento_parcelas}x de ${reais(valorParcela(valorTotal, o.pagamento_parcelas))}`
  }
  return o.tipo === 'impressao3d' ? `À vista: ${reais(valorTotal)}` : `À vista, no ato do serviço: ${reais(valorTotal)}`
}
