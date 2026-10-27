export type Status = 'rascunho' | 'enviado' | 'aprovado' | 'em_andamento' | 'concluido' | 'recusado'
export type LocalTipo = 'apartamento' | 'predio' | 'casa' | 'comercio'
export type CustoTipo = 'produto' | 'maquina' | 'aluguel' | 'ajudante' | 'transporte' | 'filamento' | 'outros'
export type DescontoTipo = 'valor' | 'percentual'
export type PagamentoForma = 'a_vista' | 'parcelado'
export type TipoOrcamento = 'higienizacao' | 'impressao3d'

/** Dados próprios de um orçamento de impressão 3D. */
export interface Impressao {
  /** o que será feito */
  descricao: string
  unidades: number
  /** prazo de entrega em dias, contados da aprovação */
  prazo_dias: number
  /** filamento total do pedido, em kg */
  filamento_kg: number
  nfc: boolean
}

export interface Item {
  id: string
  descricao: string
  quantidade: number
  valor_unitario: number
}

export interface Custo {
  id: string
  tipo: CustoTipo
  descricao: string
  valor: number
}

export type MomentoFoto = 'antes' | 'depois'

export interface Foto {
  id: string
  momento: MomentoFoto
  /** id do arquivo no claude.ai, ou a própria imagem (data URL) no site próprio */
  ref: string
}

export interface Orcamento {
  id: string
  numero: number
  tipo: TipoOrcamento
  status: Status
  cliente_nome: string
  cliente_telefone: string
  cliente_email: string
  local_tipo: LocalTipo
  endereco: string
  complemento: string
  /** AAAA-MM-DD */
  data_servico: string | null
  /** HH:MM */
  hora_servico: string | null
  /** AAAA-MM-DD */
  data_emissao: string
  validade_dias: number
  itens: Item[]
  desconto_tipo: DescontoTipo
  desconto: number
  custos: Custo[]
  pagamento_forma: PagamentoForma
  pagamento_parcelas: number
  fotos: Foto[]
  /** inclui as fotos numa página extra do PDF */
  pdf_fotos: boolean
  impressao: Impressao
  condicoes: string
  observacoes: string
  criado_em: string
  atualizado_em: string
}

/** Orçamento ainda não salvo: o banco gera id, número e datas de controle. */
export type OrcamentoNovo = Omit<Orcamento, 'id' | 'numero' | 'criado_em' | 'atualizado_em'>
export type OrcamentoEditavel = OrcamentoNovo & Partial<Pick<Orcamento, 'id' | 'numero' | 'criado_em' | 'atualizado_em'>>

export interface ServicoCatalogo {
  id: string
  descricao: string
  valor: number
}

export interface Configuracoes {
  empresa_nome: string
  documento: string
  telefone: string
  email: string
  endereco: string
  pix: string
  /** nome de quem recebe o PIX, para o cliente conferir */
  pix_titular: string
  pix_banco: string
  /** imagem em data URL (já reduzida) */
  logo: string
  condicoes_padrao: string
  condicoes_padrao_3d: string
  /** custo do filamento por kg, para lançar o custo interno */
  filamento_preco_kg: number
  validade_padrao: number
  catalogo: ServicoCatalogo[]
}

export interface Backup {
  app: 'orcamentos-higienizacao'
  versao: 1
  exportado_em: string
  configuracoes: Configuracoes
  orcamentos: Orcamento[]
}
