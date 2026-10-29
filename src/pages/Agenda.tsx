import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Cabecalho, Carregando, Erro, Secao, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { hojeISO, numeroFormatado, somarDias, total } from '../lib/calc'
import { useConfig } from '../lib/configContexto'
import { TIPO_COR, TIPO_ROTULO } from '../lib/constantes'
import { dataBR, linkWhatsApp, reais } from '../lib/formato'
import { DIAS_PARA_COBRAR, mensagemCobranca, mensagemConfirmacao, montarAgenda } from '../lib/mensagens'
import type { Orcamento } from '../types'

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function nomeDoDia(data: string, hoje: string): string {
  if (data === hoje) return 'Hoje'
  if (data === somarDias(hoje, 1)) return 'Amanhã'
  const [a, m, d] = data.split('-').map(Number)
  const semana = DIAS_SEMANA[new Date(a, m - 1, d).getDay()]
  return `${semana[0].toUpperCase()}${semana.slice(1)}, ${dataBR(data).slice(0, 5)}`
}

export default function Agenda() {
  const { config } = useConfig()
  const [orcamentos, setOrcamentos] = useState<Orcamento[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const hoje = hojeISO()

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      setOrcamentos(await api.listar())
    } catch (e) {
      setErro((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const agenda = useMemo(() => (orcamentos ? montarAgenda(orcamentos, hoje) : null), [orcamentos, hoje])
  const vazia = agenda && !agenda.dias.length && !agenda.atrasados.length && !agenda.semData.length && !agenda.cobrar.length

  return (
    <>
      <Cabecalho titulo="Agenda" />
      <main className="mx-auto max-w-3xl space-y-3 p-4">
        {erro && <Erro mensagem={erro} tentarDeNovo={carregar} />}
        {!agenda && !erro && <Carregando />}
        {vazia && (
          <div className="py-12 text-center text-slate-500">
            <p className="font-medium">Nada na agenda.</p>
            <p className="text-sm">Os orçamentos aprovados com data marcada aparecem aqui.</p>
          </div>
        )}

        {agenda && agenda.cobrar.length > 0 && (
          <Secao titulo={`Cobrar resposta (${agenda.cobrar.length})`} className="ring-2 ring-amber-300">
            <p className="mb-2 text-sm text-slate-600">Enviados há {DIAS_PARA_COBRAR} dias ou mais, ainda sem resposta.</p>
            <ul className="space-y-2">
              {agenda.cobrar.map((o) => (
                <Cartao key={o.id} o={o} detalhe={`enviado em ${dataBR(o.atualizado_em)}`}>
                  <BotaoWhats telefone={o.cliente_telefone} texto={mensagemCobranca(o, config)} rotulo="Cobrar" />
                </Cartao>
              ))}
            </ul>
          </Secao>
        )}

        {agenda && agenda.atrasados.length > 0 && (
          <Secao titulo="Data já passou" className="ring-2 ring-red-200">
            <p className="mb-2 text-sm text-slate-600">Aprovados com data anterior a hoje. Marque como concluído ou mude a data.</p>
            <ul className="space-y-2">
              {agenda.atrasados.map((o) => (
                <Cartao key={o.id} o={o} detalhe={dataBR(o.data_servico)} />
              ))}
            </ul>
          </Secao>
        )}

        {agenda?.dias.map((dia) => (
          <Secao key={dia.data} titulo={nomeDoDia(dia.data, hoje)} extra={<span className="text-sm text-slate-500">{dataBR(dia.data)}</span>}>
            <ul className="space-y-2">
              {dia.orcamentos.map((o) => (
                <Cartao key={o.id} o={o} detalhe={o.hora_servico ?? 'Sem horário'}>
                  {(dia.data === hoje || dia.data === somarDias(hoje, 1)) && (
                    <BotaoWhats telefone={o.cliente_telefone} texto={mensagemConfirmacao(o, config)} rotulo="Confirmar" />
                  )}
                </Cartao>
              ))}
            </ul>
          </Secao>
        ))}

        {agenda && agenda.semData.length > 0 && (
          <Secao titulo="Aprovados sem data">
            <ul className="space-y-2">
              {agenda.semData.map((o) => (
                <Cartao
                  key={o.id}
                  o={o}
                  detalhe={o.tipo === 'impressao3d' ? `prazo ${o.impressao.prazo_dias} dias · ${o.impressao.unidades} un.` : 'Combinar a data'}
                />
              ))}
            </ul>
          </Secao>
        )}
      </main>
    </>
  )
}

function Cartao({ o, detalhe, children }: { o: Orcamento; detalhe: string; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-lg p-2 ring-1 ring-slate-200">
      <Link to={`/orcamento/${o.id}`} className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          {detalhe} · {numeroFormatado(o.numero)}
          {o.tipo !== 'higienizacao' && <span className={`rounded px-1.5 py-0.5 ring-1 ${TIPO_COR[o.tipo]}`}>{TIPO_ROTULO[o.tipo]}</span>}
        </p>
        <p className="truncate font-semibold">{o.cliente_nome || 'Sem nome'}</p>
        <p className="truncate text-sm text-slate-500">
          {reais(total(o))}
          {o.endereco && ` · ${o.endereco}`}
        </p>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={o.status} />
        {children}
      </div>
    </li>
  )
}

function BotaoWhats({ telefone, texto, rotulo }: { telefone: string; texto: string; rotulo: string }) {
  const link = linkWhatsApp(telefone, texto)
  if (!link) return null
  return (
    <a href={link} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
      {rotulo}
    </a>
  )
}
