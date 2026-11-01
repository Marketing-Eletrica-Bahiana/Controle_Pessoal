// Endereços do app usam "#/" para não dar erro 404 ao recarregar no GitHub Pages.
// "#/colaboradores/setores/abc" vira { tela: 'colaboradores', params: ['setores', 'abc'] }.
export function lerEndereco(hash) {
  const caminho = String(hash ?? '').replace(/^#\/?/, '').split('?')[0]
  const partes = caminho.split('/').filter(Boolean).map((p) => {
    try {
      return decodeURIComponent(p)
    } catch {
      return p
    }
  })
  return { tela: partes[0] ?? '', params: partes.slice(1) }
}

export const endereco = (...partes) => `#/${partes.map((p) => encodeURIComponent(p)).join('/')}`
