// Textos prontos para o WhatsApp, link para o Google Agenda e o que entra na agenda do app.

import type { Configuracoes, Orcamento } from '../types'
import { hojeISO, numeroFormatado, somarDias, total } from './calc'
import { TIPO_ROTULO } from './constantes'
import { dataBR, dataHoraBR, reais } from './formato'
import { textoPagamento } from './pagamento'

/** Dias sem resposta depois de enviado para o orçamento aparecer em "Cobrar resposta". */
export const DIAS_PARA_COBRAR = 3

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ''
}

function saudacao(o: Pick<Orcamento, 'cliente_nome'>): string {
  const nome = primeiroNome(o.cliente_nome)
  return nome ? `Olá, ${nome}!` : 'Olá!'
}

function assinatura(config: Pick<Configuracoes, 'empresa_nome'>): string {
  return config.empresa_nome ? `\n\n${config.empresa_nome}` : ''
}

/** Resumo do orçamento para mandar junto com (ou no lugar do) PDF. */
export function mensagemOrcamento(o: Orcamento, config: Configuracoes): string {
  const valor = total(o)
  const linhas = [
    saudacao(o),
    `Segue o orçamento ${numeroFormatado(o.numero)} (${TIPO_ROTULO[o.tipo].toLowerCase()}).`,
    '',
    `Total: *${reais(valor)}*`,
    textoPagamento(o, valor),
  ]
  if (o.tipo === 'impressao3d') {
    linhas.push(`Prazo: ${o.impressao.prazo_dias ? `${o.impressao.prazo_dias} dias após a aprovação` : 'a combinar'}`)
  } else if (o.data_servico) {
    linhas.push(`Data: ${dataHoraBR(o.data_servico, o.hora_servico)}`)
  }
  linhas.push(`Válido até ${dataBR(somarDias(o.data_emissao, o.validade_dias))}.`)
  if (config.pix) linhas.push('', `PIX: ${config.pix}${config.pix_titular ? ` (${config.pix_titular})` : ''}`)
  linhas.push('', 'Qualquer dúvida, é só chamar.')
  return linhas.join('\n') + assinatura(config)
}

/** Lembrete gentil para quem recebeu o orçamento e ainda não respondeu. */
export function mensagemCobranca(o: Orcamento, config: Configuracoes): string {
  return (
    `${saudacao(o)} Tudo bem? Passando para saber se conseguiu ver o orçamento ${numeroFormatado(o.numero)} ` +
    `(${reais(total(o))}). Se quiser, posso tirar dúvidas ou ajustar alguma coisa.` +
    assinatura(config)
  )
}

/** Confirmação do agendamento, para mandar na véspera. */
export function mensagemConfirmacao(o: Orcamento, config: Configuracoes): string {
  const quando = dataHoraBR(o.data_servico, o.hora_servico)
  return (
    `${saudacao(o)} Confirmando o serviço${quando ? ` em ${quando}` : ''}` +
    `${o.endereco ? `, no endereço ${o.endereco}${o.complemento ? ` (${o.complemento})` : ''}` : ''}. ` +
    'Está tudo certo?' +
    assinatura(config)
  )
}

/** Agradecimento depois do serviço, pedindo indicação. */
export function mensagemAgradecimento(o: Orcamento, config: Configuracoes): string {
  return (
    `${saudacao(o)} Obrigado pela confiança! Se puder, me conte o que achou do serviço. ` +
    'E se conhecer alguém que precise, vou adorar a indicação.' +
    assinatura(config)
  )
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** Link que abre o Google Agenda com o evento do serviço já preenchido. */
export function linkGoogleAgenda(o: Orcamento, config: Pick<Configuracoes, 'empresa_nome'>): string | null {
  if (!o.data_servico) return null
  const dia = o.data_servico.replace(/-/g, '')
  let datas: string
  if (o.hora_servico) {
    const [h, m] = o.hora_servico.split(':').map(Number)
    const duracao = o.tipo === 'pos_obra' ? 8 : 3
    const fimH = Math.min(23, h + duracao)
    datas = `${dia}T${doisDigitos(h)}${doisDigitos(m)}00/${dia}T${doisDigitos(fimH)}${doisDigitos(m)}00`
  } else {
    datas = `${dia}/${somarDias(o.data_servico, 1).replace(/-/g, '')}`
  }
  const detalhes = [
    `${numeroFormatado(o.numero)} · ${reais(total(o))}`,
    o.cliente_telefone && `Telefone: ${o.cliente_telefone}`,
    o.complemento && `Complemento: ${o.complemento}`,
    o.observacoes,
  ]
    .filter(Boolean)
    .join('\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${TIPO_ROTULO[o.tipo]}: ${o.cliente_nome || 'cliente'}${config.empresa_nome ? ` (${config.empresa_nome})` : ''}`,
    dates: datas,
    details: detalhes,
    location: o.endereco,
    ctz: 'America/Sao_Paulo',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Enviado há DIAS_PARA_COBRAR dias ou mais, sem resposta. */
export function esperandoResposta(o: Orcamento, hoje = hojeISO()): boolean {
  if (o.status !== 'enviado') return false
  return somarDias(o.atualizado_em.slice(0, 10), DIAS_PARA_COBRAR) <= hoje
}

export interface Agenda {
  /** serviços com data, de hoje em diante, por dia */
  dias: { data: string; orcamentos: Orcamento[] }[]
  /** aprovados com data que já passou e não foram concluídos */
  atrasados: Orcamento[]
  /** aprovados ou em andamento sem data marcada (inclui impressões 3D) */
  semData: Orcamento[]
  cobrar: Orcamento[]
}

const ATIVOS = new Set(['aprovado', 'em_andamento'])

export function montarAgenda(orcamentos: Orcamento[], hoje = hojeISO()): Agenda {
  const porDia = new Map<string, Orcamento[]>()
  const atrasados: Orcamento[] = []
  const semData: Orcamento[] = []
  for (const o of orcamentos) {
    const marcado = ATIVOS.has(o.status) || o.status === 'enviado'
    if (!marcado) continue
    if (!o.data_servico) {
      if (ATIVOS.has(o.status)) semData.push(o)
      continue
    }
    if (o.data_servico < hoje) {
      if (ATIVOS.has(o.status)) atrasados.push(o)
      continue
    }
    porDia.set(o.data_servico, [...(porDia.get(o.data_servico) ?? []), o])
  }
  const hora = (o: Orcamento) => o.hora_servico ?? '99:99'
  return {
    dias: [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, lista]) => ({ data, orcamentos: lista.sort((a, b) => hora(a).localeCompare(hora(b))) })),
    atrasados: atrasados.sort((a, b) => (a.data_servico ?? '').localeCompare(b.data_servico ?? '')),
    semData: semData.sort((a, b) => a.numero - b.numero),
    cobrar: orcamentos.filter((o) => esperandoResposta(o, hoje)).sort((a, b) => a.atualizado_em.localeCompare(b.atualizado_em)),
  }
}
