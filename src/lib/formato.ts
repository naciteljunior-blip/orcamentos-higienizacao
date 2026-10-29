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
export function linkWhatsApp(telefone: string, texto?: string): string | null {
  let digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 10) return null
  if (digitos.length <= 11) digitos = `55${digitos}`
  return texto ? `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}` : `https://wa.me/${digitos}`
}

export function novoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

/** 0 a 999 por extenso. */
function ateMil(n: number): string {
  if (n === 100) return 'cem'
  const partes: string[] = []
  const c = Math.floor(n / 100)
  const resto = n % 100
  if (c) partes.push(CENTENAS[c])
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto])
  } else {
    const d = Math.floor(resto / 10)
    const u = resto % 10
    partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d])
  }
  return partes.join(' e ')
}

/** Inteiro por extenso (até 999.999.999). */
function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  const milhoes = Math.floor(n / 1_000_000)
  const milhares = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000
  const partes: string[] = []
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : `${ateMil(milhoes)} milhões`)
  if (milhares) partes.push(milhares === 1 ? 'mil' : `${ateMil(milhares)} mil`)
  if (resto) partes.push(ateMil(resto))
  if (partes.length === 1) return partes[0]
  // "e" antes do último grupo quando ele é redondo ou menor que cem: "mil e duzentos", "mil e cinquenta"
  const ultimo = partes.pop()!
  const comE = resto > 0 && (resto < 100 || resto % 100 === 0)
  return `${partes.join(' ')}${comE ? ' e ' : ' '}${ultimo}`
}

/** 1250.5 → "mil duzentos e cinquenta reais e cinquenta centavos" */
export function reaisPorExtenso(valor: number): string {
  const centavosTotal = Math.round(Math.max(0, valor) * 100)
  const inteiro = Math.floor(centavosTotal / 100)
  const centavos = centavosTotal % 100
  const partes: string[] = []
  if (inteiro) {
    const redondo = inteiro >= 1_000_000 && inteiro % 1_000_000 === 0
    partes.push(`${inteiroPorExtenso(inteiro)}${redondo ? ' de' : ''} ${inteiro === 1 ? 'real' : 'reais'}`)
  }
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  return partes.length ? partes.join(' e ') : 'zero real'
}
