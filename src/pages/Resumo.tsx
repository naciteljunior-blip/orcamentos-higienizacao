import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GraficoMeses from '../components/GraficoMeses'
import { Cabecalho, Carregando, Erro, Secao, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { mesAnterior, resumoDoMes, ultimosMeses } from '../lib/calc'
import { CUSTO_ROTULO, CUSTO_TIPOS, MESES, STATUS } from '../lib/constantes'
import { porcentagem, reais } from '../lib/formato'
import type { Orcamento } from '../types'

export default function Resumo() {
  const hoje = new Date()
  const [periodo, setPeriodo] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 })
  const [orcamentos, setOrcamentos] = useState<Orcamento[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

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

  const resumo = useMemo(() => (orcamentos ? resumoDoMes(orcamentos, periodo.ano, periodo.mes) : null), [orcamentos, periodo])
  const grafico = useMemo(() => (orcamentos ? ultimosMeses(orcamentos, periodo.ano, periodo.mes, 6) : []), [orcamentos, periodo])

  const mudarMes = (n: number) => setPeriodo((p) => mesAnterior(p.ano, p.mes, -n))
  const maiorCusto = resumo ? Math.max(...Object.values(resumo.custosPorTipo), 0) : 0

  return (
    <>
      <Cabecalho titulo="Resumo mensal" />
      <main className="mx-auto max-w-3xl space-y-3 p-4">
        <div className="cartao flex items-center justify-between p-2">
          <button type="button" className="rounded-lg px-4 py-2 text-xl text-slate-600 hover:bg-slate-100" aria-label="Mês anterior" onClick={() => mudarMes(-1)}>
            ‹
          </button>
          <p className="text-lg font-bold" aria-live="polite">
            {MESES[periodo.mes - 1]} de {periodo.ano}
          </p>
          <button type="button" className="rounded-lg px-4 py-2 text-xl text-slate-600 hover:bg-slate-100" aria-label="Próximo mês" onClick={() => mudarMes(1)}>
            ›
          </button>
        </div>

        {erro && <Erro mensagem={erro} tentarDeNovo={carregar} />}
        {!orcamentos && !erro && <Carregando />}

        {resumo && (
          <>
            <section className="cartao">
              <p className="text-sm font-medium text-slate-500">Faturamento</p>
              <p className="text-3xl font-extrabold tracking-tight">{reais(resumo.faturamento)}</p>
              <p className="text-xs text-slate-500">
                {resumo.quantidadeFaturados === 1 ? '1 orçamento faturado' : `${resumo.quantidadeFaturados} orçamentos faturados`}{' '}
                (aprovados, em andamento ou concluídos) com serviço neste mês
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                <div>
                  <dt className="text-xs text-slate-500">Custos</dt>
                  <dd className="font-bold">{reais(resumo.custos)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Lucro</dt>
                  <dd className={`font-bold ${resumo.lucro < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{reais(resumo.lucro)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Margem</dt>
                  <dd className={`font-bold ${resumo.lucro < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{porcentagem(resumo.margem)}</dd>
                </div>
              </dl>
            </section>

            <Secao titulo="Últimos 6 meses">
              <GraficoMeses pontos={grafico} selecionado={periodo} aoEscolher={(ano, mes) => setPeriodo({ ano, mes })} />
            </Secao>

            <Secao titulo="Por status">
              <ul className="divide-y divide-slate-100">
                {STATUS.map((s) => (
                  <li key={s}>
                    <Link to={`/?status=${s}`} className="flex items-center justify-between gap-2 py-2">
                      <span className="flex items-center gap-2">
                        <StatusBadge status={s} />
                        <span className="text-sm text-slate-500">{resumo.porStatus[s].quantidade}</span>
                      </span>
                      <span className="font-semibold">{reais(resumo.porStatus[s].valor)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Secao>

            <Secao titulo="Custos por tipo">
              {resumo.custos === 0 ? (
                <p className="text-sm text-slate-500">Nenhum custo lançado nos orçamentos faturados deste mês.</p>
              ) : (
                <ul className="space-y-2.5">
                  {CUSTO_TIPOS.filter((t) => resumo.custosPorTipo[t] > 0)
                    .sort((a, b) => resumo.custosPorTipo[b] - resumo.custosPorTipo[a])
                    .map((t) => (
                      <li key={t}>
                        <div className="flex justify-between text-sm">
                          <span>{CUSTO_ROTULO[t]}</span>
                          <span className="font-semibold">
                            {reais(resumo.custosPorTipo[t])}{' '}
                            <span className="font-normal text-slate-500">
                              ({porcentagem(resumo.custosPorTipo[t] / resumo.custos)})
                            </span>
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-teal-600"
                            style={{ width: `${(resumo.custosPorTipo[t] / maiorCusto) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </Secao>

            <p className="px-1 text-xs text-slate-500">
              Os valores consideram o mês da data do serviço. Orçamentos sem data de serviço entram pelo mês de emissão.
              Faturamento, custos e lucro somam só os orçamentos aprovados, em andamento e concluídos.
            </p>
          </>
        )}
      </main>
    </>
  )
}
