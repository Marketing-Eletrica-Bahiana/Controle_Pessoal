// Componentes do sistema de design #EnergiaBahiana: botões, janelas, avisos, campos, tabelas e cartões.
import { mensagemDeErro } from '../lib/erros.js'
import { compararTexto } from '../lib/texto.js'
import { achatar, atrasar, el, icone, trocar } from './dom.js'
import { mascote } from './marca.js'

let contadorDeIds = 0
export const novoIdDeElemento = (prefixo = 'campo') => `${prefixo}-${++contadorDeIds}`

// Botões

export function botao({ texto, icone: nomeIcone, variante = 'secundario', aoClicar, tipo = 'button', classe, ...resto }) {
  return el(
    'button',
    { type: tipo, class: ['botao', `botao--${variante}`, classe], onClick: aoClicar, ...resto },
    nomeIcone && icone(nomeIcone),
    texto && el('span', {}, texto),
  )
}

export function botaoIcone({ icone: nomeIcone, rotulo, aoClicar, perigo = false, classe, ...resto }) {
  return el(
    'button',
    { type: 'button', class: ['botao-icone', perigo && 'botao-icone--perigo', classe], 'aria-label': rotulo, title: rotulo, onClick: aoClicar, ...resto },
    icone(nomeIcone),
  )
}

export function link({ texto, icone: nomeIcone, href, variante = 'secundario', classe, ...resto }) {
  return el('a', { href, class: ['botao', `botao--${variante}`, classe], ...resto }, nomeIcone && icone(nomeIcone), el('span', {}, texto))
}

// Enquanto a tarefa roda, o botão fica desativado e mostra o ícone girando.
export async function comOcupado(botaoAlvo, tarefa) {
  const svg = botaoAlvo.querySelector('svg')
  const girando = icone('loader-circle', 'girando')
  if (svg) svg.replaceWith(girando)
  else botaoAlvo.prepend(girando)
  botaoAlvo.disabled = true
  try {
    return await tarefa()
  } finally {
    botaoAlvo.disabled = false
    if (svg) girando.replaceWith(svg)
    else girando.remove()
  }
}

// Etiquetas e avisos

export const etiqueta = (texto, variante = '') => el('span', { class: ['etiqueta', variante && `etiqueta--${variante}`] }, texto)

export function aviso(texto, { erro = false, icone: nomeIcone } = {}) {
  return el(
    'p',
    { class: ['aviso', erro && 'aviso--erro'], role: erro ? 'alert' : 'status' },
    icone(nomeIcone ?? (erro ? 'circle-alert' : 'info')),
    el('span', {}, texto),
  )
}

export const blocoDeErro = (erro) => aviso(typeof erro === 'string' ? erro : mensagemDeErro(erro), { erro: true })

export const carregando = (texto = 'Carregando...') =>
  el('p', { class: 'carregando-bloco', role: 'status' }, icone('loader-circle', 'girando'), texto)

// Tela vazia: as mascotes só aparecem aqui, no login e em boas-vindas.
export function estadoVazio({ titulo, texto, qual = 'ebinha', acoes = [], semMascote = false }) {
  return el(
    'div',
    { class: 'estado-vazio' },
    !semMascote && mascote(qual, 'estado-vazio__mascote'),
    el('div', { class: 'estado-vazio__texto' }, el('h2', {}, titulo), texto && el('p', {}, texto), acoes.length > 0 && el('div', { class: 'acoes acoes--esquerda' }, acoes)),
  )
}

// Avisos flutuantes (somem sozinhos)

let caixaDeAvisos
export function avisar(texto, { erro = false } = {}) {
  if (!caixaDeAvisos) {
    caixaDeAvisos = el('div', { class: 'avisos-flutuantes', 'aria-live': 'polite' })
    document.body.append(caixaDeAvisos)
  }
  const item = el(
    'div',
    { class: ['aviso-flutuante', erro && 'aviso-flutuante--erro'], role: erro ? 'alert' : 'status' },
    icone(erro ? 'circle-alert' : 'circle-check'),
    el('span', {}, typeof texto === 'string' ? texto : mensagemDeErro(texto)),
  )
  caixaDeAvisos.append(item)
  setTimeout(() => item.remove(), erro ? 7000 : 3500)
}

export const avisarErro = (erro) => avisar(typeof erro === 'string' ? erro : mensagemDeErro(erro), { erro: true })

// Janelas (dialog nativo: prende o foco e fecha com Esc)

