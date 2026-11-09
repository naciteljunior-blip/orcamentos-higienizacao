import QRCode from 'qrcode'

/** Imagem PNG (data URL) do QR de um texto, pronta para a tela ou o PDF. */
export function qrDataUrl(texto: string, largura = 512): Promise<string> {
  return QRCode.toDataURL(texto, { errorCorrectionLevel: 'M', margin: 1, width: largura })
}
