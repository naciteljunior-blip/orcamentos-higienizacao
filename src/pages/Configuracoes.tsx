import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Aviso, Cabecalho, Campo, CampoNumero, Carregando, Erro, Secao } from '../components/ui'
import { useConfirmar } from '../components/Confirmacao'
import { api } from '../lib/api'
import { baixarBackup, lerBackup, montarBackup } from '../lib/backup'
import { useConfig } from '../lib/configContexto'
import { novoId, reais } from '../lib/formato'
import type { Configuracoes as Config } from '../types'

/** Reduz a imagem do logo (máx. 400 px) para não pesar no banco nem no PDF. */
function lerLogo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    leitor.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagem não suportado.'))
      img.onload = () => {
        const escala = Math.min(1, 400 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const png = canvas.toDataURL('image/png')
        if (png.length <= 150_000) return resolve(png)
        // foto grande: JPEG fica bem menor (fundo branco no lugar da transparência)
        ctx.globalCompositeOperation = 'destination-over'
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = leitor.result as string
    }
    leitor.readAsDataURL(arquivo)
  })
}

export default function Configuracoes({ usuario }: { usuario: string }) {
  const { config, carregada, erro, recarregar, salvar } = useConfig()
  const confirmar = useConfirmar()
  const [form, setForm] = useState<Config>(config)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [restaurando, setRestaurando] = useState(false)
  const entradaBackup = useRef<HTMLInputElement>(null)
  const fecharAviso = useCallback(() => setAviso(null), [])

  useEffect(() => setForm(config), [config])

  const alterado = JSON.stringify(form) !== JSON.stringify(config)

  function alterar<K extends keyof Config>(campo: K, valor: Config[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function salvarForm() {
    setSalvando(true)
    try {
      await salvar({ ...form, catalogo: form.catalogo.filter((s) => s.descricao.trim()) })
      setAviso('Configurações salvas')
    } catch (e) {
      setAviso(`Erro ao salvar: ${(e as Error).message}`)
    } finally {
      setSalvando(false)
    }
  }

  async function exportar() {
    try {
      if (await baixarBackup(montarBackup(config, await api.listar()))) setAviso('Backup salvo')
    } catch (e) {
      setAviso(`Erro ao gerar backup: ${(e as Error).message}`)
    }
  }

  async function importar(arquivo: File) {
    setRestaurando(true)
    try {
      const backup = lerBackup(await arquivo.text())
      const atuais = await api.listar()
      const ok = await confirmar(
        `Restaurar o backup de ${new Date(backup.exportado_em).toLocaleString('pt-BR')}?\n\n` +
          `Os ${atuais.length} orçamentos atuais e as configurações serão SUBSTITUÍDOS ` +
          `pelos ${backup.orcamentos.length} orçamentos do arquivo.\n\nDica: baixe um backup antes, por segurança.`,
        { confirmar: 'Restaurar', perigo: true },
      )
      if (!ok) return
      await api.restaurar(backup)
      await recarregar()
      setAviso(`Backup restaurado: ${backup.orcamentos.length} orçamentos`)
    } catch (e) {
      setAviso((e as Error).message)
    } finally {
      setRestaurando(false)
      if (entradaBackup.current) entradaBackup.current.value = ''
    }
  }

  if (!carregada) {
    return (
      <>
        <Cabecalho titulo="Ajustes" />
        <Carregando />
      </>
    )
  }

  const texto = (campo: 'empresa_nome' | 'documento' | 'telefone' | 'email' | 'endereco' | 'pix' | 'pix_titular' | 'pix_banco') => ({
    value: form[campo],
    onChange: (e: ChangeEvent<HTMLInputElement>) => alterar(campo, e.target.value),
  })

  return (
    <>
      <Aviso texto={aviso} aoFechar={fecharAviso} />
      <Cabecalho titulo="Ajustes" />
      <main className="mx-auto max-w-3xl space-y-3 p-4 pb-28">
        {erro && <Erro mensagem={erro} tentarDeNovo={recarregar} />}

        <Secao titulo="Dados da empresa (aparecem no PDF)">
          <div className="space-y-3">
            <Campo rotulo="Nome da empresa / profissional">
              <input className="campo" {...texto('empresa_nome')} />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="CNPJ ou CPF">
                <input className="campo" inputMode="numeric" {...texto('documento')} />
              </Campo>
              <Campo rotulo="Telefone / WhatsApp">
                <input className="campo" type="tel" inputMode="tel" {...texto('telefone')} />
              </Campo>
              <Campo rotulo="E-mail">
                <input className="campo" type="email" inputMode="email" {...texto('email')} />
              </Campo>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo rotulo="Chave PIX">
                <input className="campo" placeholder="Celular, CPF, CNPJ, e-mail…" {...texto('pix')} />
              </Campo>
              <Campo rotulo="Titular da conta">
                <input className="campo" {...texto('pix_titular')} />
              </Campo>
              <Campo rotulo="Banco">
                <input className="campo" {...texto('pix_banco')} />
              </Campo>
            </div>
            <Campo rotulo="Endereço ou cidade (opcional)">
              <input className="campo" {...texto('endereco')} />
            </Campo>
            <div>
              <span className="rotulo">Logo (opcional)</span>
              <div className="flex items-center gap-3">
                {form.logo ? (
                  <img src={form.logo} alt="Logo atual" className="h-16 w-16 rounded-lg bg-white object-contain ring-1 ring-slate-200" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400 ring-1 ring-slate-200">
                    Sem logo
                  </div>
                )}
                <label className="btn-secundario cursor-pointer text-sm">
                  Escolher imagem
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={async (e) => {
                      const arquivo = e.target.files?.[0]
                      if (!arquivo) return
                      try {
                        alterar('logo', await lerLogo(arquivo))
                      } catch (err) {
                        setAviso((err as Error).message)
                      }
                      e.target.value = ''
                    }}
                  />
                </label>
                {form.logo && (
                  <button type="button" className="text-sm font-semibold text-red-700" onClick={() => alterar('logo', '')}>
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
        </Secao>

        <Secao titulo="Padrões dos novos orçamentos">
          <div className="space-y-3">
            <Campo rotulo="Validade padrão (dias)" className="max-w-40">
              <CampoNumero
                valor={form.validade_padrao}
                placeholder="30"
                aoMudar={(v) => alterar('validade_padrao', Math.max(0, Math.round(v)))}
              />
            </Campo>
            <Campo rotulo="Condições padrão">
              <textarea
                className="campo min-h-36"
                value={form.condicoes_padrao}
                onChange={(e) => alterar('condicoes_padrao', e.target.value)}
              />
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Catálogo de serviços">
          <p className="mb-3 text-sm text-slate-500">
            Aparecem no botão “Do catálogo” ao montar um orçamento. O valor pode ser ajustado em cada orçamento.
          </p>
          <ul className="space-y-2">
            {form.catalogo.map((s, indice) => (
              <li key={s.id} className="grid grid-cols-[1fr_7.5rem_auto] gap-2">
                <input
                  className="campo"
                  aria-label={`Descrição do serviço ${indice + 1}`}
                  placeholder="Descrição"
                  value={s.descricao}
                  onChange={(e) =>
                    alterar('catalogo', form.catalogo.map((x) => (x.id === s.id ? { ...x, descricao: e.target.value } : x)))
                  }
                />
                <CampoNumero
                  rotuloAcessivel={`Valor do serviço ${indice + 1}`}
                  valor={s.valor}
                  prefixo="R$"
                  aoMudar={(v) => alterar('catalogo', form.catalogo.map((x) => (x.id === s.id ? { ...x, valor: v } : x)))}
                />
                <button
                  type="button"
                  className="rounded-lg px-3 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remover ${s.descricao || 'serviço'}`}
                  onClick={() => alterar('catalogo', form.catalogo.filter((x) => x.id !== s.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-secundario mt-3 w-full"
            onClick={() => alterar('catalogo', [...form.catalogo, { id: novoId(), descricao: '', valor: 0 }])}
          >
            + Adicionar serviço
          </button>
          {form.catalogo.some((s) => !s.valor) && (
            <p className="mt-2 text-xs text-slate-500">
              Serviços sem valor ({reais(0)}) entram no orçamento só com a descrição; o preço é preenchido na hora.
            </p>
          )}
        </Secao>

        <Secao titulo="Backup">
          <p className="mb-3 text-sm text-slate-500">
            Baixe uma cópia de todos os orçamentos e configurações. Guarde o arquivo no Google Drive ou envie para você mesmo
            de vez em quando.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-secundario" onClick={() => void exportar()}>
              Baixar backup
            </button>
            <label className={`btn-secundario cursor-pointer ${restaurando ? 'pointer-events-none opacity-50' : ''}`}>
              {restaurando ? 'Restaurando…' : 'Restaurar backup'}
              <input
                ref={entradaBackup}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0]
                  if (arquivo) void importar(arquivo)
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">Restaurar substitui todos os dados atuais pelos do arquivo.</p>
        </Secao>

        {api.modo === 'supabase' && (
          <Secao titulo="Conta">
            <p className="mb-3 text-sm text-slate-600">Conectado como {usuario}</p>
            <button type="button" className="btn-perigo w-full" onClick={() => void api.sair()}>
              Sair
            </button>
          </Secao>
        )}
      </main>

      {alterado && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
            <p className="flex-1 text-sm text-slate-600">Alterações não salvas</p>
            <button type="button" className="btn-secundario" onClick={() => setForm(config)}>
              Desfazer
            </button>
            <button type="button" className="btn-primario" onClick={() => void salvarForm()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