export function abrirJanela({ titulo, largura = 560, aoFechar, classe }) {
  const idTitulo = novoIdDeElemento('janela')
  const corpo = el('div', { class: 'janela-modal__corpo' })
  const dialogo = el(
    'dialog',
    { class: ['janela-modal', classe], style: { maxWidth: `${largura}px` }, 'aria-labelledby': idTitulo },
    el(
      'header',
      { class: 'janela-modal__cabecalho' },
      el('h2', { id: idTitulo }, titulo),
      botaoIcone({ icone: 'x', rotulo: 'Fechar', aoClicar: () => fechar() }),
    ),
    corpo,
  )
  let fechada = false
  function fechar() {
    if (fechada) return
    fechada = true
    dialogo.close()
    dialogo.remove()
    aoFechar?.()
  }
  dialogo.addEventListener('cancel', (evento) => {
    evento.preventDefault()
    fechar()
  })
  document.body.append(dialogo)
  dialogo.showModal()
  // Campo marcado com data-foco recebe o foco ao abrir (senão o navegador foca o botão Fechar).
  const focar = () => corpo.querySelector('[data-foco]')?.focus()
  queueMicrotask(focar)
  return { corpo, fechar, dialogo, focar }
}

export function confirmar({ titulo, texto, botaoSim = 'Confirmar', perigo = false, detalhe }) {
  return new Promise((resolver) => {
    let resposta = false
    const janela = abrirJanela({ titulo, largura: 480, aoFechar: () => resolver(resposta) })
    const sim = botao({
      texto: botaoSim,
      variante: perigo ? 'perigo' : 'principal',
      aoClicar: () => {
        resposta = true
        janela.fechar()
      },
      'data-foco': true,
    })
    janela.corpo.append(
      el('div', { class: 'formulario' }, el('p', {}, texto), detalhe, el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), sim)),
    )
    janela.focar()
  })
}

// Campos de formulário

// Campo com rótulo, ajuda e aviso vermelho. Mexer no campo apaga o aviso dele.
export function campo({ rotulo, entrada, ajuda, classe, opcional = false }) {
  if (!entrada.id) entrada.id = novoIdDeElemento()
  const erro = el('p', { class: 'campo__erro', id: `${entrada.id}-erro`, hidden: true })
  const no = el(
    'div',
    { class: ['campo', classe] },
    el('label', { class: 'campo__rotulo', htmlFor: entrada.id }, rotulo, opcional && el('span', { class: 'campo__opcional' }, ' (opcional)')),
    entrada,
    ajuda && el('p', { class: 'campo__ajuda' }, ajuda),
    erro,
  )
  function mostrarErro(mensagem) {
    if (!mensagem) {
      erro.hidden = true
      entrada.removeAttribute('aria-invalid')
      return
    }
    trocar(erro, icone('circle-alert'), mensagem)
    erro.hidden = false
    entrada.setAttribute('aria-invalid', 'true')
    entrada.setAttribute('aria-describedby', erro.id)
  }
  entrada.addEventListener('input', () => mostrarErro(''))
  entrada.addEventListener('change', () => mostrarErro(''))
  return { no, entrada, mostrarErro }
}

export const entradaTexto = (props = {}) => el('input', { type: 'text', autocomplete: 'off', ...props })

// opcoes: lista de textos ou de { valor, rotulo }.
export function selecao(opcoes, valorAtual, props = {}) {
  const select = el('select', props)
  for (const opcao of opcoes) {
    const { valor, rotulo } = typeof opcao === 'string' ? { valor: opcao, rotulo: opcao } : opcao
    select.append(el('option', { value: valor, selected: String(valor) === String(valorAtual ?? '') }, rotulo))
  }
  return select
}

export function caixaDeMarcar({ rotulo, marcada = false, aoMudar, ...props }) {
  const entrada = el('input', { type: 'checkbox', checked: marcada, onChange: (e) => aoMudar?.(e.target.checked), ...props })
  return { no: el('label', { class: 'opcao' }, entrada, el('span', {}, rotulo)), entrada }
}

// Campo com máscara (data, aniversário, telefone): aplica a máscara a cada tecla.
export function entradaComMascara(mascara, props = {}) {
  const entrada = entradaTexto({ inputmode: 'numeric', ...props })
  entrada.addEventListener('input', () => {
    const fim = entrada.selectionStart === entrada.value.length
    entrada.value = mascara(entrada.value)
    if (fim) entrada.setSelectionRange(entrada.value.length, entrada.value.length)
  })
  return entrada
}

// Mostra os erros devolvidos pela validação ({ campo: mensagem }) e foca o primeiro.
export function mostrarErros(campos, erros) {
  let primeiro = null
  for (const [nome, c] of Object.entries(campos)) {
    c.mostrarErro(erros[nome] ?? '')
    if (erros[nome] && !primeiro) primeiro = c.entrada
  }
  primeiro?.focus()
  return !primeiro
}

