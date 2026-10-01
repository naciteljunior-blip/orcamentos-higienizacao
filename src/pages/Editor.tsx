import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Aviso, Cabecalho, Campo, CampoNumero, Carregando, Erro, Opcoes, Secao, StatusBadge } from '../components/ui'
import { api, nomeArquivo } from '../lib/api'
import { baixarArquivo } from '../lib/backup'
import { hojeISO, numeroFormatado, resultado, somarDias, subtotal, totalItem, valorDesconto, valorParcela } from '../lib/calc'
import { useConfig } from '../lib/configContexto'
import { CUSTO_ROTULO, CUSTO_TIPOS, LOCAL_ROTULO, LOCAL_TIPOS, STATUS, STATUS_ROTULO } from '../lib/constantes'
import { dataBR, linkWhatsApp, novoId, porcentagem, reais } from '../lib/formato'
import type { Configuracoes, Custo, Item, Orcamento, OrcamentoEditavel, OrcamentoNovo } from '../types'

function orcamentoInicial(config: Configuracoes): OrcamentoNovo {
  return {
    status: 'rascunho',
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    local_tipo: 'apartamento',
    endereco: '',
    complemento: '',
    data_servico: null,
    hora_servico: null,
    data_emissao: hojeISO(),
    validade_dias: config.validade_padrao,
    itens: [{ id: novoId(), descricao: '', quantidade: 1, valor_unitario: 0 }],
    desconto_tipo: 'valor',
    desconto: 0,
    custos: [],
    pagamento_forma: 'a_vista',
    pagamento_parcelas: 1,
    condicoes: config.condicoes_padrao,
    observacoes: '',
  }
}

/** Cópia de um orçamento como novo rascunho (sem id, número nem datas de controle). */
function copiaDe(o: Orcamento): OrcamentoNovo {
  const { id: _id, numero: _numero, criado_em: _criado, atualizado_em: _atualizado, ...resto } = o
  return {
    ...resto,
    status: 'rascunho',
    data_emissao: hojeISO(),
    itens: o.itens.map((i) => ({ ...i, id: novoId() })),
    custos: o.custos.map((c) => ({ ...c, id: novoId() })),
  }
}

