// Busca de endereço pelo CEP: ViaCEP e, se falhar, BrasilAPI.

export interface EnderecoCep {
  logradouro: string
  bairro: string
  cidade: string
  uf: string
}

type Buscar = (url: string, opcoes?: RequestInit) => Promise<Response>

export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, 8)
}

/** "01310100" → "01310-100" (aceita o CEP incompleto enquanto é digitado). */
export function formatarCep(texto: string): string {
  const d = soDigitos(texto)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** "Avenida Paulista, Bela Vista, São Paulo - SP" */
export function montarEndereco(e: EnderecoCep): string {
  const cidade = [e.cidade, e.uf].filter(Boolean).join(' - ')
  return [e.logradouro, e.bairro, cidade].filter(Boolean).join(', ')
}

class CepNaoEncontrado extends Error {}

async function obterJson(buscar: Buscar, url: string): Promise<Record<string, unknown>> {
  const controle = new AbortController()
  const tempo = setTimeout(() => controle.abort(), 8000)
  try {
    const resposta = await buscar(url, { signal: controle.signal })
    if (resposta.status === 404) throw new CepNaoEncontrado()
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
    return (await resposta.json()) as Record<string, unknown>
  } finally {
    clearTimeout(tempo)
  }
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

async function viaCep(buscar: Buscar, cep: string): Promise<EnderecoCep> {
  const d = await obterJson(buscar, `https://viacep.com.br/ws/${cep}/json/`)
  if (d.erro) throw new CepNaoEncontrado()
  return { logradouro: texto(d.logradouro), bairro: texto(d.bairro), cidade: texto(d.localidade), uf: texto(d.uf) }
}

async function brasilApi(buscar: Buscar, cep: string): Promise<EnderecoCep> {
  const d = await obterJson(buscar, `https://brasilapi.com.br/api/cep/v1/${cep}`)
  return { logradouro: texto(d.street), bairro: texto(d.neighborhood), cidade: texto(d.city), uf: texto(d.state) }
}

export async function buscarCep(cep: string, buscar: Buscar = (url, opcoes) => fetch(url, opcoes)): Promise<EnderecoCep> {
  const d = soDigitos(cep)
  if (d.length !== 8) throw new Error('O CEP precisa ter 8 números.')
  let naoEncontrado = false
  for (const fonte of [viaCep, brasilApi]) {
    try {
      return await fonte(buscar, d)
    } catch (e) {
      if (e instanceof CepNaoEncontrado) naoEncontrado = true
    }
  }
  throw new Error(naoEncontrado ? 'CEP não encontrado. Confira os números.' : 'Não foi possível consultar o CEP agora. Digite o endereço.')
}