export function campoBusca({ rotulo = 'Buscar', placeholder = 'Buscar pelo nome', valor = '', aoDigitar, grande = false, classe }) {
  const entrada = el('input', { type: 'search', placeholder, value: valor, autocomplete: 'off', enterkeyhint: 'search', 'aria-label': rotulo })
  entrada.addEventListener('input', atrasar(() => aoDigitar(entrada.value), 120))
  return {
    no: el('div', { class: ['campo', 'campo--busca', grande && 'campo--busca-grande', classe] }, icone('search'), entrada),
    entrada,
  }
}

export function filtroSelecao({ rotulo, opcoes, valor, aoMudar, classe }) {
  const select = selecao(opcoes, valor, { onChange: (e) => aoMudar(e.target.value) })
  return campo({ rotulo, entrada: select, classe: ['campo--compacto', classe] }).no
}

// Estrutura das páginas

export function cabecalhoPagina({ titulo, icone: nomeIcone, descricao, acoes = [], voltar }) {
  return el(
    'header',
    { class: 'pagina__cabecalho' },
    voltar && el('a', { class: 'voltar', href: voltar.href }, icone('arrow-left'), voltar.texto),
    el(
      'div',
      { class: 'pagina__titulo-linha' },
      el('h1', { class: 'titulo-pagina' }, nomeIcone && icone(nomeIcone), el('span', {}, titulo)),
      acoes.filter(Boolean).length > 0 && el('div', { class: 'pagina__acoes' }, acoes),
    ),
    descricao && el('p', { class: 'texto-suave' }, descricao),
  )
}

export function bloco({ titulo, icone: nomeIcone, acoes = [], classe, descricao }, ...conteudo) {
  return el(
    'section',
    { class: ['bloco', classe] },
    titulo &&
      el(
        'div',
        { class: 'bloco__cabecalho' },
        el('div', {}, el('h2', { class: 'bloco__titulo' }, nomeIcone && icone(nomeIcone), titulo), descricao && el('p', { class: 'texto-suave texto-pequeno' }, descricao)),
        acoes.filter(Boolean).length > 0 && el('div', { class: 'acoes acoes--direita' }, acoes),
      ),
    ...conteudo,
  )
}

// itens: [{ rotulo, href, icone, ativo }]
export const abas = (itens) =>
  el(
    'nav',
    { class: 'abas', 'aria-label': 'Partes desta tela' },
    itens.map(({ rotulo, href, icone: nomeIcone, ativo }) =>
      el('a', { class: ['abas__item', ativo && 'ativo'], href, 'aria-current': ativo ? 'page' : null }, nomeIcone && icone(nomeIcone), rotulo),
    ),
  )

// Cartões de indicadores: gradiente principal, números grandes.
export const indicadores = (itens, { classe } = {}) =>
  el(
    'div',
    { class: ['indicadores', classe] },
    itens.map(({ rotulo, valor, detalhe, href }) =>
      el(
        href ? 'a' : 'div',
        { class: 'indicador', href },
        el('span', { class: 'indicador__rotulo' }, rotulo),
        el('strong', { class: 'indicador__valor' }, valor),
        detalhe && el('span', { class: 'indicador__detalhe' }, detalhe),
      ),
    ),
  )

// Ordem escolhida em cada tabela, guardada enquanto a pessoa navega. A chave é a tela mais as colunas.
const ordensDasTabelas = new Map()

const textoDe = (conteudo) => achatar([conteudo]).map((no) => no.textContent).join(' ').replace(/\s+/g, ' ').trim()
// "25/12/2026 14:30" vira "2026-12-25 14:30", para as datas ficarem em ordem.
const valorDeOrdem = (texto) => texto.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')
const vazio = (v) => v === '' || v === null || v === undefined

