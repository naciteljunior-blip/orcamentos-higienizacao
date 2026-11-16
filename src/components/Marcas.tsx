import { Campo } from './ui'
import { TIPO_ROTULO, TIPOS } from '../lib/constantes'
import { novoId } from '../lib/formato'
import { lerLogo } from '../lib/imagem'
import type { Marca } from '../types'

/** Ajustes: empresas / marcas, cada uma com nome, logo e os tipos de orçamento em que é a padrão. */
export function EditorMarcas({ marcas, aoMudar, avisar }: { marcas: Marca[]; aoMudar: (marcas: Marca[]) => void; avisar: (texto: string) => void }) {
  const mudar = (id: string, mudanca: Partial<Marca>) => aoMudar(marcas.map((m) => (m.id === id ? { ...m, ...mudanca } : m)))

  return (
    <div className="space-y-3">
      {marcas.map((m, i) => (
        <div key={m.id} className="space-y-3 rounded-lg p-3 ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">
              {m.nome || `Empresa ${i + 1}`}
              {i === 0 && marcas.length > 1 && (
                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800 ring-1 ring-brand-200">Padrão</span>
              )}
            </p>
            <div className="flex gap-1">
              {i > 0 && (
                <button type="button" className="rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => aoMudar([m, ...marcas.filter((x) => x.id !== m.id)])}>
                  Tornar padrão
                </button>
              )}
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remover ${m.nome || `empresa ${i + 1}`}`}
                onClick={() => aoMudar(marcas.filter((x) => x.id !== m.id))}
              >
                ✕
              </button>
            </div>
          </div>

          <Campo rotulo="Nome da empresa / profissional">
            <input className="campo" value={m.nome} onChange={(e) => mudar(m.id, { nome: e.target.value })} />
          </Campo>

          <div>
            <span className="rotulo">Logo (opcional)</span>
            <div className="flex flex-wrap items-center gap-3">
              {m.logo ? (
                <img src={m.logo} alt={`Logo de ${m.nome || 'empresa'}`} className="h-16 max-w-48 rounded-lg bg-white object-contain p-1 ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400 ring-1 ring-slate-200">Sem logo</div>
              )}
              <label className="btn-secundario cursor-pointer text-sm">
                {m.logo ? 'Trocar imagem' : 'Escolher imagem'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={async (e) => {
                    const arquivo = e.target.files?.[0]
                    if (!arquivo) return
                    try {
                      mudar(m.id, { logo: await lerLogo(arquivo) })
                    } catch (err) {
                      avisar((err as Error).message)
                    }
                    e.target.value = ''
                  }}
                />
              </label>
              {m.logo && (
                <button type="button" className="text-sm font-semibold text-red-700" onClick={() => mudar(m.id, { logo: '' })}>
                  Remover
                </button>
              )}
            </div>
            {m.logo && (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-700"
                  checked={m.logo_com_nome}
                  onChange={(e) => mudar(m.id, { logo_com_nome: e.target.checked })}
                />
                O logo já tem o nome da empresa (sai maior no PDF, sem repetir o nome)
              </label>
            )}
          </div>

          {marcas.length > 1 && (
            <div>
              <span className="rotulo">Já vem escolhida nos orçamentos de</span>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => {
                  const ativo = m.tipos.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() =>
                        // cada tipo fica com uma marca só
                        aoMudar(
                          marcas.map((x) =>
                            x.id === m.id
                              ? { ...x, tipos: ativo ? x.tipos.filter((y) => y !== t) : [...x.tipos, t] }
                              : { ...x, tipos: ativo ? x.tipos : x.tipos.filter((y) => y !== t) },
                          ),
                        )
                      }
                      className={`rounded-full px-3 py-1 text-sm ring-1 ${ativo ? 'bg-brand-700 font-semibold text-white ring-brand-700' : 'bg-white text-slate-600 ring-slate-300'}`}
                    >
                      {ativo ? '✓ ' : ''}
                      {TIPO_ROTULO[t]}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">Os tipos sem marca marcada usam a padrão. Em cada orçamento dá para trocar.</p>
            </div>
          )}
        </div>
      ))}
      <button type="button" className="btn-secundario w-full" onClick={() => aoMudar([...marcas, { id: novoId(), nome: '', logo: '', logo_com_nome: false, tipos: [] }])}>
        + Adicionar empresa / logo
      </button>
    </div>
  )
}

/** Orçamento: escolher com qual empresa / logo ele sai. Só aparece com mais de uma marca. */
export function EscolhaMarca({ marcas, selecionada, aoEscolher }: { marcas: Marca[]; selecionada: string | null; aoEscolher: (id: string) => void }) {
  if (marcas.length < 2) return null
  return (
    <div role="radiogroup" aria-label="Empresa do orçamento" className="grid grid-cols-2 gap-2">
      {marcas.map((m) => {
        const ativa = m.id === selecionada
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={ativa}
            aria-label={m.nome || 'Empresa sem nome'}
            onClick={() => aoEscolher(m.id)}
            className={`flex h-20 items-center justify-center rounded-lg bg-white p-2 ${ativa ? 'ring-2 ring-brand-600' : 'opacity-60 ring-1 ring-slate-200'}`}
          >
            {m.logo ? (
              <img src={m.logo} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-sm font-semibold">{m.nome || 'Sem nome'}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
