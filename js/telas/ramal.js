// Aba Ramal: lugar reservado para a lista de ramais, que será preenchida no futuro.
// Endereço: #/ramal
import { cabecalhoPagina, estadoVazio } from '../ui/componentes.js'
import { el } from '../ui/dom.js'

export function montar(raiz) {
  raiz.replaceChildren(
    el(
      'div',
      { class: 'pagina' },
      cabecalhoPagina({ titulo: 'Ramal', icone: 'phone', descricao: 'Os ramais da Elétrica Bahiana, num lugar só.' }),
      estadoVazio({
        titulo: 'A lista de ramais ainda não foi preenchida',
        texto: 'Assim que a lista chegar, os ramais aparecem aqui.',
        qual: 'ebinho',
      }),
    ),
  )
}
