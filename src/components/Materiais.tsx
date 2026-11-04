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