const PARCELAS = Array.from({ length: 11 }, (_, i) => i + 2)

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { config, carregada } = useConfig()

  const [o, setO] = useState<OrcamentoEditavel | null>(null)
  const [salvoJson, setSalvoJson] = useState('')
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<null | 'salvando' | 'pdf'>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const idCarregado = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (id) {
      if (idCarregado.current === id) return // acabamos de salvar este orçamento: já está em memória
      idCarregado.current = id
      setO(null)
      api
        .obter(id)
        .then((r) => {
          if (!r) return setErroCarga('Orçamento não encontrado.')
          setO(r)
          setSalvoJson(JSON.stringify(r))
        })
        .catch((e: Error) => setErroCarga(e.message))
    } else if (carregada) {
      idCarregado.current = undefined
      const origem = (location.state as { copiaDe?: Orcamento } | null)?.copiaDe
      setO(origem ? copiaDe(origem) : orcamentoInicial(config))
      setSalvoJson('')
    }
    // a configuração só é usada para montar um orçamento novo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, carregada, location.key])

  const alterado = o !== null && JSON.stringify(o) !== salvoJson

  useEffect(() => {
    if (!alterado) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [alterado])

  const fecharAviso = useCallback(() => setAviso(null), [])

  if (erroCarga) {
    return (
      <>
        <Cabecalho titulo="Orçamento" esquerda={<Voltar />} />
        <main className="mx-auto max-w-3xl p-4">
          <Erro mensagem={erroCarga} />
        </main>
      </>
    )
  }
  if (!o) {
    return (
      <>
        <Cabecalho titulo="Orçamento" esquerda={<Voltar />} />
        <Carregando />
      </>
    )
  }

  const atual = o
  const r = resultado(atual)
  const desconto = valorDesconto(atual)

  function alterar<K extends keyof OrcamentoEditavel>(campo: K, valor: OrcamentoEditavel[K]) {
    setO((anterior) => (anterior ? { ...anterior, [campo]: valor } : anterior))
  }
  function alterarItem(itemId: string, mudanca: Partial<Item>) {
    alterar('itens', atual.itens.map((i) => (i.id === itemId ? { ...i, ...mudanca } : i)))
  }
  function alterarCusto(custoId: string, mudanca: Partial<Custo>) {
    alterar('custos', atual.custos.map((c) => (c.id === custoId ? { ...c, ...mudanca } : c)))
  }
  function adicionarItem(descricao = '', valor = 0) {
    // reaproveita uma linha vazia em vez de deixar sobrando
    const vazia = atual.itens.find((i) => !i.descricao.trim() && !i.valor_unitario)
    if (vazia && descricao) return alterarItem(vazia.id, { descricao, valor_unitario: valor })
    alterar('itens', [...atual.itens, { id: novoId(), descricao, quantidade: 1, valor_unitario: valor }])
  }

  async function salvar(comAviso = true): Promise<Orcamento | null> {
    if (!atual.cliente_nome.trim()) {
      setAviso('Informe o nome do cliente.')
      document.getElementById('cliente-nome')?.focus()
      return null
    }
    if (!alterado && atual.id) return atual as Orcamento
    setOcupado('salvando')
    try {
      const itens = atual.itens.filter((i) => i.descricao.trim() || i.valor_unitario)
      const custos = atual.custos.filter((c) => c.valor || c.descricao.trim())
      const salvo = await api.salvar({ ...atual, itens, custos })
      setO(salvo)
      setSalvoJson(JSON.stringify(salvo))
      if (!atual.id) {
        idCarregado.current = salvo.id
        navigate(`/orcamento/${salvo.id}`, { replace: true })
      }
      if (comAviso) setAviso(`${numeroFormatado(salvo.numero)} salvo`)
      return salvo
    } catch (e) {
      setAviso(`Erro ao salvar: ${(e as Error).message}`)
      return null
    } finally {
      setOcupado(null)
    }
  }

  async function gerarPdf(modo: 'compartilhar' | 'baixar') {
    const salvo = await salvar(false)
    if (!salvo) return
    setOcupado('pdf')
    try {
      const { gerarPdf } = await import('../lib/pdf')
      const blob = gerarPdf(salvo, config)
      const nome = `${nomeArquivo(salvo)}.pdf`
      const arquivo = new File([blob], nome, { type: 'application/pdf' })
      let feito = false
      if (modo === 'compartilhar' && navigator.canShare?.({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo], title: nome })
          feito = true
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
          // compartilhamento indisponível: baixa o arquivo
        }
      }
      if (!feito) baixarArquivo(blob, nome)
      if (salvo.status === 'rascunho' && window.confirm('PDF gerado. Marcar este orçamento como "Enviado"?')) {
        const enviado = await api.salvar({ ...salvo, status: 'enviado' })
        setO(enviado)
        setSalvoJson(JSON.stringify(enviado))
      }
    } catch (e) {
      setAviso(`Erro ao gerar PDF: ${(e as Error).message}`)
    } finally {
      setOcupado(null)
    }
  }

  async function excluir() {
    if (!atual.id) return navigate('/')
    if (!window.confirm(`Excluir ${numeroFormatado(atual.numero)} de ${atual.cliente_nome}? Isso não pode ser desfeito.`)) return
    try {
      await api.excluir(atual.id)
      navigate('/', { replace: true })
    } catch (e) {
      setAviso(`Erro ao excluir: ${(e as Error).message}`)
    }
  }

  function duplicar() {
    if (alterado && !window.confirm('Há alterações não salvas. Duplicar mesmo assim (a cópia usa o que está na tela)?')) return
    navigate('/orcamento/novo', { state: { copiaDe: atual } })
  }

  const whatsapp = linkWhatsApp(atual.cliente_telefone)

  return (
    <>
      <Aviso texto={aviso} aoFechar={fecharAviso} />
      <Cabecalho
        esquerda={<Voltar alterado={alterado} />}
        titulo={numeroFormatado(atual.numero)}
        direita={<StatusBadge status={atual.status} />}
      />

      <main className="mx-auto max-w-3xl space-y-3 p-4 pb-40">
        <Secao titulo="Status">
          <Opcoes
            rotulo="Status do orçamento"
            valor={atual.status}
            aoMudar={(s) => alterar('status', s)}
            opcoes={STATUS.map((s) => ({ valor: s, rotulo: STATUS_ROTULO[s] }))}
          />
        </Secao>

        <Secao titulo="Cliente">
          <div className="space-y-3">
            <Campo rotulo="Nome *">
              <input
                id="cliente-nome"
                className="campo"
                autoComplete="off"
                value={atual.cliente_nome}
                onChange={(e) => alterar('cliente_nome', e.target.value)}
              />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Telefone / WhatsApp">
                <div className="flex gap-2">
                  <input
                    className="campo"
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 91234-5678"
                    value={atual.cliente_telefone}
                    onChange={(e) => alterar('cliente_telefone', e.target.value)}
                  />
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-secundario shrink-0 px-3 text-sm" aria-label="Abrir conversa no WhatsApp">
                      WhatsApp
                    </a>
                  )}
                </div>
              </Campo>
              <Campo rotulo="E-mail">
                <input
                  className="campo"
                  type="email"
                  inputMode="email"
                  value={atual.cliente_email}
                  onChange={(e) => alterar('cliente_email', e.target.value)}
                />
              </Campo>
            </div>
          </div>
        </Secao>

        <Secao titulo="Local e data">
          <div className="space-y-3">
            <Opcoes
              rotulo="Tipo de local"
              valor={atual.local_tipo}
              aoMudar={(t) => alterar('local_tipo', t)}
              opcoes={LOCAL_TIPOS.map((t) => ({ valor: t, rotulo: LOCAL_ROTULO[t] }))}
            />
            <Campo rotulo="Endereço">
              <input
                className="campo"
                placeholder="Rua, número, bairro, cidade"
                value={atual.endereco}
                onChange={(e) => alterar('endereco', e.target.value)}
              />
            </Campo>
            <Campo rotulo="Bloco / Apto / Complemento">
              <input
                className="campo"
                placeholder="Ex.: Bloco B, apto 42"
                value={atual.complemento}
                onChange={(e) => alterar('complemento', e.target.value)}
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Data do serviço">
                <input
                  className="campo"
                  type="date"
                  value={atual.data_servico ?? ''}
                  onChange={(e) => alterar('data_servico', e.target.value || null)}
                />
              </Campo>
              <Campo rotulo="Hora">
                <input
                  className="campo"
                  type="time"
                  value={atual.hora_servico ?? ''}
                  onChange={(e) => alterar('hora_servico', e.target.value || null)}
                />
              </Campo>
            </div>
          </div>
        </Secao>

        <Secao titulo="Serviços">
          <ul className="space-y-3">
            {atual.itens.map((item, indice) => (
              <li key={item.id} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="flex gap-2">
                  <input
                    className="campo"
                    placeholder="Descrição do serviço"
                    aria-label={`Descrição do item ${indice + 1}`}
                    value={item.descricao}
                    onChange={(e) => alterarItem(item.id, { descricao: e.target.value })}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-3 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remover item ${indice + 1}`}
                    onClick={() => alterar('itens', atual.itens.filter((i) => i.id !== item.id))}
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-[4.5rem_1fr_auto] items-end gap-2">
                  <Campo rotulo="Qtd.">
                    <CampoNumero valor={item.quantidade} placeholder="1" aoMudar={(v) => alterarItem(item.id, { quantidade: v })} />
                  </Campo>
                  <Campo rotulo="Valor unitário">
                    <CampoNumero valor={item.valor_unitario} prefixo="R$" aoMudar={(v) => alterarItem(item.id, { valor_unitario: v })} />
                  </Campo>
                  <div className="pb-2.5 text-right">
                    <span className="rotulo mb-0">Total</span>
                    <span className="font-semibold">{reais(totalItem(item))}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-secundario" onClick={() => adicionarItem()}>
              + Adicionar item
            </button>
            {config.catalogo.length > 0 && (
              <select
                className="campo font-semibold text-slate-700"
                aria-label="Adicionar serviço do catálogo"
                value=""
                onChange={(e) => {
                  const servico = config.catalogo.find((s) => s.id === e.target.value)
                  if (servico) adicionarItem(servico.descricao, servico.valor)
                }}
              >
                <option value="">+ Do catálogo…</option>
                {config.catalogo.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.descricao}
                    {s.valor ? ` — ${reais(s.valor)}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Secao>

        <Secao titulo="Desconto e pagamento">
          <div className="space-y-4">
            <div>
              <span className="rotulo">Desconto</span>
              <div className="flex gap-2">
                <Opcoes
                  rotulo="Tipo de desconto"
                  valor={atual.desconto_tipo}
                  aoMudar={(t) => alterar('desconto_tipo', t)}
                  opcoes={[
                    { valor: 'valor', rotulo: 'R$' },
                    { valor: 'percentual', rotulo: '%' },
                  ]}
                />
                <div className="flex-1">
                  <CampoNumero
                    rotuloAcessivel="Valor do desconto"
                    valor={atual.desconto}
                    prefixo={atual.desconto_tipo === 'valor' ? 'R$' : undefined}
                    sufixo={atual.desconto_tipo === 'percentual' ? '%' : undefined}
                    placeholder="0"
                    aoMudar={(v) => alterar('desconto', v)}
                  />
                </div>
              </div>
            </div>

            <div>
              <span className="rotulo">Forma de pagamento</span>
              <div className="flex flex-wrap items-center gap-2">
                <Opcoes
                  rotulo="Forma de pagamento"
                  valor={atual.pagamento_forma}
                  aoMudar={(f) => {
                    setO((a) =>
                      a && {
                        ...a,
                        pagamento_forma: f,
                        pagamento_parcelas: f === 'parcelado' ? Math.max(2, a.pagamento_parcelas) : 1,
                      },
                    )
                  }}
                  opcoes={[
                    { valor: 'a_vista', rotulo: 'À vista (no ato)' },
                    { valor: 'parcelado', rotulo: 'Parcelado' },
                  ]}
                />
                {atual.pagamento_forma === 'parcelado' && (
                  <select
                    className="campo w-auto"
                    aria-label="Número de parcelas"
                    value={atual.pagamento_parcelas}
                    onChange={(e) => alterar('pagamento_parcelas', Number(e.target.value))}
                  >
                    {PARCELAS.map((n) => (
                      <option key={n} value={n}>
                        {n}x de {reais(valorParcela(r.total, n))}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <dl className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal</dt>
                <dd>{reais(subtotal(atual.itens))}</dd>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-red-700">
                  <dt>Desconto</dt>
                  <dd>- {reais(desconto)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold">
                <dt>Total</dt>
                <dd>{reais(r.total)}</dd>
              </div>
            </dl>
          </div>
        </Secao>

        <Secao titulo="Condições e observações">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Data de emissão">
                <input
                  className="campo"
                  type="date"
                  value={atual.data_emissao}
                  onChange={(e) => e.target.value && alterar('data_emissao', e.target.value)}
                />
              </Campo>
              <Campo rotulo="Validade (dias)">
                <CampoNumero
                  valor={atual.validade_dias}
                  placeholder="30"
                  aoMudar={(v) => alterar('validade_dias', Math.max(0, Math.round(v)))}
                />
              </Campo>
            </div>
            <p className="text-sm text-slate-500">Válido até {dataBR(somarDias(atual.data_emissao, atual.validade_dias))}</p>
            <Campo rotulo="Condições (aparecem no PDF)">
              <textarea
                className="campo min-h-28"
                value={atual.condicoes}
                onChange={(e) => alterar('condicoes', e.target.value)}
              />
            </Campo>
            <Campo rotulo="Observações (aparecem no PDF)">
              <textarea
                className="campo min-h-20"
                placeholder="Ex.: sofá com mancha de café no assento"
                value={atual.observacoes}
                onChange={(e) => alterar('observacoes', e.target.value)}
              />
            </Campo>
          </div>
        </Secao>

        <Secao
          titulo="Custos internos"
          className="ring-2 ring-amber-300"
          extra={<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Não aparece no PDF</span>}
        >
          <ul className="space-y-3">
            {atual.custos.map((custo, indice) => (
              <li key={custo.id} className="rounded-lg bg-amber-50/60 p-3 ring-1 ring-amber-200">
                <div className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
                  <Campo rotulo="Tipo">
                    <select
                      className="campo"
                      value={custo.tipo}
                      onChange={(e) => alterarCusto(custo.id, { tipo: e.target.value as Custo['tipo'] })}
                    >
                      {CUSTO_TIPOS.map((t) => (
                        <option key={t} value={t}>
                          {CUSTO_ROTULO[t]}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo rotulo="Valor">
                    <CampoNumero valor={custo.valor} prefixo="R$" aoMudar={(v) => alterarCusto(custo.id, { valor: v })} />
                  </Campo>
                  <button
                    type="button"
                    className="mb-1 rounded-lg px-3 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remover custo ${indice + 1}`}
                    onClick={() => alterar('custos', atual.custos.filter((c) => c.id !== custo.id))}
                  >
                    ✕
                  </button>
                </div>
                <input
                  className="campo mt-2"
                  placeholder="Descrição (opcional)"
                  aria-label={`Descrição do custo ${indice + 1}`}
                  value={custo.descricao}
                  onChange={(e) => alterarCusto(custo.id, { descricao: e.target.value })}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-secundario mt-3 w-full"
            onClick={() => alterar('custos', [...atual.custos, { id: novoId(), tipo: 'produto', descricao: '', valor: 0 }])}
          >
            + Adicionar custo
          </button>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
              <dt className="text-xs text-slate-500">Custos</dt>
              <dd className="font-bold">{reais(r.custos)}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
              <dt className="text-xs text-slate-500">Lucro</dt>
              <dd className={`font-bold ${r.lucro < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{reais(r.lucro)}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
              <dt className="text-xs text-slate-500">Margem</dt>
              <dd className={`font-bold ${r.lucro < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{porcentagem(r.margem)}</dd>
            </div>
          </dl>
        </Secao>

        <section className="grid gap-2 sm:grid-cols-3">
          <button type="button" className="btn-secundario" onClick={() => void gerarPdf('baixar')} disabled={ocupado !== null}>
            Baixar PDF
          </button>
          <button type="button" className="btn-secundario" onClick={duplicar} disabled={!atual.id}>
            Duplicar
          </button>
          <button type="button" className="btn-perigo" onClick={() => void excluir()}>
            {atual.id ? 'Excluir' : 'Descartar'}
          </button>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">{alterado ? 'Alterações não salvas' : 'Total'}</p>
            <p className="truncate text-lg font-bold">{reais(r.total)}</p>
          </div>
          <button type="button" className="btn-secundario" onClick={() => void salvar()} disabled={ocupado !== null || (!alterado && !!atual.id)}>
            {ocupado === 'salvando' ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" className="btn-primario" onClick={() => void gerarPdf('compartilhar')} disabled={ocupado !== null}>
            {ocupado === 'pdf' ? 'Gerando…' : 'Enviar PDF'}
          </button>
        </div>
      </div>
    </>
  )
}

function Voltar({ alterado = false }: { alterado?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Voltar para a lista"
      className="-ml-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      onClick={(e) => {
        if (alterado && !window.confirm('Sair sem salvar as alterações?')) e.preventDefault()
      }}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  )
}
