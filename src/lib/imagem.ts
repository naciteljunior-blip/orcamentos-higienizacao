/** Reduz uma foto (lado maior até `maxLado` px) e converte em JPEG. */
export function comprimirImagem(arquivo: Blob, maxLado: number, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível abrir esta imagem. Use uma foto JPG ou PNG.'))
    }
    img.onload = () => {
      URL.revokeObjectURL(url)
      const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * escala))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * escala))
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))),
        'image/jpeg',
        qualidade,
      )
    }
    img.src = url
  })
}

export function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    leitor.readAsDataURL(blob)
  })
}

/** Carrega uma imagem (URL ou data URL) já reduzida, em data URL JPEG, para o PDF. */
export async function imagemParaPdf(url: string, maxLado = 900): Promise<{ dados: string; largura: number; altura: number }> {
  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error('Foto não encontrada.')
  const reduzida = await comprimirImagem(await resposta.blob(), maxLado, 0.78)
  const dados = await blobParaDataUrl(reduzida)
  const dimensoes = await new Promise<{ largura: number; altura: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ largura: img.naturalWidth, altura: img.naturalHeight })
    img.onerror = () => reject(new Error('Foto inválida.'))
    img.src = dados
  })
  return { dados, ...dimensoes }
}
