// Histórico de listas mostrado nas fichas: de uma pessoa (colaborador ou eletricista) e de uma marca.
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

export function participacoesDoFornecedor(caixa) {
  trocar(
    caixa,
    bloco(
      { titulo: 'Participações', icone: 'calendar-days' },
      el('p', { class: 'texto-suave' }, 'Quando as listas de presença chegarem, aqui vão aparecer os treinamentos e eventos em que a marca participou, quantas vezes e quem ela enviou em cada um.'),
    ),
  )
  return () => {}
}
