import type { Configuracoes, CustoTipo, LocalTipo, Status } from '../types'

export const STATUS: Status[] = ['rascunho', 'enviado', 'aprovado', 'em_andamento', 'concluido', 'recusado']

export const STATUS_ROTULO: Record<Status, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  recusado: 'Recusado',
}

export const STATUS_COR: Record<Status, string> = {
  rascunho: 'bg-slate-100 text-slate-700 ring-slate-300',
  enviado: 'bg-sky-50 text-sky-800 ring-sky-200',
  aprovado: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  em_andamento: 'bg-amber-50 text-amber-800 ring-amber-200',
  concluido: 'bg-teal-700 text-white ring-teal-700',
  recusado: 'bg-red-50 text-red-700 ring-red-200',
}

/** Status que contam como faturamento no resumo mensal. */
export const STATUS_FATURADOS: Status[] = ['aprovado', 'em_andamento', 'concluido']

export const LOCAL_TIPOS: LocalTipo[] = ['apartamento', 'predio', 'casa', 'comercio']

export const LOCAL_ROTULO: Record<LocalTipo, string> = {
  apartamento: 'Apartamento',
  predio: 'Prédio',
  casa: 'Casa',
  comercio: 'Comércio',
}

export const CUSTO_TIPOS: CustoTipo[] = ['produto', 'maquina', 'aluguel', 'ajudante', 'transporte', 'outros']

export const CUSTO_ROTULO: Record<CustoTipo, string> = {
  produto: 'Produto',
  maquina: 'Máquina',
  aluguel: 'Aluguel de equipamento',
  ajudante: 'Ajudante',
  transporte: 'Transporte',
  outros: 'Outros',
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const CONFIG_PADRAO: Configuracoes = {
  empresa_nome: '',
  documento: '',
  telefone: '',
  email: '',
  endereco: '',
  pix: '',
  logo: '',
  condicoes_padrao:
    'Pagamento via PIX, dinheiro ou cartão.\n' +
    'O serviço é agendado após a aprovação do orçamento.\n' +
    'O tempo de secagem varia de 6 a 12 horas, conforme o tecido e a ventilação do local.\n' +
    'Manchas antigas podem não sair por completo, dependendo da origem e do tecido.',
  validade_padrao: 30,
  catalogo: [
    { id: 'sofa-2', descricao: 'Higienização de sofá 2 lugares', valor: 0 },
    { id: 'sofa-3', descricao: 'Higienização de sofá 3 lugares', valor: 0 },
    { id: 'sofa-retratil', descricao: 'Higienização de sofá retrátil', valor: 0 },
    { id: 'sofa-canto', descricao: 'Higienização de sofá de canto', valor: 0 },
    { id: 'colchao-solteiro', descricao: 'Higienização de colchão solteiro', valor: 0 },
    { id: 'colchao-casal', descricao: 'Higienização de colchão casal', valor: 0 },
    { id: 'colchao-queen', descricao: 'Higienização de colchão queen', valor: 0 },
    { id: 'colchao-king', descricao: 'Higienização de colchão king', valor: 0 },
    { id: 'tapete-m2', descricao: 'Higienização de tapete (m²)', valor: 0 },
    { id: 'cadeira', descricao: 'Higienização de cadeira estofada', valor: 0 },
    { id: 'poltrona', descricao: 'Higienização de poltrona', valor: 0 },
    { id: 'impermeabilizacao', descricao: 'Impermeabilização', valor: 0 },
  ],
}
