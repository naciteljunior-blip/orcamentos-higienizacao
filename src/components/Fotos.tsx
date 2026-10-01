import { useState } from 'react'
import { api } from '../lib/api'
import { novoId } from '../lib/formato'
import type { Foto, MomentoFoto } from '../types'

const GRUPOS: { momento: MomentoFoto; titulo: string; dica: string }[] = [
  { momento: 'antes', titulo: 'Antes', dica: 'Como o estofado estava ao chegar' },
  { momento: 'depois', titulo: 'Depois', dica: 'Resultado da higienização' },
]

export default function Fotos({
  fotos,
  aoMudar,
  incluirNoPdf,
  aoMudarIncluirNoPdf,
  avisar,
}: {
  fotos: Foto[]
  aoMudar: (atualizar: (fotos: Foto[]) => Foto[]) => void
  incluirNoPdf: boolean
  aoMudarIncluirNoPdf: (valor: boolean) => void
  avisar: (mensagem: string) => void
}) {
  const [enviando, setEnviando] = useState<{ momento: MomentoFoto; feitas: number; total: number } | null>(null)
  const [aberta, setAberta] = useState<Foto | null>(null)

  async function adicionar(momento: MomentoFoto, arquivos: File[]) {
    if (!arquivos.length) return
    let falhas = 0
    for (let i = 0; i < arquivos.length; i++) {
      setEnviando({ momento, feitas: i, total: arquivos.length })
      try {
        const ref = await api.enviarFoto(arquivos[i])
        aoMudar((atuais) => [...atuais, { id: novoId(), momento, ref }])
      } catch (e) {
        falhas++
        avisar((e as Error).message)
      }
    }
    setEnviando(null)
    if (!falhas) avisar(arquivos.length === 1 ? 'Foto adicionada' : `${arquivos.length} fotos adicionadas`)
  }

  return (
    <>
      <div className="space-y-4">
        {GRUPOS.map((g) => {
          const lista = fotos.filter((f) => f.momento === g.momento)
          const ocupado = enviando?.momento === g.momento
          return (
            <div key={g.momento}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-slate-800">
                  {g.titulo} <span className="text-sm font-normal text-slate-500">({lista.length})</span>
                </h3>
                <span className="truncate text-xs text-slate-500">{g.dica}</span>
              </div>
              <ul className="grid grid-cols-3 gap-2">
                {lista.map((f, i) => (
                  <li key={f.id} className="relative">
                    <button
                      type="button"
                      className="block aspect-square w-full overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
                      aria-label={`Ampliar foto ${i + 1} de ${g.titulo.toLowerCase()}`}
                      onClick={() => setAberta(f)}
                    >
                      <img src={api.urlFoto(f.ref)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-sm text-white"
                      aria-label={`Remover foto ${i + 1} de ${g.titulo.toLowerCase()}`}
                      onClick={() => aoMudar((atuais) => atuais.filter((x) => x.id !== f.id))}
                    >
                      ✕
                    </button>
                  </li>
                ))}
                <li>
                  <label
                    className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-white text-center text-xs font-semibold text-slate-600 hover:border-brand-600 hover:text-brand-700 ${
                      enviando ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {ocupado ? (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
                        Enviando {enviando.feitas + 1} de {enviando.total}
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true" className="text-2xl leading-none">+</span>
                        Foto {g.titulo.toLowerCase()}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      disabled={!!enviando}
                      onChange={(e) => {
                        const arquivos = Array.from(e.target.files ?? [])
                        e.target.value = ''
                        void adicionar(g.momento, arquivos)
                      }}
                    />
                  </label>
                </li>
              </ul>
            </div>
          )
        })}

        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-brand-700"
            checked={incluirNoPdf}
            onChange={(e) => aoMudarIncluirNoPdf(e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-semibold text-slate-800">Incluir as fotos no PDF</span>
            <span className="block text-slate-500">Acrescenta uma página com o antes e o depois.</span>
          </span>
        </label>
      </div>

      {aberta && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${aberta.momento === 'antes' ? 'antes' : 'depois'} do serviço`}
          onClick={() => setAberta(null)}
        >
          <div className="flex items-center justify-between text-white">
            <span className="font-semibold">{aberta.momento === 'antes' ? 'Antes' : 'Depois'}</span>
            <button type="button" className="rounded-lg px-3 py-2 text-lg" aria-label="Fechar foto" onClick={() => setAberta(null)}>
              ✕
            </button>
          </div>
          <img src={api.urlFoto(aberta.ref)} alt="" className="mt-2 min-h-0 flex-1 object-contain" />
        </div>
      )}
    </>
  )
}
