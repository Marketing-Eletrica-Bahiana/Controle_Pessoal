// Tela provisória das abas que ainda vão chegar nas próximas etapas.
import { ABAS } from '../lib/papeis.js'
import { el, icone } from '../ui/dom.js'
import { mascote } from '../ui/marca.js'

export function montar(raiz, { tela }) {
  const aba = ABAS.find((a) => a.id === tela)
  raiz.replaceChildren(
    el(
      'div',
      { class: 'pagina' },
      el('h1', { class: 'titulo-pagina' }, icone(aba?.icone ?? 'construction'), aba?.rotulo ?? 'Em construção'),
      el(
        'section',
        { class: 'cartao tela-provisoria' },
        mascote('ebinho', 'tela-provisoria__mascote'),
        el(
          'div',
          { class: 'tela-provisoria__texto' },
          el('h2', {}, 'Em construção'),
          el('p', {}, 'Esta aba está sendo preparada e chega nas próximas etapas. Mais forte por você!'),
        ),
      ),
    ),
  )
}
