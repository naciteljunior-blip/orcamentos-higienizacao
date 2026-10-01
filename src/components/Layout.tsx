import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../lib/api'

const ABAS = [
  { para: '/', rotulo: 'Orçamentos', icone: 'M9 12h6m-6 4h6M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z' },
  { para: '/resumo', rotulo: 'Resumo', icone: 'M4 20V10m6 10V4m6 16v-7m4 7H2' },
  {
    para: '/configuracoes',
    rotulo: 'Ajustes',
    icone:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7.3 7.3 0 0 0-2-1.2L14.5 3h-5l-.4 2.5a7.3 7.3 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-.9a7.3 7.3 0 0 0 2 1.2l.4 2.5h5l.4-2.5a7.3 7.3 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  },
]

export default function Layout() {
  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {api.modo === 'demo' && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Modo demonstração: os dados ficam só neste aparelho. Configure o Supabase para salvar online (veja o README).
        </div>
      )}
      <Outlet />
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-3">
          {ABAS.map((aba) => (
            <NavLink
              key={aba.para}
              to={aba.para}
              end={aba.para === '/'}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  isActive ? 'text-brand-700' : 'text-slate-500'
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={aba.icone} />
              </svg>
              {aba.rotulo}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
