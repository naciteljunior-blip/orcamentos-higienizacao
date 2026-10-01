import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Status } from '../types'
import { STATUS_COR, STATUS_ROTULO } from '../lib/constantes'
import { lerNumero } from '../lib/formato'

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_COR[status]}`}>
      {STATUS_ROTULO[status]}
    </span>
  )
}

function paraTexto(valor: number): string {
  return valor ? String(valor).replace('.', ',') : ''
}

/** Campo numérico que aceita vírgula (teclado numérico do celular). */
export function CampoNumero({
  valor,
  aoMudar,
  prefixo,
  sufixo,
  placeholder = '0,00',
  id,
  rotuloAcessivel,
}: {
  valor: number
  aoMudar: (valor: number) => void
  prefixo?: string
  sufixo?: string
  placeholder?: string
  id?: string
  rotuloAcessivel?: string
}) {
  const [texto, setTexto] = useState(paraTexto(valor))
  const focado = useRef(false)

  // acompanha mudanças externas (ex.: item escolhido do catálogo) sem atrapalhar a digitação
  useEffect(() => {
    if (!focado.current) setTexto(paraTexto(valor))
  }, [valor])

  return (
    <div className="relative">
      {prefixo && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">{prefixo}</span>
      )}
      <input
        id={id}
        aria-label={rotuloAcessivel}
        className={`campo ${prefixo ? 'pl-9' : ''} ${sufixo ? 'pr-8' : ''}`}
        inputMode="decimal"
        placeholder={placeholder}
        value={texto}
        onFocus={(e) => {
          focado.current = true
          e.target.select()
        }}
        onBlur={() => {
          focado.current = false
          setTexto(paraTexto(valor))
        }}
        onChange={(e) => {
          const limpo = e.target.value.replace(/[^\d,.]/g, '')
          setTexto(limpo)
          aoMudar(lerNumero(limpo))
        }}
      />
      {sufixo && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">{sufixo}</span>
      )}
    </div>
  )
}

export function Campo({ rotulo, children, className = '' }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{rotulo}</span>
      {children}
    </label>
  )
}

export function Secao({
  titulo,
  children,
  extra,
  className = '',
}: {
  titulo: string
  children: ReactNode
  extra?: ReactNode
  className?: string
}) {
  return (
    <section className={`cartao ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-800">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

/** Botões lado a lado para escolher uma opção (tipo de local, desconto, etc.). */
export function Opcoes<T extends string>({
  valor,
  opcoes,
  aoMudar,
  rotulo,
}: {
  valor: T
  opcoes: { valor: T; rotulo: string }[]
  aoMudar: (valor: T) => void
  rotulo: string
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition ${
              ativo ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
      {texto}
    </div>
  )
}

export function Erro({ mensagem, tentarDeNovo }: { mensagem: string; tentarDeNovo?: () => void }) {
  return (
    <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      <p>{mensagem}</p>
      {tentarDeNovo && (
        <button type="button" className="mt-2 font-semibold underline" onClick={tentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

/** Aviso flutuante que some sozinho. */
export function Aviso({ texto, aoFechar }: { texto: string | null; aoFechar: () => void }) {
  useEffect(() => {
    if (!texto) return
    const t = setTimeout(aoFechar, 2500)
    return () => clearTimeout(t)
  }, [texto, aoFechar])
  if (!texto) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      {texto}
    </div>
  )
}

export function Cabecalho({ titulo, esquerda, direita }: { titulo: ReactNode; esquerda?: ReactNode; direita?: ReactNode }) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        {esquerda}
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{titulo}</h1>
        {direita}
      </div>
    </header>
  )
}
