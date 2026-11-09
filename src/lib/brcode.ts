// "PIX copia e cola" (BR Code do Banco Central), o texto que vira o QR do PIX.
// Formato EMV: cada campo é ID (2 dígitos) + tamanho (2 dígitos) + valor, e no fim um CRC16.

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como pede o padrão. */
export function crc16(texto: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Só letras sem acento, números e espaço; o QR não aceita bem o resto em nome e cidade. */
function semAcento(texto: string, maximo: number): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, maximo)
    .trim()
}

function cpfValido(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const digito = (n: number) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

/**
 * Deixa a chave no formato que o PIX espera: e-mail em minúsculas, CPF/CNPJ só números,
 * celular com +55, chave aleatória como está.
 */
export function normalizarChave(chave: string): string {
  const t = chave.trim()
  if (t.includes('@')) return t.toLowerCase()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return t.toLowerCase()
  const d = t.replace(/\D/g, '')
  if (t.startsWith('+')) return `+${d}`
  if (d.length === 14) return d // CNPJ
  if (d.length === 11 && (cpfValido(d) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(t))) return d // CPF
  if (d.length === 10 || d.length === 11) return `+55${d}` // celular com DDD
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return `+${d}`
  return t
}

export interface DadosPix {
  chave: string
  /** quem recebe (aparece no app do banco do cliente) */
  nome: string
  cidade?: string
  /** em reais; 0 ou ausente = o cliente digita o valor */
  valor?: number
  /** identificação do pagamento, ex.: ORC0003 */
  identificador?: string
}

/** Monta o "PIX copia e cola". */
export function pixCopiaECola({ chave, nome, cidade = 'BRASIL', valor, identificador }: DadosPix): string {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChave(chave))
  const txid = (identificador ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'
  const corpo = [
    campo('00', '01'),
    campo('26', conta),
    campo('52', '0000'),
    campo('53', '986'),
    valor && valor > 0 ? campo('54', valor.toFixed(2)) : '',
    campo('58', 'BR'),
    campo('59', semAcento(nome, 25) || 'RECEBEDOR'),
    campo('60', semAcento(cidade, 15) || 'BRASIL'),
    campo('62', campo('05', txid)),
  ].join('')
  const comCrc = `${corpo}6304`
  return comCrc + crc16(comCrc)
}
