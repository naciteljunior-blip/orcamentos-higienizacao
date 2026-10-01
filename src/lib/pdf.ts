import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { Configuracoes, Orcamento } from '../types'
import { LOCAL_ROTULO } from './constantes'
import { numeroFormatado, somarDias, subtotal, total, totalItem, valorDesconto, valorParcela } from './calc'
import { dataBR, dataHoraBR, decimal, reais } from './formato'
import { imagemParaPdf } from './imagem'

// Este módulo só usa os dados do cliente, itens, desconto e condições.
// Os custos internos (orcamento.custos) NUNCA entram no PDF.

const MARGEM = 15
const LARGURA = 210
const ALTURA = 297
const UTIL = LARGURA - MARGEM * 2
const COR_DESTAQUE: [number, number, number] = [15, 118, 110]
const COR_TEXTO: [number, number, number] = [30, 41, 59]
const COR_SUAVE: [number, number, number] = [100, 116, 139]

function formatoImagem(dataUrl: string): 'PNG' | 'JPEG' | null {
  if (dataUrl.startsWith('data:image/png')) return 'PNG'
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG'
  return null
}

export function textoPagamento(o: Pick<Orcamento, 'pagamento_forma' | 'pagamento_parcelas'>, valorTotal: number): string {
  if (o.pagamento_forma === 'parcelado' && o.pagamento_parcelas > 1) {
    return `Parcelado em ${o.pagamento_parcelas}x de ${reais(valorParcela(valorTotal, o.pagamento_parcelas))}`
  }
  return `À vista, no ato do serviço: ${reais(valorTotal)}`
}

