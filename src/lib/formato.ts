const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

export function reais(valor: number): string {
  // troca o espaço especial do Intl por um espaço comum (o PDF não tem esse caractere)
  return moeda.format(valor || 0).replace(/\s/g, ' ')
}

export function porcentagem(fracao: number | null): string {
  if (fracao === null) return '—'
  return `${numero.format(fracao * 100)}%`
}

export function decimal(valor: number): string {
  return numero.format(valor)
}

/** Aceita "1.234,56", "1234,56", "1234.56" ou "150". Retorna 0 se não entender. */
export function lerNumero(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, '')
  if (!limpo) return 0
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : 0
}

/** AAAA-MM-DD → DD/MM/AAAA */
export function dataBR(data: string | null | undefined): string {
  if (!data) return ''
  const [a, m, d] = data.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export function dataHoraBR(data: string | null, hora: string | null): string {
  if (!data) return ''
  return hora ? `${dataBR(data)} às ${hora.slice(0, 5)}` : dataBR(data)
}

/** Link do WhatsApp para um telefone brasileiro (acrescenta 55 se faltar). */
export function linkWhatsApp(telefone: string): string | null {
  let digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 10) return null
  if (digitos.length <= 11) digitos = `55${digitos}`
  return `https://wa.me/${digitos}`
}

export function novoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