// Tabela que vira lista de cartões no celular, com setinhas no título das colunas para mudar a ordem
// (no celular, um campo "Ordenar por"). A lista inteira é ordenada antes de mostrar os primeiros.
// colunas: [{ rotulo, celula: (item) => conteúdo, classe, principal, ordem?: (item) => valor, ordenavel?: false }]
// Sem "ordem", vale o texto da célula. limite: mostra só os primeiros, com botão para ver mais.
export function tabela({ colunas, itens, classe, chave = (item) => item.id, classeDaLinha, limite }) {
  const ordenaveis = colunas.filter((c) => c.rotulo && c.ordenavel !== false && !String(c.classe ?? '').includes('tabela__acoes'))
  const idDaOrdem = `${window.location.hash.split('/').slice(0, 2).join('/')}|${colunas.map((c) => c.rotulo).join('|')}`
  const caixa = el('div', { class: 'tabela-ordenavel' })

  function ordemAtual() {
    const ordem = ordensDasTabelas.get(idDaOrdem)
    const coluna = ordem && ordenaveis.find((c) => c.rotulo === ordem.rotulo)
    return coluna ? { coluna, sentido: ordem.sentido } : null
  }

  function ordenar(lista) {
    const ordem = ordemAtual()
    if (!ordem) return lista
    const { coluna, sentido } = ordem
    const valor = (item) => (coluna.ordem ? coluna.ordem(item) : valorDeOrdem(textoDe(coluna.celula(item))))
    return lista
      .map((item) => [valor(item), item])
      .sort(([a], [b]) => {
        // Vazios sempre no fim, nos dois sentidos.
        if (vazio(a) || vazio(b)) return Number(vazio(a)) - Number(vazio(b))
        return sentido * (typeof a === 'number' && typeof b === 'number' ? a - b : compararTexto(a, b))
      })
      .map(([, item]) => item)
  }

  function mudarOrdem(rotulo, sentido) {
    const atual = ordensDasTabelas.get(idDaOrdem)
    if (!rotulo) ordensDasTabelas.delete(idDaOrdem)
    else ordensDasTabelas.set(idDaOrdem, { rotulo, sentido: sentido ?? (atual?.rotulo === rotulo ? -atual.sentido : 1) })
    desenhar()
  }

  function titulo(c, ordem) {
    if (!ordenaveis.includes(c)) return el('th', { scope: 'col', class: c.classe }, c.rotulo)
    const ativa = ordem?.coluna === c
    return el(
      'th',
      { scope: 'col', class: c.classe, 'aria-sort': ativa ? (ordem.sentido === 1 ? 'ascending' : 'descending') : null },
      el(
        'button',
        { type: 'button', class: ['tabela__ordenar', ativa && 'ativo'], title: `Ordenar por ${c.rotulo}`, onClick: () => mudarOrdem(c.rotulo) },
        c.rotulo,
        icone(ativa ? (ordem.sentido === 1 ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down'),
      ),
    )
  }

  function ordemNoCelular(ordem) {
    const atual = ordem ? `${ordem.coluna.rotulo}|${ordem.sentido}` : ''
    const opcoes = [
      { valor: '', rotulo: 'Ordem padrão' },
      ...ordenaveis.flatMap((c) => [
        { valor: `${c.rotulo}|1`, rotulo: `${c.rotulo} (crescente)` },
        { valor: `${c.rotulo}|-1`, rotulo: `${c.rotulo} (decrescente)` },
      ]),
    ]
    const escolha = selecao(opcoes, atual, {
      'aria-label': 'Ordenar por',
      onChange: (e) => {
        const [rotulo, sentido] = e.target.value.split('|')
        mudarOrdem(rotulo || null, Number(sentido))
      },
    })
    return el('label', { class: 'tabela__ordem-celular' }, el('span', {}, 'Ordenar por'), escolha)
  }

  function desenharTabela(lista, ordem) {
    return el(
      'div',
      { class: 'tabela-caixa' },
      el(
        'table',
        { class: ['tabela', 'tabela--responsiva', classe] },
        el('thead', {}, el('tr', {}, colunas.map((c) => titulo(c, ordem)))),
        el(
          'tbody',
          {},
          lista.map((item) =>
            el(
              'tr',
              { 'data-chave': chave(item), class: classeDaLinha?.(item) },
              colunas.map((c) =>
                el('td', { class: [c.classe, c.principal && 'tabela__principal'], 'data-rotulo': c.principal ? null : c.rotulo }, c.celula(item)),
              ),
            ),
          ),
        ),
      ),
    )
  }

  function desenhar() {
    const ordem = ordemAtual()
    const lista = ordenar(itens)
    trocar(
      caixa,
      ordenaveis.length > 0 && itens.length > 1 && ordemNoCelular(ordem),
      limite ? listaComLimite(lista, (parte) => desenharTabela(parte, ordem), { passo: limite }) : desenharTabela(lista, ordem),
    )
  }

  desenhar()
  return caixa
}

// Mostra os primeiros itens de uma lista grande, com botão para ver mais.
export function listaComLimite(itens, desenhar, { passo = 200 } = {}) {
  const caixa = el('div', { class: 'lista-limitada' })
  let limite = passo
  function render() {
    const restantes = itens.length - limite
    trocar(
      caixa,
      desenhar(itens.slice(0, limite)),
      restantes > 0 &&
        el(
          'div',
          { class: 'acoes' },
          botao({
            texto: `Mostrar mais ${Math.min(passo, restantes)} de ${restantes}`,
            icone: 'chevron-down',
            aoClicar: () => {
              limite += passo
              render()
            },
          }),
        ),
    )
  }
  render()
  return caixa
}

export const ficha = (pares) =>
  el(
    'dl',
    { class: 'ficha' },
    pares
      .filter(Boolean)
      .map(([rotulo, valor]) => el('div', { class: 'ficha__item' }, el('dt', {}, rotulo), el('dd', {}, valor === '' || valor === null || valor === undefined ? 'Não informado' : valor))),
  )