export async function gerarPdf(o: Orcamento, config: Configuracoes, urlFoto: (ref: string) => string): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGEM

  const garantirEspaco = (altura: number) => {
    if (y + altura > ALTURA - MARGEM) {
      doc.addPage()
      y = MARGEM
    }
  }

  const titulo = (texto: string) => {
    garantirEspaco(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COR_DESTAQUE)
    doc.text(texto.toUpperCase(), MARGEM, y)
    doc.setDrawColor(...COR_DESTAQUE)
    doc.setLineWidth(0.3)
    doc.line(MARGEM, y + 1.5, LARGURA - MARGEM, y + 1.5)
    y += 6
  }

  const paragrafo = (texto: string, tamanho = 9.5) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(tamanho)
    doc.setTextColor(...COR_TEXTO)
    for (const linha of doc.splitTextToSize(texto, UTIL) as string[]) {
      garantirEspaco(5)
      doc.text(linha, MARGEM, y)
      y += tamanho * 0.45
    }
    y += 2
  }

  /** Linhas "Rótulo: valor" em duas colunas. */
  const pares = (lista: [string, string][]) => {
    const visiveis = lista.filter(([, valor]) => valor.trim())
    const meia = UTIL / 2
    for (let i = 0; i < visiveis.length; i += 2) {
      garantirEspaco(6)
      let alturaLinha = 5
      visiveis.slice(i, i + 2).forEach(([rotulo, valor], coluna) => {
        const x = MARGEM + coluna * meia
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...COR_SUAVE)
        doc.text(rotulo, x, y)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...COR_TEXTO)
        const linhas = doc.splitTextToSize(valor, meia - 4) as string[]
        doc.text(linhas, x, y + 4.5)
        alturaLinha = Math.max(alturaLinha, 4.5 + linhas.length * 4.5)
      })
      y += alturaLinha + 2
    }
  }

  // ---- Cabeçalho: logo + dados da empresa | número e datas ----
  let xTexto = MARGEM
  const formato = config.logo ? formatoImagem(config.logo) : null
  if (config.logo && formato) {
    try {
      const props = doc.getImageProperties(config.logo)
      const alturaLogo = 22
      const larguraLogo = Math.min(40, (props.width / props.height) * alturaLogo)
      doc.addImage(config.logo, formato, MARGEM, y, larguraLogo, (props.height / props.width) * larguraLogo)
      xTexto = MARGEM + larguraLogo + 5
    } catch {
      // logo inválido: segue sem ele
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COR_TEXTO)
  doc.text(config.empresa_nome || 'Orçamento', xTexto, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COR_SUAVE)
  const linhasEmpresa = [
    config.documento && `CNPJ/CPF: ${config.documento}`,
    [config.telefone, config.email].filter(Boolean).join('  |  '),
    config.endereco,
  ].filter(Boolean) as string[]
  linhasEmpresa.forEach((linha, i) => doc.text(linha, xTexto, y + 10 + i * 4))

  const direita = LARGURA - MARGEM
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COR_SUAVE)
  doc.text('ORÇAMENTO', direita, y + 1, { align: 'right' })
  doc.setFontSize(15)
  doc.setTextColor(...COR_DESTAQUE)
  doc.text(numeroFormatado(o.numero), direita, y + 7.5, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COR_TEXTO)
  doc.text(`Emissão: ${dataBR(o.data_emissao)}`, direita, y + 13, { align: 'right' })
  doc.text(`Válido até: ${dataBR(somarDias(o.data_emissao, o.validade_dias))}`, direita, y + 17.5, { align: 'right' })

  y += Math.max(26, 12 + linhasEmpresa.length * 4)

  // ---- Cliente e local ----
  titulo('Cliente')
  pares([
    ['Nome', o.cliente_nome],
    ['Telefone', o.cliente_telefone],
    ['E-mail', o.cliente_email],
  ])

  titulo('Local e data do serviço')
  pares([
    ['Tipo de local', LOCAL_ROTULO[o.local_tipo]],
    ['Data e hora', dataHoraBR(o.data_servico, o.hora_servico) || 'A combinar'],
    ['Endereço', o.endereco],
    ['Bloco / Apto / Complemento', o.complemento],
  ])

  // ---- Serviços ----
  titulo('Serviços')
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Descrição', 'Qtd.', 'Valor unit.', 'Total']],
    body: o.itens.map((item) => [item.descricao, decimal(item.quantidade), reais(item.valor_unitario), reais(totalItem(item))]),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9.5, textColor: COR_TEXTO, cellPadding: 2.2 },
    headStyles: { fillColor: COR_DESTAQUE, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 },
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5

  // ---- Totais ----
  const desconto = valorDesconto(o)
  const valorTotal = total(o)
  const linhaTotal = (rotulo: string, valor: string, destaque = false) => {
    garantirEspaco(7)
    doc.setFont('helvetica', destaque ? 'bold' : 'normal')
    doc.setFontSize(destaque ? 12 : 10)
    doc.setTextColor(...(destaque ? COR_DESTAQUE : COR_TEXTO))
    doc.text(rotulo, direita - 45, y, { align: 'right' })
    doc.text(valor, direita, y, { align: 'right' })
    y += destaque ? 7 : 5.5
  }
  if (desconto > 0) {
    linhaTotal('Subtotal', reais(subtotal(o.itens)))
    const rotuloDesconto = o.desconto_tipo === 'percentual' ? `Desconto (${decimal(o.desconto)}%)` : 'Desconto'
    linhaTotal(rotuloDesconto, `- ${reais(desconto)}`)
  }
  linhaTotal('TOTAL', reais(valorTotal), true)
  y += 2

  // ---- Pagamento ----
  titulo('Forma de pagamento')
  paragrafo(textoPagamento(o, valorTotal), 10)
  if (config.pix) paragrafo(`Chave PIX: ${config.pix}`, 10)

  if (o.condicoes.trim()) {
    titulo('Condições')
    paragrafo(o.condicoes)
  }
  if (o.observacoes.trim()) {
    titulo('Observações')
    paragrafo(o.observacoes)
  }

  paragrafo(
    `Este orçamento é válido por ${o.validade_dias} dias a partir da emissão ` +
      `(até ${dataBR(somarDias(o.data_emissao, o.validade_dias))}).`,
    9,
  )

  // ---- Assinatura ----
  garantirEspaco(40)
  y += 6
  titulo('Aprovação do cliente')
  paragrafo('Declaro que li e aprovo este orçamento, os serviços e as condições descritas acima.', 9.5)
  y += 14
  doc.setDrawColor(...COR_TEXTO)
  doc.setLineWidth(0.3)
  doc.line(MARGEM, y, MARGEM + 105, y)
  doc.line(MARGEM + 120, y, direita, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COR_SUAVE)
  doc.text(`Assinatura do cliente${o.cliente_nome ? ` - ${o.cliente_nome}` : ''}`, MARGEM, y + 4)
  doc.text('Data', MARGEM + 120, y + 4)

  // ---- Registro fotográfico (opcional) ----
  if (o.pdf_fotos && o.fotos.length) {
    doc.addPage()
    y = MARGEM
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...COR_TEXTO)
    doc.text('Registro fotográfico', MARGEM, y + 4)
    y += 12
    const coluna = (UTIL - 6) / 2
    const alturaMax = 75
    for (const [momento, rotulo] of [['antes', 'Antes do serviço'], ['depois', 'Depois do serviço']] as const) {
      const lista = o.fotos.filter((f) => f.momento === momento)
      if (!lista.length) continue
      titulo(rotulo)
      for (let i = 0; i < lista.length; i += 2) {
        const par = await Promise.all(
          lista.slice(i, i + 2).map((f) => imagemParaPdf(urlFoto(f.ref)).catch(() => null)),
        )
        const alturas = par.map((img) => (img ? Math.min(alturaMax, (img.altura / img.largura) * coluna) : 20))
        const alturaLinha = Math.max(...alturas)
        garantirEspaco(alturaLinha + 4)
        par.forEach((img, j) => {
          const x = MARGEM + j * (coluna + 6)
          if (!img) {
            doc.setFontSize(9)
            doc.setTextColor(...COR_SUAVE)
            doc.text('Foto indisponível', x, y + 8)
            return
          }
          // encaixa a foto na célula sem distorcer
          let largura = coluna
          let altura = (img.altura / img.largura) * largura
          if (altura > alturaMax) {
            altura = alturaMax
            largura = (img.largura / img.altura) * altura
          }
          doc.addImage(img.dados, 'JPEG', x, y, largura, altura)
        })
        y += alturaLinha + 4
      }
      y += 2
    }
  }

  // ---- Rodapé com paginação ----
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setFontSize(7.5)
    doc.setTextColor(...COR_SUAVE)
    doc.text(`${numeroFormatado(o.numero)}  |  página ${p} de ${paginas}`, LARGURA / 2, ALTURA - 8, { align: 'center' })
  }

  return doc.output('blob')
}
