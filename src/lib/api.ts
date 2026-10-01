import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Backup, Configuracoes, Orcamento, OrcamentoEditavel } from '../types'
import { CONFIG_PADRAO } from './constantes'
import { hojeISO, numeroFormatado } from './calc'
import { novoId } from './formato'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabase.config'
import { MODO_ARTIFACT, usarRecurso } from './plataforma'

export interface Api {
  /** 'demo' quando o Supabase não está configurado: tudo fica só neste navegador.
   *  'artifact' na página publicada no claude.ai, com o banco embutido dela. */
  modo: 'supabase' | 'demo' | 'artifact'
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

// ---------------------------------------------------------------------------
// Página no claude.ai: banco embutido da própria página (capability `db`).
// Só o dono da página lê e grava (regra declarada na publicação).
// ---------------------------------------------------------------------------

interface DocSnap {
  id: string
  exists: boolean
  data(): Record<string, unknown> | undefined
}
interface DocRef {
  get(): Promise<DocSnap>
  set(dados: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
}
interface ColRef {
  doc(id: string): DocRef
  limit(n: number): { get(): Promise<{ docs: DocSnap[] }> }
}
interface DbCap {
  doc(caminho: string): DocRef
  collection(caminho: string): ColRef
}

function erroDb(e: unknown): Error {
  const codigo = (e as { code?: string })?.code
  if (codigo === 'quota_exceeded') return new Error('O espaço do banco acabou. Exclua orçamentos antigos (depois de baixar um backup).')
  if (codigo === 'invalid_argument') return new Error('Só o dono desta página pode alterar os dados.')
  if (codigo === 'revoked' || codigo === 'not_granted') return new Error('O acesso ao banco foi encerrado. Recarregue a página.')
  return new Error((e as { message?: string })?.message || 'Falha ao acessar o banco. Tente de novo.')
}

function criarApiArtifact(): Api {
  let promessa: Promise<DbCap | null> | null = null
  const banco = () => (promessa ??= usarRecurso<DbCap>('db'))

  async function exigirBanco(): Promise<DbCap> {
    const db = await banco()
    if (!db) throw new Error('Banco indisponível. Abra a página pelo claude.ai, com sua conta conectada.')
    return db
  }

  async function executar<T>(acao: (db: DbCap) => Promise<T>): Promise<T> {
    const db = await exigirBanco()
    try {
      return await acao(db)
    } catch (e) {
      if ((e as { code?: string })?.code === 'unavailable') {
        // instabilidade passageira: tenta mais uma vez
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000))
        try {
          return await acao(db)
        } catch (e2) {
          throw erroDb(e2)
        }
      }
      throw erroDb(e)
    }
  }

  const doc = (db: DbCap, id: string) => db.collection('orcamentos').doc(id)
  const paraDoc = (o: Orcamento) => JSON.parse(JSON.stringify(o)) as Record<string, unknown>

  async function todos(db: DbCap): Promise<Orcamento[]> {
    const snap = await db.collection('orcamentos').limit(1000).get()
    return snap.docs.filter((d) => d.exists).map((d) => normalizar(d.data() as unknown as Orcamento))
  }

  return {
    modo: 'artifact',
    async usuarioAtual() {
      return (await banco()) ? 'claude' : null
    },
    aoMudarLogin() {
      return () => {}
    },
    async entrar() {},
    async sair() {},
    async listar() {
      return ordenar(await executar(todos))
    },
    async obter(id) {
      return executar(async (db) => {
        const snap = await doc(db, id).get()
        return snap.exists ? normalizar(snap.data() as unknown as Orcamento) : null
      })
    },
    async salvar(orcamento) {
      return executar(async (db) => {
        const agora = new Date().toISOString()
        let salvo: Orcamento
        if (orcamento.id) {
          const atual = await doc(db, orcamento.id).get()
          if (!atual.exists) throw new Error('Este orçamento foi excluído.')
          const antigo = atual.data() as unknown as Orcamento
          salvo = { ...antigo, ...orcamento, id: antigo.id, numero: antigo.numero, criado_em: antigo.criado_em, atualizado_em: agora }
        } else {
          const numero = (await todos(db)).reduce((max, o) => Math.max(max, o.numero), 0) + 1
          salvo = { ...orcamento, id: novoId(), numero, criado_em: agora, atualizado_em: agora }
        }
        await doc(db, salvo.id).set(paraDoc(salvo))
        return salvo
      })
    },
    async excluir(id) {
      await executar((db) => doc(db, id).delete())
    },
    async obterConfig() {
      return executar(async (db) => {
        const snap = await db.doc('config/empresa').get()
        return completarConfig(snap.exists ? (snap.data() as Partial<Configuracoes>) : null)
      })
    },
    async salvarConfig(config) {
      await executar((db) => db.doc('config/empresa').set(JSON.parse(JSON.stringify(config))))
    },
    async restaurar(backup) {
      await executar(async (db) => {
        const manter = new Set(backup.orcamentos.map((o) => o.id))
        for (const o of await todos(db)) {
          if (!manter.has(o.id)) await doc(db, o.id).delete()
        }
        for (const o of backup.orcamentos) {
          const completo = { ...o, id: o.id || novoId() }
          await doc(db, completo.id).set(paraDoc(completo))
        }
        await db.doc('config/empresa').set(JSON.parse(JSON.stringify(completarConfig(backup.configuracoes))))
      })
    },
  }
}

const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

export const api: Api = MODO_ARTIFACT
  ? criarApiArtifact()
  : url && chave
    ? criarApiSupabase(createClient(url, chave))
    : criarApiDemo()

export function nomeArquivo(orcamento: Pick<Orcamento, 'numero' | 'cliente_nome'>): string {
  const cliente = orcamento.cliente_nome.trim().replace(/[\\/:*?"<>|]/g, '').slice(0, 40)
  return [numeroFormatado(orcamento.numero), cliente].filter(Boolean).join(' - ')
}
