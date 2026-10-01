import { useState, type FormEvent } from 'react'
import { Erro } from '../components/ui'
import { api } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEntrando(true)
    try {
      await api.entrar(email.trim(), senha)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setEntrando(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={enviar} className="cartao w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <img src="./icone.svg" alt="" className="mx-auto h-14 w-14" />
          <h1 className="mt-3 text-xl font-bold">Orçamentos</h1>
          <p className="text-sm text-slate-500">Entre para acessar seus orçamentos</p>
        </div>
        <label className="block">
          <span className="rotulo">E-mail</span>
          <input
            className="campo"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="rotulo">Senha</span>
          <input
            className="campo"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        {erro && <Erro mensagem={erro} />}
        <button type="submit" className="btn-primario w-full" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
