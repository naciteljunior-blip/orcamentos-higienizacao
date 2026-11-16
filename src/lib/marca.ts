import type { Configuracoes, Marca, Orcamento } from '../types'

/**
 * Marca do orçamento: a escolhida nele; sem escolha (ou se ela foi apagada), a primeira marcada
 * para o tipo do orçamento; senão, a primeira da lista. null quando não há marca cadastrada.
 */
export function marcaDoOrcamento(o: Pick<Orcamento, 'marca_id' | 'tipo'>, config: Pick<Configuracoes, 'marcas'>): Marca | null {
  return (
    (o.marca_id ? config.marcas.find((m) => m.id === o.marca_id) : undefined) ??
    config.marcas.find((m) => m.tipos.includes(o.tipo)) ??
    config.marcas[0] ??
    null
  )
}

/** Configurações com o nome e o logo da marca do orçamento, para o PDF e as mensagens. */
export function configDaMarca<C extends Pick<Configuracoes, 'marcas' | 'empresa_nome' | 'logo' | 'logo_com_nome'>>(
  o: Pick<Orcamento, 'marca_id' | 'tipo'>,
  config: C,
): C {
  const marca = marcaDoOrcamento(o, config)
  return marca ? { ...config, empresa_nome: marca.nome, logo: marca.logo, logo_com_nome: marca.logo_com_nome } : config
}
