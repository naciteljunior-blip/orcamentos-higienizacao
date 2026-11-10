import { useState } from 'react'
import { CATEGORIA_MATERIAL_ROTULO, CATEGORIAS_MATERIAL } from '../lib/constantes'
import { novoId } from '../lib/formato'
import type { CategoriaMaterial, Material } from '../types'

/** Produtos, materiais e equipamentos do pós-obra, separados por categoria. */
export default function Materiais({ itens, aoMudar }: { itens: Material[]; aoMudar: (itens: Material[]) => void }) {
  return (
    <div className="space-y-3">
      {CATEGORIAS_MATERIAL.map((categoria) => (
        <Categoria
          key={categoria}
          categoria={categoria}
          itens={itens.filter((m) => m.categoria === categoria)}
          aoRemover={(id) => aoMudar(itens.filter((m) => m.id !== id))}
          aoAdicionar={(descricao) => aoMudar([...itens, { id: novoId(), categoria, descricao }])}
        />
      ))}
    </div>
  )
}

function Categoria({
  categoria,
  itens,
  aoRemover,
  aoAdicionar,
}: {
  categoria: CategoriaMaterial
  itens: Material[]
  aoRemover: (id: string) => void
  aoAdicionar: (descricao: string) => void
}) {
  const [novo, setNovo] = useState('')
  const rotulo = CATEGORIA_MATERIAL_ROTULO[categoria]

  function adicionar() {
    const descricao = novo.trim()
    if (!descricao) return
    aoAdicionar(descricao)
    setNovo('')
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-slate-700">{rotulo}</p>
      <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
        {itens.map((m) => (
          <li key={m.id} className="flex items-center gap-2 py-1.5 pl-3 pr-1">
            <span className="min-w-0 flex-1 text-sm text-slate-800">{m.descricao}</span>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Tirar da lista: ${m.descricao}`}
              onClick={() => aoRemover(m.id)}
            >
              ✕
            </button>
          </li>
        ))}
        {itens.length === 0 && <li className="p-3 text-sm text-slate-500">Nenhum item.</li>}
      </ul>
      <div className="mt-1.5 flex gap-2">
        <input
          className="campo"
          placeholder="Adicionar"
          aria-label={`Novo item em ${rotulo}`}
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionar()
            }
          }}
        />
        <button type="button" className="btn-secundario shrink-0" onClick={adicionar} disabled={!novo.trim()} aria-label={`Adicionar em ${rotulo}`}>
          +
        </button>
      </div>
    </div>
  )
}

const chave = (m: Pick<Material, 'categoria' | 'descricao'>) => `${m.categoria}|${m.descricao.trim().toLowerCase()}`

/**
 * No orçamento: escolher da lista dos ajustes tocando em cada item, sem digitar.
 * Itens que o orçamento tem e a lista não tem mais continuam aparecendo, marcados.
 */
export function SelecaoMateriais({
  opcoes,
  selecionados,
  aoMudar,
  ondeMudar = 'Ajustes → Pós-obra',
}: {
  opcoes: Material[]
  selecionados: Material[]
  aoMudar: (itens: Material[]) => void
  /** onde ficam as opções, para a dica no fim */
  ondeMudar?: string
}) {
  const marcados = new Set(selecionados.map(chave))
  const conhecidos = new Set(opcoes.map(chave))
  const todos = [...opcoes, ...selecionados.filter((m) => !conhecidos.has(chave(m)))]

  function trocar(itens: Material[], marcar: boolean) {
    const alvo = new Set(itens.map(chave))
    const restantes = selecionados.filter((m) => !alvo.has(chave(m)))
    // mantém a ordem da lista dos ajustes
    const novos = marcar ? itens.map((m) => selecionados.find((s) => chave(s) === chave(m)) ?? { ...m, id: novoId() }) : []
    const final = [...restantes, ...novos]
    aoMudar(todos.flatMap((m) => final.filter((f) => chave(f) === chave(m)).slice(0, 1)))
  }

  return (
    <div className="space-y-3">
      {CATEGORIAS_MATERIAL.map((categoria) => {
        const itens = todos.filter((m) => m.categoria === categoria)
        if (!itens.length) return null
        const rotulo = CATEGORIA_MATERIAL_ROTULO[categoria]
        const quantos = itens.filter((m) => marcados.has(chave(m))).length
        const tudo = quantos === itens.length
        return (
          <div key={categoria}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">
                {rotulo} <span className="font-normal text-slate-500">{quantos}/{itens.length}</span>
              </p>
              <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => trocar(itens, !tudo)}>
                {tudo ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={rotulo}>
              {itens.map((m) => {
                const ativo = marcados.has(chave(m))
                return (
                  <button
                    key={chave(m)}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => trocar([m], !ativo)}
                    className={`rounded-full px-3 py-1.5 text-left text-sm ring-1 ${
                      ativo ? 'bg-brand-700 font-semibold text-white ring-brand-700' : 'bg-white text-slate-600 ring-slate-300'
                    }`}
                  >
                    {ativo ? '✓ ' : ''}
                    {m.descricao}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <p className="text-xs text-slate-500">Toque para marcar o que será usado. Para mudar as opções, vá em {ondeMudar}.</p>
    </div>
  )
}
