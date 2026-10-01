import type { PontoMes } from '../lib/calc'
import { MESES } from '../lib/constantes'
import { reais } from '../lib/formato'

// Paleta validada (contraste, daltonismo): faturamento e lucro.
const COR_FATURAMENTO = '#0d9488'
const COR_LUCRO = '#eb6834'

const LARGURA = 340
const ALTURA = 190
const ESQ = 44
const DIR = 6
const TOPO = 10
const BASE = 24

function abreviar(valor: number): string {
  const abs = Math.abs(valor)
  const sinal = valor < 0 ? '-' : ''
  if (abs >= 1000) return `${sinal}${(abs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `${sinal}${Math.round(abs)}`
}

/** Escala "bonita": 0, 500, 1000… */
function passoBonito(maximo: number): number {
  const bruto = maximo / 4
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const n = bruto / potencia
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * potencia
}

/** Barra com o canto de 4px só na ponta do dado (topo, ou fundo se negativa). */
function barra(x: number, y0: number, y1: number, largura: number): string {
  const topo = Math.min(y0, y1)
  const altura = Math.abs(y1 - y0)
  if (altura < 0.5) return ''
  const r = Math.min(4, altura, largura / 2)
  const negativa = y1 > y0
  if (negativa) {
    return `M${x},${topo} h${largura} v${altura - r} q0,${r} -${r},${r} h-${largura - 2 * r} q-${r},0 -${r},-${r} Z`
  }
  return `M${x},${topo + altura} v-${altura - r} q0,-${r} ${r},-${r} h${largura - 2 * r} q${r},0 ${r},${r} v${altura - r} Z`
}

export default function GraficoMeses({
  pontos,
  selecionado,
  aoEscolher,
}: {
  pontos: PontoMes[]
  selecionado: { ano: number; mes: number }
  aoEscolher: (ano: number, mes: number) => void
}) {
  const valores = pontos.flatMap((p) => [p.faturamento, p.lucro])
  const maximo = Math.max(...valores, 0)
  const minimo = Math.min(...valores, 0)
  const passo = passoBonito(Math.max(maximo - minimo, 100))
  const topoEscala = Math.ceil(maximo / passo) * passo || passo
  const fundoEscala = Math.floor(minimo / passo) * passo
  const alturaUtil = ALTURA - TOPO - BASE
  const y = (v: number) => TOPO + ((topoEscala - v) / (topoEscala - fundoEscala)) * alturaUtil
  const marcas: number[] = []
  for (let v = fundoEscala; v <= topoEscala + 0.001; v += passo) marcas.push(v)

  const larguraGrupo = (LARGURA - ESQ - DIR) / pontos.length
  const larguraBarra = Math.min(18, (larguraGrupo - 14) / 2)

  return (
    <figure>
      <div className="mb-2 flex gap-4 text-xs text-slate-600" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_FATURAMENTO }} /> Faturamento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_LUCRO }} /> Lucro
        </span>
      </div>
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full" role="img" aria-label="Faturamento e lucro dos últimos 6 meses">
        {marcas.map((v) => (
          <g key={v}>
            <line x1={ESQ} x2={LARGURA - DIR} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#94a3b8' : '#e2e8f0'} strokeWidth={1} />
            <text x={ESQ - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#64748b">
              {abreviar(v)}
            </text>
          </g>
        ))}
        {pontos.map((p, i) => {
          const x0 = ESQ + i * larguraGrupo
          const xBarra = x0 + (larguraGrupo - (larguraBarra * 2 + 2)) / 2
          const ativo = p.ano === selecionado.ano && p.mes === selecionado.mes
          return (
            <g
              key={`${p.ano}-${p.mes}`}
              className="cursor-pointer"
              onClick={() => aoEscolher(p.ano, p.mes)}
            >
              <title>
                {`${MESES[p.mes - 1]} de ${p.ano}\nFaturamento: ${reais(p.faturamento)}\nLucro: ${reais(p.lucro)}`}
              </title>
              {/* área de toque maior que as barras */}
              <rect x={x0} y={0} width={larguraGrupo} height={ALTURA} fill={ativo ? '#f1f5f9' : 'transparent'} rx={6} />
              <path d={barra(xBarra, y(0), y(p.faturamento), larguraBarra)} fill={COR_FATURAMENTO} />
              <path d={barra(xBarra + larguraBarra + 2, y(0), y(p.lucro), larguraBarra)} fill={COR_LUCRO} />
              <text
                x={x0 + larguraGrupo / 2}
                y={ALTURA - 8}
                textAnchor="middle"
                fontSize={10}
                fontWeight={ativo ? 700 : 400}
                fill={ativo ? '#0f172a' : '#64748b'}
              >
                {MESES[p.mes - 1].slice(0, 3)}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-slate-500">Toque em um mês para ver o resumo dele.</figcaption>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium text-slate-600">Ver em tabela</summary>
        <table className="mt-2 w-full text-right">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="text-left font-medium">Mês</th>
              <th className="font-medium">Faturamento</th>
              <th className="font-medium">Custos</th>
              <th className="font-medium">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {pontos.map((p) => (
              <tr key={`${p.ano}-${p.mes}`} className="border-t border-slate-100">
                <td className="py-1 text-left">
                  {MESES[p.mes - 1].slice(0, 3)}/{String(p.ano).slice(2)}
                </td>
                <td>{reais(p.faturamento)}</td>
                <td>{reais(p.custos)}</td>
                <td>{reais(p.lucro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
