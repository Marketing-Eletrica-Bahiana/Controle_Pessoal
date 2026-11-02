// Liderança de um setor, usada nos cartões da aba Colaboradores, no setor aberto e no Dashboard.
// niveis: o campo "lideranca" de resumoDosSetores (em ordem hierárquica e só os níveis com alguém).
import { el, icone } from '../../ui/dom.js'

export function liderancaDoSetor(niveis) {
  if (!niveis.length) return null
  return el(
    'div',
    { class: 'cartao-setor__responsaveis' },
    niveis.map(({ valor, plural, icone: nomeDoIcone, pessoas }) =>
      el(
        'p',
        { class: 'responsaveis' },
        el('span', { class: 'responsaveis__rotulo' }, icone(nomeDoIcone), pessoas.length > 1 ? plural : valor),
        el('strong', {}, pessoas.map((c) => c.nome).join(', ')),
      ),
    ),
  )
}
