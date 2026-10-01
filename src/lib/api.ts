import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Backup, Configuracoes, Orcamento, OrcamentoEditavel } from '../types'
import { CONFIG_PADRAO } from './constantes'
import { hojeISO, numeroFormatado } from './calc'
import { novoId } from './formato'

export interface Api {
  /** 'demo' quando o Supabase não está configurado: tudo fica só neste navegador. */
  modo: 'supabase' | 'demo'
  /** E-mail do usuário logado, ou null. */
  usuarioAtual(): Promise<string | null>
  aoMudarLogin(callback: (email: string | null) => void): () => void
  entrar(email: string, senha: string): Promise<void>
  sair(): Promise<void>
  listar(): Promise<Orcamento[]>
  obter(id: string): Promise<Orcamento | null>
  salvar(orcamento: OrcamentoEditavel): Promise<Orcamento>
  excluir(id: string): Promise<void>
  obterConfig(): Promise<Configuracoes>
  salvarConfig(config: Configuracoes): Promise<void>
  /** Substitui todos os dados pelos do backup. */
  restaurar(backup: Backup): Promise<void>
}

/** Completa campos que faltem (ex.: configurações salvas por uma versão anterior). */
export function completarConfig(dados: Partial<Configuracoes> | null | undefined): Configuracoes {
  return { ...CONFIG_PADRAO, ...(dados ?? {}) }
}

/** Ajusta o que vem do banco: hora "14:30:00" → "14:30", números em texto → número. */
function normalizar(linha: Orcamento): Orcamento {
  return {
    ...linha,
    hora_servico: linha.hora_servico ? linha.hora_servico.slice(0, 5) : null,
    desconto: Number(linha.desconto) || 0,
    itens: linha.itens ?? [],
    custos: linha.custos ?? [],
  }
}

function ordenar(lista: Orcamento[]): Orcamento[] {
  return [...lista].sort((a, b) => b.numero - a.numero)
}

function traduzirErro(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(mensagem)) return 'Confirme o e-mail antes de entrar.'
  if (/failed to fetch|network/i.test(mensagem)) return 'Sem conexão com o servidor. Verifique a internet.'
  return mensagem
}

function criarApiSupabase(cliente: SupabaseClient): Api {
  async function exigir<T>(promessa: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await promessa
    if (error) throw new Error(traduzirErro(error.message))
    return data
  }

  return {
    modo: 'supabase',
    async usuarioAtual() {
      const { data } = await cliente.auth.getSession()
      return data.session?.user.email ?? null
    },
    aoMudarLogin(callback) {
      const { data } = cliente.auth.onAuthStateChange((_evento, sessao) => callback(sessao?.user.email ?? null))
      return () => data.subscription.unsubscribe()
    },
    async entrar(email, senha) {
      const { error } = await cliente.auth.signInWithPassword({ email, password: senha })
      if (error) throw new Error(traduzirErro(error.message))
    },
    async sair() {
      await cliente.auth.signOut()
    },
    async listar() {
      const linhas = await exigir(cliente.from('orcamentos').select('*').order('numero', { ascending: false }))
      return (linhas as Orcamento[]).map(normalizar)
    },
    async obter(id) {
      const linha = await exigir(cliente.from('orcamentos').select('*').eq('id', id).maybeSingle())
      return linha ? normalizar(linha as Orcamento) : null
    },
    async salvar(orcamento) {
      // número, datas de controle e dono são definidos pelo banco
      const { id, numero: _numero, criado_em: _criado, atualizado_em: _atualizado, ...dados } = orcamento
      const consulta = id
        ? cliente.from('orcamentos').update(dados).eq('id', id).select().single()
        : cliente.from('orcamentos').insert(dados).select().single()
      return normalizar((await exigir(consulta)) as Orcamento)
    },
    async excluir(id) {
      await exigir(cliente.from('orcamentos').delete().eq('id', id))
    },
    async obterConfig() {
      const linha = await exigir(cliente.from('configuracoes').select('dados').maybeSingle())
      return completarConfig((linha as { dados: Partial<Configuracoes> } | null)?.dados)
    },
    async salvarConfig(config) {
      const { data } = await cliente.auth.getUser()
      if (!data.user) throw new Error('Sessão expirada. Entre novamente.')
      await exigir(cliente.from('configuracoes').upsert({ user_id: data.user.id, dados: config }))
    },
    async restaurar(backup) {
      await exigir(cliente.rpc('restaurar_backup', { backup }))
    },
  }
}

const CHAVE_DEMO = 'orcamentos-demo'

interface DadosDemo {
  orcamentos: Orcamento[]
  configuracoes: Configuracoes
}

function criarApiDemo(): Api {
  function ler(): DadosDemo {
    try {
      const salvo = localStorage.getItem(CHAVE_DEMO)
      if (salvo) {
        const dados = JSON.parse(salvo) as DadosDemo
        return { orcamentos: dados.orcamentos ?? [], configuracoes: completarConfig(dados.configuracoes) }
      }
    } catch {
      // dados corrompidos: recomeça do zero
    }
    return { orcamentos: [], configuracoes: completarConfig(null) }
  }

  function gravar(dados: DadosDemo) {
    localStorage.setItem(CHAVE_DEMO, JSON.stringify(dados))
  }

  return {
    modo: 'demo',
    async usuarioAtual() {
      return 'demonstração'
    },
    aoMudarLogin() {
      return () => {}
    },
    async entrar() {},
    async sair() {},
    async listar() {
      return ordenar(ler().orcamentos)
    },
    async obter(id) {
      return ler().orcamentos.find((o) => o.id === id) ?? null
    },
    async salvar(orcamento) {
      const dados = ler()
      const agora = new Date().toISOString()
      const existente = orcamento.id ? dados.orcamentos.find((o) => o.id === orcamento.id) : undefined
      const salvo: Orcamento = existente
        ? { ...existente, ...orcamento, id: existente.id, numero: existente.numero, atualizado_em: agora }
        : {
            ...orcamento,
            id: novoId(),
            numero: dados.orcamentos.reduce((max, o) => Math.max(max, o.numero), 0) + 1,
            data_emissao: orcamento.data_emissao || hojeISO(),
            criado_em: agora,
            atualizado_em: agora,
          }
      dados.orcamentos = [...dados.orcamentos.filter((o) => o.id !== salvo.id), salvo]
      gravar(dados)
      return salvo
    },
    async excluir(id) {
      const dados = ler()
      dados.orcamentos = dados.orcamentos.filter((o) => o.id !== id)
      gravar(dados)
    },
    async obterConfig() {
      return ler().configuracoes
    },
    async salvarConfig(config) {
      gravar({ ...ler(), configuracoes: config })
    },
    async restaurar(backup) {
      gravar({ orcamentos: backup.orcamentos, configuracoes: completarConfig(backup.configuracoes) })
    },
  }
}

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const api: Api = url && chave ? criarApiSupabase(createClient(url, chave)) : criarApiDemo()

export function nomeArquivo(orcamento: Pick<Orcamento, 'numero' | 'cliente_nome'>): string {
  const cliente = orcamento.cliente_nome.trim().replace(/[\\/:*?"<>|]/g, '').slice(0, 40)
  return [numeroFormatado(orcamento.numero), cliente].filter(Boolean).join(' - ')
}
