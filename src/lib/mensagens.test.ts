import { describe, expect, it } from 'vitest'
import type { Orcamento } from '../types'
import { CONFIG_PADRAO, IMPRESSAO_PADRAO, POS_OBRA_PADRAO } from './constantes'
import { linkWhatsApp, reais, reaisPorExtenso } from './formato'
import { esperandoResposta, linkGoogleAgenda, mensagemOrcamento, montarAgenda } from './mensagens'

function orc(parcial: Partial<Orcamento>): Orcamento {
  return {
    id: Math.random().toString(36),
    numero: 7,
    tipo: 'higienizacao',
    status: 'aprovado',
    cliente_nome: 'Maria Souza',
    cliente_telefone: '11912345678',
    cliente_email: '',
    local_tipo: 'casa',
    cep: '',
    endereco: 'Rua A, 10',
    complemento: '',
    data_servico: null,
    hora_servico: null,
    data_emissao: '2026-10-01',
    validade_dias: 30,
    itens: [{ id: 'i', descricao: 'Sofá', quantidade: 1, valor_unitario: 250 }],
    desconto_tipo: 'valor',
    desconto: 0,
    custos: [],
    pagamento_forma: 'a_vista',
    pagamento_parcelas: 1,
    fotos: [],
    pdf_fotos: false,
    impressao: { ...IMPRESSAO_PADRAO },
    pos_obra: { ...POS_OBRA_PADRAO },
    condicoes: '',
    observacoes: '',
    criado_em: '2026-10-01T10:00:00Z',
    atualizado_em: '2026-10-01T10:00:00Z',
    ...parcial,
  }
}

describe('valor por extenso', () => {
  it.each([
    [1, 'um real'],
    [0.01, 'um centavo'],
    [100, 'cem reais'],
    [101, 'cento e um reais'],
    [250, 'duzentos e cinquenta reais'],
    [1000, 'mil reais'],
    [1050, 'mil e cinquenta reais'],
    [1200, 'mil e duzentos reais'],
    [1380, 'mil trezentos e oitenta reais'],
    [2015.5, 'dois mil e quinze reais e cinquenta centavos'],
    [21000, 'vinte e um mil reais'],
    [1000000, 'um milhão de reais'],
    [0, 'zero real'],
  ])('%s → %s', (valor, texto) => {
    expect(reaisPorExtenso(valor)).toBe(texto)
  })
})

describe('mensagens', () => {
  it('monta o resumo do orçamento com total, validade e PIX', () => {
    const texto = mensagemOrcamento(orc({ data_servico: '2026-11-03', hora_servico: '09:00' }), {
      ...CONFIG_PADRAO,
      empresa_nome: 'Lava Bem',
      pix: 'chave-teste',
    })
    expect(texto).toContain('Olá, Maria!')
    expect(texto).toContain('ORC-0007')
    expect(texto).toContain(`*${reais(250)}*`)
    expect(texto).toContain('03/11/2026 às 09:00')
    expect(texto).toContain('Válido até 31/10/2026')
    expect(texto).toContain('PIX: chave-teste')
    expect(texto.endsWith('Lava Bem')).toBe(true)
  })

  it('leva o texto no link do WhatsApp', () => {
    expect(linkWhatsApp('11912345678', 'oi, tudo bem?')).toBe('https://wa.me/5511912345678?text=oi%2C%20tudo%20bem%3F')
  })

  it('cria o evento do Google Agenda com horário ou dia inteiro', () => {
    const comHora = new URL(linkGoogleAgenda(orc({ data_servico: '2026-11-03', hora_servico: '09:30' }), CONFIG_PADRAO)!)
    expect(comHora.searchParams.get('dates')).toBe('20261103T093000/20261103T123000')
    expect(comHora.searchParams.get('location')).toBe('Rua A, 10')
    const diaInteiro = new URL(linkGoogleAgenda(orc({ data_servico: '2026-11-30' }), CONFIG_PADRAO)!)
    expect(diaInteiro.searchParams.get('dates')).toBe('20261130/20261201')
    expect(linkGoogleAgenda(orc({}), CONFIG_PADRAO)).toBeNull()
  })
})

describe('agenda', () => {
  it('separa próximos, atrasados, sem data e quem cobrar', () => {
    const hoje = '2026-10-29'
    const lista = [
      orc({ numero: 1, data_servico: '2026-10-30', hora_servico: '14:00' }),
      orc({ numero: 2, data_servico: '2026-10-30', hora_servico: '08:00', status: 'em_andamento' }),
      orc({ numero: 3, data_servico: '2026-10-29' }),
      orc({ numero: 4, data_servico: '2026-10-20' }),
      orc({ numero: 5, data_servico: '2026-10-20', status: 'concluido' }),
      orc({ numero: 6, tipo: 'impressao3d' }),
      orc({ numero: 7, status: 'enviado', atualizado_em: '2026-10-26T12:00:00Z' }),
      orc({ numero: 8, status: 'enviado', atualizado_em: '2026-10-28T12:00:00Z' }),
      orc({ numero: 9, status: 'rascunho', data_servico: '2026-11-01' }),
    ]
    const a = montarAgenda(lista, hoje)
    expect(a.dias.map((d) => [d.data, d.orcamentos.map((o) => o.numero)])).toEqual([
      ['2026-10-29', [3]],
      ['2026-10-30', [2, 1]],
    ])
    expect(a.atrasados.map((o) => o.numero)).toEqual([4])
    expect(a.semData.map((o) => o.numero)).toEqual([6])
    expect(a.cobrar.map((o) => o.numero)).toEqual([7])
    expect(esperandoResposta(lista[7], hoje)).toBe(false)
  })
})
