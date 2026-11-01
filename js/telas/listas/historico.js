// Histórico de listas de uma pessoa (colaborador ou eletricista), mostrado na ficha.
import { bloco } from '../../ui/componentes.js'
import { el, trocar } from '../../ui/dom.js'

export function historicoDaPessoa(caixa) {
  trocar(
    caixa,
    bloco(
      { titulo: 'Histórico de listas', icone: 'history' },
      el('p', { class: 'texto-suave' }, 'As listas de presença chegam na etapa de Listas. Aqui vai aparecer em quais treinamentos e eventos a pessoa esteve e se compareceu.'),
    ),
  )
  return () => {}
}
