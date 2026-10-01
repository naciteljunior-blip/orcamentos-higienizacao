import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Configuracoes } from '../types'
import { api, completarConfig } from './api'

interface ContextoConfig {
  config: Configuracoes
  carregada: boolean
  erro: string | null
  recarregar: () => Promise<void>
  salvar: (config: Configuracoes) => Promise<void>
}

const Contexto = createContext<ContextoConfig | null>(null)

export function ProvedorConfig({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Configuracoes>(completarConfig(null))
  const [carregada, setCarregada] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try {
      setConfig(await api.obterConfig())
      setErro(null)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregada(true)
    }
  }, [])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const salvar = useCallback(async (nova: Configuracoes) => {
    await api.salvarConfig(nova)
    setConfig(nova)
  }, [])

  return <Contexto.Provider value={{ config, carregada, erro, recarregar, salvar }}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig(): ContextoConfig {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useConfig fora do ProvedorConfig')
  return contexto
}
