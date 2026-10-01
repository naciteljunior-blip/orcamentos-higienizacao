import { describe, expect, it } from 'vitest'
import type { Orcamento } from '../types'
import {
  mesAnterior,
  numeroFormatado,
  resultado,
  resumoDoMes,
  somarDias,
  total,
  ultimosMeses,
  valorDesconto,
  valorParcela,
} from './calc'
import { dataBR, lerNumero, linkWhatsApp, reais } from './formato'
import { lerBackup, montarBackup } from './backup'
import { CONFIG_PADRAO } from './constantes'

function orc(parcial: Partial<Orcamento>): Orcamento {
  return {
    id: Math.random().toString(36),
    numero: 1,
    status: 'rascunho',
    cliente_nome: 'Cliente',
    cliente_telefone: '',
    cliente_email: '',
    local_tipo: 'casa',
    endereco: '',
    complemento: '',
    data_servico: null,
    hora_servico: null,
    data_emissao: '2026-09-01',
    validade_dias: 30,
    itens: [],
    desconto_tipo: 'valor',
    desconto: 0,
    custos: [],
    pagamento_forma: 'a_vista',
    pagamento_parcelas: 1,
    fotos: [],
    pdf_fotos: false,
    condicoes: '',
    observacoes: '',
    criado_em: '',
    atualizado_em: '',
    ...parcial,
  }
}

const item = (quantidade: number, valor_unitario: number) => ({ id: 'i', descricao: 'x', quantidade, valor_unitario })
const custo = (tipo: Orcamento['custos'][number]['tipo'], valor: number) => ({ id: 'c', tipo, descricao: '', valor })

describe('totais', () => {
  it('soma itens e aplica desconto em reais', () => {
    const o = orc({ itens: [item(2, 150), item(1, 99.9)], desconto: 49.9 })
    expect(total(o)).toBe(350)
  })

  it('aplica desconto percentual', () => {
    const o = orc({ itens: [item(1, 200)], desconto_tipo: 'percentual', desconto: 10 })
    expect(valorDesconto(o)).toBe(20)
    expect(total(o)).toBe(180)
  })

  it('não deixa o desconto passar do subtotal', () => {
    expect(total(orc({ itens: [item(1, 100)], desconto: 500 }))).toBe(0)
    expect(total(orc({ itens: [item(1, 100)], desconto_tipo: 'percentual', desconto: 150 }))).toBe(0)
  })

  it('calcula lucro e margem', () => {
    const r = resultado(orc({ itens: [item(1, 400)], custos: [custo('produto', 60), custo('ajudante', 40)] }))
    expect(r).toEqual({ total: 400, custos: 100, lucro: 300, margem: 0.75 })
  })

  it('margem é nula com total zero', () => {
    expect(resultado(orc({ custos: [custo('transporte', 20)] })).margem).toBeNull()
  })

  it('evita erro de arredondamento', () => {
    expect(total(orc({ itens: [item(3, 0.1)] }))).toBe(0.3)
  })

  it('calcula parcelas', () => {
    expect(valorParcela(200, 3)).toBe(66.67)
  })
})

describe('resumo mensal', () => {
  const lista = [
    orc({ status: 'aprovado', data_servico: '2026-09-10', itens: [item(1, 300)], custos: [custo('produto', 50)] }),
    orc({ status: 'concluido', data_servico: '2026-09-25', itens: [item(1, 200)], custos: [custo('produto', 20), custo('transporte', 30)] }),
    orc({ status: 'em_andamento', data_servico: '2026-09-30', itens: [item(1, 100)] }),
    // não conta no faturamento
    orc({ status: 'enviado', data_servico: '2026-09-12', itens: [item(1, 1000)], custos: [custo('maquina', 99)] }),
    orc({ status: 'recusado', data_servico: '2026-09-12', itens: [item(1, 500)] }),
    // outro mês pela data do serviço, mesmo emitido em setembro
    orc({ status: 'aprovado', data_emissao: '2026-09-20', data_servico: '2026-10-02', itens: [item(1, 700)] }),
    // sem data de serviço: entra pelo mês de emissão
    orc({ status: 'rascunho', data_emissao: '2026-09-05', itens: [item(1, 80)] }),
  ]

  it('fatura aprovados, em andamento e concluídos pelo mês do serviço', () => {
    const r = resumoDoMes(lista, 2026, 9)
    expect(r.faturamento).toBe(600)
    expect(r.custos).toBe(100)
    expect(r.lucro).toBe(500)
    expect(r.margem).toBeCloseTo(500 / 600)
    expect(r.quantidadeFaturados).toBe(3)
    expect(r.custosPorTipo).toMatchObject({ produto: 70, transporte: 30, maquina: 0 })
    expect(r.porStatus.enviado).toEqual({ quantidade: 1, valor: 1000 })
    expect(r.porStatus.rascunho).toEqual({ quantidade: 1, valor: 80 })
    expect(r.porStatus.aprovado).toEqual({ quantidade: 1, valor: 300 })
  })

  it('monta os últimos 6 meses atravessando o ano', () => {
    const pontos = ultimosMeses(lista, 2027, 2, 6)
    expect(pontos.map((p) => `${p.ano}-${p.mes}`)).toEqual(['2026-9', '2026-10', '2026-11', '2026-12', '2027-1', '2027-2'])
    expect(pontos[0].faturamento).toBe(600)
    expect(pontos[1].faturamento).toBe(700)
  })

  it('navega entre meses', () => {
    expect(mesAnterior(2026, 1)).toEqual({ ano: 2025, mes: 12 })
    expect(mesAnterior(2026, 12, -1)).toEqual({ ano: 2027, mes: 1 })
  })
})

describe('formatação', () => {
  it('formata número do orçamento', () => {
    expect(numeroFormatado(1)).toBe('ORC-0001')
    expect(numeroFormatado(12345)).toBe('ORC-12345')
  })

  it('lê valores digitados no padrão brasileiro', () => {
    expect(lerNumero('1.234,56')).toBe(1234.56)
    expect(lerNumero('150,5')).toBe(150.5)
    expect(lerNumero('99.90')).toBe(99.9)
    expect(lerNumero('')).toBe(0)
    expect(lerNumero('abc')).toBe(0)
  })

  it('formata moeda e datas', () => {
    expect(reais(1234.5)).toBe('R$ 1.234,50')
    expect(dataBR('2026-09-07')).toBe('07/09/2026')
    expect(somarDias('2026-12-15', 30)).toBe('2027-01-14')
  })

  it('monta link do WhatsApp', () => {
    expect(linkWhatsApp('(11) 91234-5678')).toBe('https://wa.me/5511912345678')
    expect(linkWhatsApp('+55 11 91234-5678')).toBe('https://wa.me/5511912345678')
    expect(linkWhatsApp('123')).toBeNull()
  })
})

describe('backup', () => {
  it('lê de volta um backup gerado pelo sistema', () => {
    const backup = montarBackup(CONFIG_PADRAO, [orc({ numero: 1 }), orc({ numero: 2 })])
    expect(lerBackup(JSON.stringify(backup)).orcamentos).toHaveLength(2)
  })

  it('recusa arquivos inválidos', () => {
    expect(() => lerBackup('não é json')).toThrow(/JSON/)
    expect(() => lerBackup('{"foo":1}')).toThrow(/não é um backup/)
    const repetido = montarBackup(CONFIG_PADRAO, [orc({ numero: 1 }), orc({ numero: 1 })])
    expect(() => lerBackup(JSON.stringify(repetido))).toThrow(/repetido/)
  })
})
