import { describe, expect, it } from 'vitest'
import { completarConfig } from './api'
import { pixDoOrcamento } from './pix'

const nubank = { id: 'n', chave: '11912345678', titular: 'Ana', banco: 'Nubank' }
const inter = { id: 'i', chave: 'ana@email.com', titular: 'Ana', banco: 'Inter' }

describe('chaves PIX', () => {
  it('leva a chave única das versões antigas para a lista', () => {
    const c = completarConfig({ pix: 'chave-velha', pix_titular: 'Ana', pix_banco: 'Caixa' })
    expect(c.pix_contas).toEqual([{ id: 'principal', chave: 'chave-velha', titular: 'Ana', banco: 'Caixa' }])
    expect(completarConfig({ pix: '', pix_contas: [] }).pix_contas).toEqual([])
    expect(completarConfig({ pix: 'x', pix_contas: [inter] }).pix_contas).toEqual([inter])
  })

  it('usa a escolhida no orçamento, a padrão sem escolha, e a cópia se a chave saiu dos ajustes', () => {
    const config = { pix_contas: [nubank, inter] }
    expect(pixDoOrcamento({ pix: null }, config)).toEqual(nubank)
    expect(pixDoOrcamento({ pix: inter }, config)).toEqual(inter)
    // titular corrigido nos ajustes vale também para o orçamento
    expect(pixDoOrcamento({ pix: inter }, { pix_contas: [{ ...inter, titular: 'Ana Souza' }] })?.titular).toBe('Ana Souza')
    const apagada = { id: 'x', chave: 'antiga', titular: '', banco: '' }
    expect(pixDoOrcamento({ pix: apagada }, config)).toEqual(apagada)
    expect(pixDoOrcamento({ pix: null }, { pix_contas: [] })).toBeNull()
  })
})
