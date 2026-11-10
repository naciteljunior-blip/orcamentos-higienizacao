import { Campo, CampoNumero, Opcoes } from './ui'
import { SelecaoMateriais } from './Materiais'
import { Checklist } from './PosObraCampos'
import { useConfig } from '../lib/configContexto'
import { COMODOS, FREQUENCIA_ROTULO, FREQUENCIAS, MODALIDADE_ROTULO, MODALIDADES } from '../lib/constantes'
import type { Limpeza } from '../types'

const inteiro = (v: number) => Math.max(0, Math.round(v))

/** Limpeza de apartamento / casa: tipo de limpeza, frequência, cômodos, equipe, inclusos e produtos. */
export default function LimpezaCampos({ dados, aoMudar }: { dados: Limpeza; aoMudar: (mudanca: Partial<Limpeza>) => void }) {
  const { config } = useConfig()

  return (
    <div className="space-y-4">
      <div>
        <span className="rotulo">Tipo de limpeza</span>
        <Opcoes
          rotulo="Tipo de limpeza"
          valor={dados.modalidade}
          aoMudar={(modalidade) => aoMudar({ modalidade })}
          opcoes={MODALIDADES.map((m) => ({ valor: m, rotulo: MODALIDADE_ROTULO[m] }))}
        />
      </div>

      <div>
        <span className="rotulo">Frequência</span>
        <Opcoes
          rotulo="Frequência"
          valor={dados.frequencia}
          aoMudar={(frequencia) => aoMudar({ frequencia })}
          opcoes={FREQUENCIAS.map((f) => ({ valor: f, rotulo: FREQUENCIA_ROTULO[f] }))}
        />
        {dados.frequencia !== 'avulsa' && (
          <p className="mt-1 text-xs text-slate-500">Os valores do orçamento são por limpeza; o PDF mostra a frequência combinada.</p>
        )}
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
        <Campo rotulo="Duração (horas)">
          <CampoNumero valor={dados.horas} placeholder="0" aoMudar={(v) => aoMudar({ horas: Math.max(0, v) })} />
        </Campo>
      </div>

      <Checklist itens={dados.checklist} aoMudar={(checklist) => aoMudar({ checklist })} />

      <div>
        <span className="rotulo">Produtos e equipamentos que serão usados (sai no PDF)</span>
        <SelecaoMateriais
          opcoes={config.materiais_limpeza}
          selecionados={dados.materiais}
          aoMudar={(materiais) => aoMudar({ materiais })}
          ondeMudar="Ajustes → Limpeza"
        />
      </div>
    </div>
  )
}
