import { useState } from 'react'
import { Campo } from './ui'
import { novoId } from '../lib/formato'
import { nomeContaPix } from '../lib/pix'
import type { ContaPix } from '../types'

/** Ajustes: cadastro das chaves PIX. A primeira é a padrão. */
export function EditorContasPix({ contas, aoMudar }: { contas: ContaPix[]; aoMudar: (contas: ContaPix[]) => void }) {
  const mudar = (id: string, mudanca: Partial<ContaPix>) => aoMudar(contas.map((c) => (c.id === id ? { ...c, ...mudanca } : c)))
  return (
    <div className="space-y-3">
      {contas.map((c, i) => (
        <div key={c.id} className="rounded-lg p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">
              Chave {i + 1}
              {i === 0 && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800 ring-1 ring-brand-200">Padrão</span>}
            </p>
            <div className="flex gap-1">
              {i > 0 && (
                <button type="button" className="rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => aoMudar([c, ...contas.filter((x) => x.id !== c.id)])}>
                  Tornar padrão
                </button>
              )}
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remover chave ${i + 1}`}
                onClick={() => aoMudar(contas.filter((x) => x.id !== c.id))}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Chave PIX">
              <input className="campo" placeholder="Celular, CPF, CNPJ, e-mail…" value={c.chave} onChange={(e) => mudar(c.id, { chave: e.target.value })} />
            </Campo>
            <Campo rotulo="Titular da conta">
              <input className="campo" value={c.titular} onChange={(e) => mudar(c.id, { titular: e.target.value })} />
            </Campo>
            <Campo rotulo="Banco">
              <input className="campo" value={c.banco} onChange={(e) => mudar(c.id, { banco: e.target.value })} />
            </Campo>
          </div>
        </div>
      ))}
      <button type="button" className="btn-secundario w-full" onClick={() => aoMudar([...contas, { id: novoId(), chave: '', titular: '', banco: '' }])}>
        + Adicionar chave PIX
      </button>
      <p className="text-xs text-slate-500">A chave padrão vem marcada nos novos orçamentos. Em cada orçamento dá para escolher outra.</p>
    </div>
  )
}

/** Orçamento: escolher em qual chave receber, ou cadastrar uma nova ali mesmo. */
export function EscolhaPix({
  contas,
  selecionada,
  aoEscolher,
  aoCadastrar,
}: {
  contas: ContaPix[]
  /** id da chave que vale para o orçamento */
  selecionada: string | null
  aoEscolher: (conta: ContaPix) => void
  /** salva a nova chave nos ajustes; lança erro se não conseguir */
  aoCadastrar: (conta: ContaPix) => Promise<void>
}) {
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState({ chave: '', titular: '', banco: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function cadastrar() {
    if (!nova.chave.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      await aoCadastrar({ id: novoId(), chave: nova.chave.trim(), titular: nova.titular.trim(), banco: nova.banco.trim() })
      setNova({ chave: '', titular: '', banco: '' })
      setAberto(false)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <span className="rotulo">Receber no PIX</span>
      {contas.length > 0 ? (
        <div className="space-y-2" role="radiogroup" aria-label="Chave PIX do orçamento">
          {contas.map((c, i) => {
            const ativa = c.id === selecionada
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={ativa}
                onClick={() => aoEscolher(c)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left ring-1 ${
                  ativa ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-slate-200'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 rounded-full ring-2 ${ativa ? 'bg-brand-600 ring-brand-600' : 'ring-slate-300'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{nomeContaPix(c)}</span>
                  {c.titular && <span className="block truncate text-xs text-slate-500">{c.titular}</span>}
                </span>
                {i === 0 && <span className="shrink-0 text-xs text-slate-500">padrão</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Nenhuma chave cadastrada. O PDF sai sem PIX.</p>
      )}

      {aberto ? (
        <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <Campo rotulo="Nova chave PIX">
            <input className="campo" placeholder="Celular, CPF, CNPJ, e-mail…" value={nova.chave} onChange={(e) => setNova({ ...nova, chave: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="Titular">
              <input className="campo" value={nova.titular} onChange={(e) => setNova({ ...nova, titular: e.target.value })} />
            </Campo>
            <Campo rotulo="Banco">
              <input className="campo" value={nova.banco} onChange={(e) => setNova({ ...nova, banco: e.target.value })} />
            </Campo>
          </div>
          {erro && <p className="text-sm text-red-700">{erro}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-secundario flex-1" onClick={() => setAberto(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primario flex-1" onClick={() => void cadastrar()} disabled={!nova.chave.trim() || salvando}>
              {salvando ? 'Salvando…' : 'Salvar e usar'}
            </button>
          </div>
          <p className="text-xs text-slate-500">A chave fica guardada nos ajustes para os próximos orçamentos.</p>
        </div>
      ) : (
        <button type="button" className="btn-secundario mt-2 w-full text-sm" onClick={() => setAberto(true)}>
          + Adicionar outra chave PIX
        </button>
      )}
    </div>
  )
}
