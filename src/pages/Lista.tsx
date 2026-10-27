import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Cabecalho, Carregando, Erro, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { numeroFormatado, total } from '../lib/calc'
import { STATUS, STATUS_ROTULO, TIPO_ROTULO, TIPOS } from '../lib/constantes'
import { dataHoraBR, decimal, reais } from '../lib/formato'
import type { Orcamento, Status } from '../types'

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function Lista() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const filtro = (params.get('status') as Status | null) ?? null
  const [busca, setBusca] = useState('')
  const [escolhendoTipo, setEscolhendoTipo] = useState(false)

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

  const contagem = useMemo(() => {
    const c = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>
    for (const o of orcamentos ?? []) c[o.status] += 1
    return c
  }, [orcamentos])

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim())
    return (orcamentos ?? []).filter((o) => {
      if (filtro && o.status !== filtro) return false
      if (!termo) return true
      const alvo = semAcento(
        [numeroFormatado(o.numero), o.cliente_nome, o.cliente_telefone, o.endereco, o.complemento, o.impressao.descricao].join(' '),
      )
      return alvo.includes(termo)
    })
  }, [orcamentos, filtro, busca])

  function escolherFiltro(status: Status | null) {
    setParams(status ? { status } : {}, { replace: true })
  }

  return (
    <>
      <Cabecalho titulo="Orçamentos" />
      <main className="mx-auto max-w-3xl space-y-3 p-4">
        <input
          type="search"
          className="campo"
          placeholder="Buscar por cliente, número, telefone ou endereço"
          aria-label="Buscar orçamentos"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por status">
          {[null, ...STATUS].map((s) => {
            const ativo = filtro === s
            const qtd = s ? contagem[s] : (orcamentos?.length ?? 0)
            return (
              <button
                key={s ?? 'todos'}
                type="button"
                aria-pressed={ativo}
                onClick={() => escolherFiltro(s)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
                  ativo ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300'
                }`}
              >
                {s ? STATUS_ROTULO[s] : 'Todos'} <span className="opacity-70">{qtd}</span>
              </button>
            )
          })}
        </div>

        {erro && <Erro mensagem={erro} tentarDeNovo={carregar} />}
        {!orcamentos && !erro && <Carregando />}

        {orcamentos && visiveis.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            {orcamentos.length === 0 ? (
              <>
                <p className="font-medium">Nenhum orçamento ainda.</p>
                <p className="text-sm">Toque em “Novo orçamento” para criar o primeiro.</p>
              </>
            ) : (
              <p>Nenhum orçamento encontrado com esse filtro.</p>
            )}
          </div>
        )}

        <ul className="space-y-2">
          {visiveis.map((o) => (
            <li key={o.id}>
              <Link to={`/orcamento/${o.id}`} className="cartao block p-3 transition active:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500">
                      {numeroFormatado(o.numero)}
                      {o.tipo === 'impressao3d' && <span className="ml-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-violet-800 ring-1 ring-violet-200">3D</span>}
                    </p>
                    <p className="truncate font-semibold">{o.cliente_nome || 'Sem nome'}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-2 flex items-end justify-between gap-2 text-sm">
                  <p className="min-w-0 truncate text-slate-500">
                    {o.tipo === 'impressao3d' ? (
                      <>
                        {o.impressao.unidades} un. · prazo {o.impressao.prazo_dias} dias
                        {o.impressao.filamento_kg > 0 && ` · ${decimal(o.impressao.filamento_kg)} kg`}
                        {o.impressao.descricao && ` · ${o.impressao.descricao}`}
                      </>
                    ) : (
                      <>
                        {dataHoraBR(o.data_servico, o.hora_servico) || 'Sem data marcada'}
                        {o.endereco && ` · ${o.endereco}`}
                      </>
                    )}
                  </p>
                  <p className="shrink-0 text-base font-bold">{reais(total(o))}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      {escolhendoTipo && <div className="fixed inset-0 z-20" onClick={() => setEscolhendoTipo(false)} />}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 flex flex-col items-end gap-2">
        {escolhendoTipo && (
          <div id="tipos-novo" className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
            {TIPOS.map((t) => (
              <Link key={t} to={t === 'higienizacao' ? '/orcamento/novo' : `/orcamento/novo?tipo=${t}`} className="btn-secundario justify-start">
                {TIPO_ROTULO[t]}
              </Link>
            ))}
          </div>
        )}
        <button
          type="button"
          className="btn-primario rounded-full px-5 py-3.5 shadow-lg"
          aria-expanded={escolhendoTipo}
          aria-controls="tipos-novo"
          onClick={() => setEscolhendoTipo((v) => !v)}
        >
          <span aria-hidden="true" className="text-xl leading-none">{escolhendoTipo ? '×' : '+'}</span> Novo orçamento
        </button>
      </div>
    </>
  )
}
