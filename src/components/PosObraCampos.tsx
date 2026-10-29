import { useState } from 'react'
import { Campo, CampoNumero, Opcoes } from './ui'
import { NIVEIS, NIVEL_ROTULO } from '../lib/constantes'
import { novoId, reais } from '../lib/formato'
import { arredondar } from '../lib/calc'
import type { ItemChecklist, PosObra } from '../types'

const COMODOS: { campo: 'quartos' | 'banheiros' | 'salas' | 'cozinhas' | 'areas_externas'; rotulo: string }[] = [
  { campo: 'quartos', rotulo: 'Quartos' },
  { campo: 'banheiros', rotulo: 'Banheiros' },
  { campo: 'salas', rotulo: 'Salas' },
  { campo: 'cozinhas', rotulo: 'Cozinhas' },
  { campo: 'areas_externas', rotulo: 'Externas' },
]

const inteiro = (v: number) => Math.max(0, Math.round(v))

export default function PosObraCampos({ dados, aoMudar }: { dados: PosObra; aoMudar: (mudanca: Partial<PosObra>) => void }) {
  const valorArea = arredondar(dados.area_m2 * dados.valor_m2)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Área">
          <CampoNumero valor={dados.area_m2} placeholder="0" sufixo="m²" aoMudar={(v) => aoMudar({ area_m2: Math.max(0, v) })} />
        </Campo>
        <Campo rotulo="Valor do m²">
          <CampoNumero valor={dados.valor_m2} prefixo="R$" aoMudar={(v) => aoMudar({ valor_m2: Math.max(0, v) })} />
        </Campo>
      </div>
      {valorArea > 0 && (
        <p className="-mt-2 text-sm text-slate-600">
          Área × m² = <strong>{reais(valorArea)}</strong>. Já entra nos valores do orçamento.
        </p>
      )}

      <div>
        <span className="rotulo">Nível de sujeira</span>
        <Opcoes
          rotulo="Nível de sujeira"
          valor={dados.nivel}
          aoMudar={(nivel) => aoMudar({ nivel })}
          opcoes={NIVEIS.map((n) => ({ valor: n, rotulo: NIVEL_ROTULO[n] }))}
        />
      </div>

      <div>
        <span className="rotulo">Cômodos</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {COMODOS.map((c) => (
            <Campo key={c.campo} rotulo={c.rotulo}>
              <CampoNumero valor={dados[c.campo]} placeholder="0" aoMudar={(v) => aoMudar({ [c.campo]: inteiro(v) })} />
            </Campo>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Equipe (pessoas)">
          <CampoNumero valor={dados.equipe} placeholder="0" aoMudar={(v) => aoMudar({ equipe: inteiro(v) })} />
        </Campo>
        <Campo rotulo="Dias de trabalho">
          <CampoNumero valor={dados.dias} placeholder="0" aoMudar={(v) => aoMudar({ dias: inteiro(v) })} />
        </Campo>
      </div>

      <Checklist itens={dados.checklist} aoMudar={(checklist) => aoMudar({ checklist })} />
    </div>
  )
}

function Checklist({ itens, aoMudar }: { itens: ItemChecklist[]; aoMudar: (itens: ItemChecklist[]) => void }) {
  const [novo, setNovo] = useState('')

  function adicionar() {
    const descricao = novo.trim()
    if (!descricao) return
    aoMudar([...itens, { id: novoId(), descricao, incluso: true }])
    setNovo('')
  }

  return (
    <div>
      <span className="rotulo">O que está incluso (sai no PDF)</span>
      <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
        {itens.map((item) => (
          <li key={item.id} className="flex items-center gap-2 p-2">
            <button
              type="button"
              role="switch"
              aria-checked={item.incluso}
              aria-label={`${item.descricao}: ${item.incluso ? 'incluso' : 'não incluso'}`}
              onClick={() => aoMudar(itens.map((x) => (x.id === item.id ? { ...x, incluso: !x.incluso } : x)))}
              className={`w-28 shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${
                item.incluso ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-red-50 text-red-700 ring-red-200'
              }`}
            >
              {item.incluso ? '✓ Incluso' : '✕ Não incluso'}
            </button>
            <span className={`min-w-0 flex-1 text-sm ${item.incluso ? 'text-slate-800' : 'text-slate-500'}`}>{item.descricao}</span>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Tirar da lista: ${item.descricao}`}
              onClick={() => aoMudar(itens.filter((x) => x.id !== item.id))}
            >
              ✕
            </button>
          </li>
        ))}
        {itens.length === 0 && <li className="p-3 text-sm text-slate-500">Lista vazia. Nada sai no PDF.</li>}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          className="campo"
          placeholder="Adicionar outro item à lista"
          aria-label="Novo item da lista"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionar()
            }
          }}
        />
        <button type="button" className="btn-secundario shrink-0" onClick={adicionar} disabled={!novo.trim()}>
          Adicionar
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Toque no selo para trocar entre incluso e não incluso.</p>
    </div>
  )
}
