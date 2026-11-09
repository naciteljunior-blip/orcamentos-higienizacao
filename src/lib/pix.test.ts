import { describe, expect, it } from 'vitest'
import { completarConfig } from './api'
import { crc16, normalizarChave, pixCopiaECola } from './brcode'
import { copiaEColaDoOrcamento, pixDoOrcamento } from './pix'

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

describe('PIX copia e cola', () => {
  it('calcula o CRC do exemplo do Banco Central', () => {
    const semCrc =
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304'
    expect(crc16(semCrc)).toBe('1D3D')
  })

  it.each([
    ['(11) 91234-5678', '+5511912345678'],
    ['11912345678', '+5511912345678'],
    ['+55 11 91234-5678', '+5511912345678'],
    ['529.982.247-25', '52998224725'],
    ['52998224725', '52998224725'],
    ['12.345.678/0001-95', '12345678000195'],
    ['Ana@Email.com ', 'ana@email.com'],
    ['123E4567-E12B-12D1-A456-426655440000', '123e4567-e12b-12d1-a456-426655440000'],
  ])('chave %s → %s', (chave, esperado) => {
    expect(normalizarChave(chave)).toBe(esperado)
  })

  it('monta o código com chave, valor, nome sem acento e identificação', () => {
    const codigo = pixCopiaECola({ chave: '(11) 91234-5678', nome: 'Ana Conceição', valor: 1380.5, identificador: 'ORC-0003' })
    expect(codigo).toBe(
      '00020126360014br.gov.bcb.pix0114+5511912345678520400005303986540713' +
        '80.505802BR5913ANA CONCEICAO6006BRASIL62110507ORC00036304' +
        crc16(codigo.slice(0, -4)),
    )
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)))
  })

  it('no orçamento parcelado sai sem valor', () => {
    const base = { pix: null, numero: 3, itens: [{ id: 'i', descricao: 'x', quantidade: 1, valor_unitario: 300 }], desconto_tipo: 'valor' as const, desconto: 0 }
    const config = { pix_contas: [nubank], empresa_nome: 'Lava Bem' }
    expect(copiaEColaDoOrcamento({ ...base, pagamento_forma: 'a_vista', pagamento_parcelas: 1 }, config)).toContain('5406300.00')
    expect(copiaEColaDoOrcamento({ ...base, pagamento_forma: 'parcelado', pagamento_parcelas: 3 }, config)).not.toContain('5406')
    expect(copiaEColaDoOrcamento({ ...base, pagamento_forma: 'a_vista', pagamento_parcelas: 1 }, { pix_contas: [], empresa_nome: '' })).toBeNull()
  })
})
