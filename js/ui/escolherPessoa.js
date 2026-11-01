// Campo de busca com sugestões para escolher uma pessoa de uma lista (ex.: o vendedor do eletricista).
// buscar(texto) devolve os itens já ordenados; cada item tem { id, nome }.
import { campo, entradaTexto, novoIdDeElemento } from './componentes.js'
import { el, icone, trocar } from './dom.js'

export function campoEscolherPessoa({ rotulo, ajuda, opcional = true, inicial = null, buscar, detalhe = () => '', etiqueta = () => '', placeholder = 'Digite para buscar' }) {
  let escolhido = inicial?.id ? inicial : null
  let itens = []
  let ativo = -1
  const idLista = novoIdDeElemento('sugestoes')
  const entrada = entradaTexto({
    value: inicial?.nome ?? '',
    placeholder,
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': idLista,
  })
  const lista = el('ul', { class: 'sugestoes', role: 'listbox', id: idLista, hidden: true })
  const limpar = el(
    'button',
    {
      type: 'button',
      class: 'botao-icone sugestoes__limpar',
      'aria-label': 'Tirar a escolha',
      title: 'Tirar a escolha',
      onClick: () => {
        escolhido = null
        entrada.value = ''
        entrada.focus()
        abrir()
      },
    },
    icone('x'),
  )
  const c = campo({ rotulo, entrada, ajuda, opcional })
  const caixa = el('div', { class: 'sugestoes__caixa' })
  entrada.replaceWith(caixa)
  caixa.append(entrada, limpar, lista)

  function fechar() {
    lista.hidden = true
    entrada.setAttribute('aria-expanded', 'false')
    ativo = -1
  }

  function escolher(item) {
    escolhido = { id: item.id, nome: item.nome }
    entrada.value = item.nome
    c.mostrarErro('')
    fechar()
  }

  function abrir() {
    const texto = escolhido && entrada.value === escolhido.nome ? '' : entrada.value
    itens = buscar(texto).slice(0, 8)
    ativo = -1
    trocar(
      lista,
      itens.length
        ? itens.map((item, i) =>
            el(
              'li',
              {
                role: 'option',
                id: `${idLista}-${i}`,
                class: ['sugestoes__item', escolhido?.id === item.id && 'escolhido'],
                'aria-selected': escolhido?.id === item.id ? 'true' : 'false',
                onMousedown: (e) => {
                  e.preventDefault()
                  escolher(item)
                },
              },
              el('span', { class: 'sugestoes__nome' }, item.nome, etiqueta(item) && el('span', { class: 'etiqueta' }, etiqueta(item))),
              detalhe(item) && el('span', { class: 'tabela__detalhe' }, detalhe(item)),
            ),
          )
        : el('li', { class: 'sugestoes__vazio' }, 'Ninguém encontrado.'),
    )
    lista.hidden = false
    entrada.setAttribute('aria-expanded', 'true')
  }

  function marcar(indice) {
    const opcoes = lista.querySelectorAll('[role="option"]')
    if (!opcoes.length) return
    ativo = (indice + opcoes.length) % opcoes.length
    opcoes.forEach((o, i) => o.classList.toggle('ativo', i === ativo))
    entrada.setAttribute('aria-activedescendant', opcoes[ativo].id)
    opcoes[ativo].scrollIntoView({ block: 'nearest' })
  }

  entrada.addEventListener('input', () => {
    if (escolhido && entrada.value !== escolhido.nome) escolhido = null
    abrir()
  })
  entrada.addEventListener('focus', abrir)
  entrada.addEventListener('blur', () => setTimeout(fechar, 120))
  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (lista.hidden) abrir()
      marcar(ativo + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      marcar(ativo - 1)
    } else if (e.key === 'Enter' && !lista.hidden && ativo >= 0) {
      e.preventDefault()
      escolher(itens[ativo])
    } else if (e.key === 'Escape' && !lista.hidden) {
      e.preventDefault()
      e.stopPropagation()
      fechar()
    }
  })

  return {
    no: c.no,
    entrada,
    mostrarErro: c.mostrarErro,
    valor: () => escolhido,
    // Texto digitado sem escolher ninguém da lista.
    textoSolto: () => (escolhido ? '' : entrada.value.trim()),
  }
}
