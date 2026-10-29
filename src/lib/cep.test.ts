import { describe, expect, it } from 'vitest'
import { buscarCep, formatarCep, montarEndereco } from './cep'

const json = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status })

describe('CEP', () => {
  it('formata enquanto digita', () => {
    expect(formatarCep('0131')).toBe('0131')
    expect(formatarCep('01310100')).toBe('01310-100')
    expect(formatarCep('01310-1009999')).toBe('01310-100')
  })

  it('busca na ViaCEP e monta o endereço', async () => {
    const urls: string[] = []
    const e = await buscarCep('01310-100', async (url) => {
      urls.push(url)
      return json({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' })
    })
    expect(urls).toEqual(['https://viacep.com.br/ws/01310100/json/'])
    expect(montarEndereco(e)).toBe('Avenida Paulista, Bela Vista, São Paulo - SP')
  })

  it('usa a BrasilAPI quando a ViaCEP falha', async () => {
    const e = await buscarCep('01310100', async (url) => {
      if (url.includes('viacep')) throw new TypeError('Failed to fetch')
      return json({ street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' })
    })
    expect(e.cidade).toBe('São Paulo')
  })

  it('CEP de cidade sem rua devolve só a cidade', async () => {
    const e = await buscarCep('78890000', async () => json({ logradouro: '', bairro: '', localidade: 'Sorriso', uf: 'MT' }))
    expect(montarEndereco(e)).toBe('Sorriso - MT')
  })

  it('avisa CEP inexistente, CEP incompleto e falta de conexão', async () => {
    await expect(
      buscarCep('99999999', async (url) => (url.includes('viacep') ? json({ erro: 'true' }) : json({}, 404))),
    ).rejects.toThrow('CEP não encontrado')
    await expect(buscarCep('1234', async () => json({}))).rejects.toThrow('8 números')
    await expect(
      buscarCep('01310100', async () => {
        throw new TypeError('Failed to fetch')
      }),
    ).rejects.toThrow('Digite o endereço')
  })
})
