import type { Configuracoes, CustoTipo, Impressao, LocalTipo, NivelSujeira, PosObra, Status, TipoOrcamento } from '../types'

export const TIPOS: TipoOrcamento[] = ['higienizacao', 'pos_obra', 'impressao3d']

export const TIPO_ROTULO: Record<TipoOrcamento, string> = {
  higienizacao: 'Higienização',
  pos_obra: 'Pós-obra',
  impressao3d: 'Impressão 3D',
}

export const TIPO_COR: Record<TipoOrcamento, string> = {
  higienizacao: 'bg-teal-50 text-teal-800 ring-teal-200',
  pos_obra: 'bg-orange-50 text-orange-800 ring-orange-200',
  impressao3d: 'bg-violet-50 text-violet-800 ring-violet-200',
}

export const NIVEIS: NivelSujeira[] = ['leve', 'media', 'pesada']

export const NIVEL_ROTULO: Record<NivelSujeira, string> = {
  leve: 'Leve',
  media: 'Média',
  pesada: 'Pesada',
}

export const POS_OBRA_PADRAO: PosObra = {
  area_m2: 0,
  valor_m2: 0,
  nivel: 'media',
  quartos: 0,
  banheiros: 0,
  salas: 0,
  cozinhas: 0,
  areas_externas: 0,
  equipe: 0,
  dias: 0,
  checklist: [],
}

export const IMPRESSAO_PADRAO: Impressao = { descricao: '', unidades: 1, prazo_dias: 7, filamento_kg: 0, nfc: false }

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

export const CUSTO_TIPOS: CustoTipo[] = ['produto', 'maquina', 'aluguel', 'ajudante', 'transporte', 'filamento', 'outros']

export const CUSTO_ROTULO: Record<CustoTipo, string> = {
  produto: 'Produto',
  maquina: 'Máquina',
  aluguel: 'Aluguel de equipamento',
  ajudante: 'Ajudante',
  transporte: 'Transporte',
  filamento: 'Filamento',
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
  pix_titular: '',
  pix_banco: '',
  logo: '',
  condicoes_padrao:
    'Pagamento via PIX, dinheiro ou cartão.\n' +
    'O serviço é agendado após a aprovação do orçamento.\n' +
    'O tempo de secagem varia de 6 a 12 horas, conforme o tecido e a ventilação do local.\n' +
    'Manchas antigas podem não sair por completo, dependendo da origem e do tecido.',
  condicoes_padrao_3d:
    'Pagamento via PIX, dinheiro ou cartão.\n' +
    'A produção começa após a aprovação do orçamento.\n' +
    'Pequenas marcas de camada são normais na impressão 3D.\n' +
    'Alterações no modelo depois da aprovação podem mudar o valor e o prazo.',
  filamento_preco_kg: 0,
  condicoes_padrao_pos_obra:
    'Pagamento via PIX, dinheiro ou cartão.\n' +
    'O serviço é agendado após a aprovação do orçamento.\n' +
    'A obra deve estar concluída, com água e energia elétrica funcionando no imóvel.\n' +
    'O valor considera a área informada; se a área real for diferente, o valor é ajustado.',
  valor_m2_pos_obra: 0,
  checklist_pos_obra: [
    ...[
      'Remoção de respingos de tinta, cimento e massa',
      'Limpeza de pisos e rejuntes',
      'Limpeza de azulejos e revestimentos',
      'Vidros e janelas (lado interno e partes externas de fácil acesso)',
      'Armários por dentro e por fora',
      'Banheiros, louças e metais',
      'Portas, batentes e rodapés',
      'Tomadas, interruptores e luminárias',
      'Remoção de poeira em todos os cômodos',
    ].map((descricao, i) => ({ id: `inc-${i + 1}`, descricao, incluso: true })),
    ...[
      'Retirada de entulho e restos de obra',
      'Vidros externos em altura, sem acesso seguro',
      'Higienização de estofados e tapetes (orçada à parte)',
    ].map((descricao, i) => ({ id: `nao-${i + 1}`, descricao, incluso: false })),
  ],
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
