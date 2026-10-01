import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Carregando } from './components/ui'
import { api } from './lib/api'
import { ProvedorConfig } from './lib/configContexto'
import Configuracoes from './pages/Configuracoes'
import Editor from './pages/Editor'
import Lista from './pages/Lista'
import Login from './pages/Login'
import Resumo from './pages/Resumo'

export default function App() {
  const [usuario, setUsuario] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    void api.usuarioAtual().then(setUsuario)
    return api.aoMudarLogin(setUsuario)
  }, [])

  if (usuario === undefined) return <Carregando />
  if (usuario === null) return <Login />

  return (
    // HashRouter: as rotas ficam depois do "#", o que funciona no GitHub Pages sem configuração extra
    <HashRouter>
      <ProvedorConfig>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Lista />} />
            <Route path="orcamento/novo" element={<Editor />} />
            <Route path="orcamento/:id" element={<Editor />} />
            <Route path="resumo" element={<Resumo />} />
            <Route path="configuracoes" element={<Configuracoes usuario={usuario} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ProvedorConfig>
    </HashRouter>
  )
}
