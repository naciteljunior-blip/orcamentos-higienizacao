import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// Caixa de confirmação própria: a página no claude.ai não exibe o confirm() do navegador.

interface Pedido {
  mensagem: string
  confirmar: string
  perigo: boolean
  responder: (sim: boolean) => void
}

type Confirmar = (mensagem: string, opcoes?: { confirmar?: string; perigo?: boolean }) => Promise<boolean>

const Contexto = createContext<Confirmar>(async () => false)

export function ProvedorConfirmacao({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const botao = useRef<HTMLButtonElement>(null)

  const confirmar = useCallback<Confirmar>(
    (mensagem, opcoes) =>
      new Promise((resolve) => {
        setPedido({
          mensagem,
          confirmar: opcoes?.confirmar ?? 'Confirmar',
          perigo: opcoes?.perigo ?? false,
          responder: (sim) => {
            setPedido(null)
            resolve(sim)
          },
        })
      }),
    [],
  )

  useEffect(() => {
    if (!pedido) return
    botao.current?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && pedido.responder(false)
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [pedido])

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      {pedido && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" onClick={() => pedido.responder(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmacao-texto"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="confirmacao-texto" className="whitespace-pre-line text-base text-slate-800">
              {pedido.mensagem}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" className="btn-secundario" onClick={() => pedido.responder(false)}>
                Cancelar
              </button>
              <button
                ref={botao}
                type="button"
                className={pedido.perigo ? 'btn bg-red-700 text-white hover:bg-red-800' : 'btn-primario'}
                onClick={() => pedido.responder(true)}
              >
                {pedido.confirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </Contexto.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirmar(): Confirmar {
  return useContext(Contexto)
}
