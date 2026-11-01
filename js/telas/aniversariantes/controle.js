// Tela de status do controle de aniversariantes (no lugar do check-in comum): cada pessoa fica
// Pendente, Participou ou Não participou, com observação opcional. Admin e organizador marcam.
import { marcarStatus, salvarObservacao } from '../../dados/aniversariantes.js'
import { ouvirFontes } from '../../dados/fontes.js'
import { definirStatusDaLista, excluirLista, ouvirPresencas } from '../../dados/listas.js'
import { STATUS, STATUS_ANIVERSARIO, TIPO_EMPRESA, contarStatus, ehHoje, mesDoControle } from '../../lib/aniversariantes.js'
import { formatarDataHora, formatarDiaMes, partesDeHoje } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { ehListaDeAniversario } from '../../lib/listas.js'
import { pode } from '../../lib/papeis.js'
import { combinaBusca, compararTexto, formatarNumero, limparEspacos, nomeDeArquivo, plural } from '../../lib/texto.js'
import {
  aviso, avisar, avisarErro, blocoDeErro, botao, cabecalhoPagina, campoBusca, carregando, comOcupado, confirmar, etiqueta,
  indicadores,
} from '../../ui/componentes.js'
import { el, icone, trocar } from '../../ui/dom.js'
import { baixarPlanilha } from '../../ui/planilha.js'
import { VARIANTE_DO_STATUS, periodo } from './comum.js'

const ROTULOS_DOS_FILTROS = { todos: 'Todos', pendente: 'Pendentes', participou: 'Participou', nao_participou: 'Não participou' }

export function montarControle(raiz, { pessoa, id }) {
  const admin = pode(pessoa, 'gerenciarListas')
  let dados = null
  let presencas = null
  let erro = null
  const estado = { busca: '', filtro: 'todos' }
  const linhas = new Map()

  const topo = el('div')
  const contador = el('div')
  const filtrosCaixa = el('div', { class: 'checkin__filtros', role: 'group', 'aria-label': 'Mostrar' })
  const lista = el('ul', { class: 'controle__lista' })
  const busca = campoBusca({
    placeholder: 'Buscar pelo nome',
    aoDigitar: (v) => {
      estado.busca = v
      desenharLista()
    },
  })
  const corpo = el('div', { class: 'pagina' }, contador, el('div', { class: 'filtros' }, busca.no), filtrosCaixa, lista)
  const area = el('div', { class: 'pagina' }, topo, el('div', {}, carregando()))
  raiz.replaceChildren(area)

  const controle = () => dados?.listas.find((l) => l.id === id)
  const aberta = () => controle()?.status === 'aberta'
  const podeMarcar = () => aberta() && pode(pessoa, 'fazerCheckin')

  function infoDaPessoa(p) {
    const l = controle()
    const { mes, ano } = mesDoControle(l)
    const c = dados.colaboradores.find((x) => x.id === p.pessoaId)
    const empresa = l.tipo === TIPO_EMPRESA
    const dia = empresa ? Number(c?.admissao?.slice(8, 10)) || null : c?.nascimentoDia ?? null
    const anos = empresa && c?.admissao ? ano - Number(c.admissao.slice(0, 4)) : null
    return { dia, mes, ano, anos }
  }

  function desenhar() {
    if (erro) return trocar(area, blocoDeErro(erro))
    if (!dados || !presencas) return
    const l = controle()
    if (!l || !ehListaDeAniversario(l)) {
      return trocar(area, cabecalhoPagina({ titulo: 'Controle não encontrado', icone: 'cake', voltar: { href: '#/aniversariantes', texto: 'Aniversariantes' } }))
    }
    if (!area.contains(corpo)) trocar(area, topo, corpo)
    desenharTopo(l)
    const conta = contarStatus(presencas)
    trocar(
      contador,
      !aberta() && aviso('Controle encerrado: não dá para mudar os status.', { icone: 'lock', erro: true }),
      indicadores(
        [
          { rotulo: 'Pendentes', valor: formatarNumero(conta.pendente), detalhe: 'ainda faltam marcar' },
          { rotulo: 'Participou', valor: formatarNumero(conta.participou) },
          { rotulo: 'Não participou', valor: formatarNumero(conta.nao_participou) },
          { rotulo: 'No controle', valor: formatarNumero(presencas.length) },
        ],
        { classe: 'indicadores--compactos' },
      ),
    )
    trocar(
      filtrosCaixa,
      Object.entries(ROTULOS_DOS_FILTROS).map(([valor, rotulo]) =>
        el(
          'button',
          {
            type: 'button',
            class: ['filtro-pilula', estado.filtro === valor && 'ativo'],
            'aria-pressed': estado.filtro === valor ? 'true' : 'false',
            onClick: () => {
              estado.filtro = valor
              desenhar()
            },
          },
          `${rotulo} (${valor === 'todos' ? presencas.length : conta[valor]})`,
        ),
      ),
    )
    desenharLista()
  }

  function desenharTopo(l) {
    const baixar = botao({
      texto: 'Baixar planilha',
      icone: 'download',
      classe: 'botao--pequeno',
      aoClicar: () =>
        comOcupado(baixar, async () => {
          try {
            const empresa = l.tipo === TIPO_EMPRESA
            const cabecalho = ['Dia', 'Nome', 'Setor e loja', ...(empresa ? ['Anos de casa'] : []), 'Status', 'Observação', 'Marcado por', 'Quando']
            const linhasDaPlanilha = ordenadas().map(({ p, info }) => [
              formatarDiaMes(info.dia, info.mes),
              p.nome,
              p.detalhe ?? '',
              ...(empresa ? [info.anos ?? ''] : []),
              STATUS_ANIVERSARIO[p.status] ?? 'Pendente',
              p.observacao ?? '',
              p.status && p.status !== 'pendente' ? p.checkinPor ?? '' : '',
              p.status && p.status !== 'pendente' ? formatarDataHora(p.horaCheckin) : '',
            ])
            await baixarPlanilha(nomeDeArquivo(l.nome.replace('/', '-')), [{ nome: empresa ? 'Aniversário de empresa' : 'Aniversariantes', cabecalho, linhas: linhasDaPlanilha }])
          } catch (e) {
            avisarErro(e)
          }
        }),
    })
    const { mes, ano } = mesDoControle(l)
    trocar(
      topo,
      cabecalhoPagina({
        titulo: l.nome,
        icone: l.tipo === TIPO_EMPRESA ? 'briefcase' : 'cake',
        voltar: { href: '#/aniversariantes', texto: 'Aniversariantes' },
      }),
      el(
        'div',
        { class: 'acoes acoes--esquerda lista-acoes' },
        etiqueta(l.tipo),
        l.status === 'aberta' ? etiqueta('Aberto', 'forte') : etiqueta('Encerrado', 'marinho'),
        baixar,
        admin &&
          (l.status === 'aberta'
            ? botao({ texto: 'Encerrar', icone: 'lock', classe: 'botao--pequeno', aoClicar: () => mudarSituacao(l, 'encerrada') })
            : botao({ texto: 'Reabrir', icone: 'lock-open', classe: 'botao--pequeno', aoClicar: () => mudarSituacao(l, 'aberta') })),
        admin && botao({ texto: 'Excluir', icone: 'trash-2', variante: 'perigo-claro', classe: 'botao--pequeno', aoClicar: () => excluir(l) }),
      ),
    )
    // Ao voltar, a aba Aniversariantes abre no mês deste controle.
    periodo.mes = mes
    periodo.ano = ano
  }

  const ordenadas = () =>
    presencas
      .map((p) => ({ p, info: infoDaPessoa(p) }))
      .sort((a, b) => (a.info.dia ?? 99) - (b.info.dia ?? 99) || compararTexto(a.p.nome, b.p.nome))

  function desenharLista() {
    if (!presencas) return
    const visiveis = ordenadas().filter(({ p }) => (estado.filtro === 'todos' || (p.status ?? 'pendente') === estado.filtro) && combinaBusca(p.nome, estado.busca))
    if (!visiveis.length) {
      linhas.clear()
      return trocar(lista, el('li', { class: 'checkin__vazio' }, presencas.length ? 'Ninguém com esse filtro.' : 'Ninguém no controle.'))
    }
    // As linhas são reaproveitadas: a observação que está sendo digitada não se perde quando chega uma mudança.
    const usados = new Set()
    const nos = visiveis.map(({ p, info }) => {
      usados.add(p.id)
      let linha = linhas.get(p.id)
      if (!linha) {
        linha = criarLinha(p.id)
        linhas.set(p.id, linha)
      }
      linha.atualizar(p, info)
      return linha.no
    })
    for (const chave of [...linhas.keys()]) if (!usados.has(chave)) linhas.delete(chave)
    // Só recoloca as linhas se a ordem mudou (tirar do lugar faria o campo em edição perder o foco).
    const mesmaOrdem = nos.length === lista.children.length && nos.every((no, i) => lista.children[i] === no)
    if (!mesmaOrdem) lista.replaceChildren(...nos)
  }

  function criarLinha(presencaId) {
    let atual = null
    const nome = el('strong', { class: 'checkin__nome' })
    const detalhe = el('span', { class: 'checkin__detalhe' })
    const dia = el('span', { class: 'controle__dia' })
    const marcado = el('span', { class: 'texto-suave texto-pequeno' })
    const botoes = Object.fromEntries(
      STATUS.map((status) => [
        status,
        el(
          'button',
          {
            type: 'button',
            class: ['segmentado__opcao', `status--${status}`],
            onClick: () => {
              if (!podeMarcar() || atual?.status === status) return
              marcarStatus(id, presencaId, status, pessoa).catch((e) => avisarErro(mensagemDeErro(e)))
            },
          },
          icone(status === 'participou' ? 'circle-check' : status === 'nao_participou' ? 'circle-x' : 'circle-dashed'),
          STATUS_ANIVERSARIO[status],
        ),
      ]),
    )
    const observacao = el('input', { type: 'text', maxlength: 300, placeholder: 'Observação (opcional)', 'aria-label': 'Observação' })
    const salvo = el('span', { class: 'controle__salvo', 'aria-live': 'polite' })
    // Enquanto a pessoa digita, mudanças que chegam do banco não apagam o texto.
    let editando = false
    observacao.addEventListener('input', () => (editando = true))
    const salvar = () => {
      editando = false
      const texto = limparEspacos(observacao.value).slice(0, 300)
      if (!atual || texto === (atual.observacao ?? '') || !podeMarcar()) return
      salvarObservacao(id, presencaId, texto)
        .then(() => {
          salvo.textContent = 'Salvo'
          setTimeout(() => (salvo.textContent = ''), 2000)
        })
        .catch((e) => avisarErro(mensagemDeErro(e)))
      atual = { ...atual, observacao: texto }
    }
    observacao.addEventListener('change', salvar)
    observacao.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        observacao.blur()
      }
    })
    const no = el(
      'li',
      { class: 'controle__pessoa' },
      el('div', { class: 'controle__topo' }, dia, el('div', { class: 'checkin__info' }, nome, detalhe)),
      el('div', { class: 'segmentado controle__status', role: 'group', 'aria-label': 'Status' }, Object.values(botoes)),
      el('div', { class: 'campo controle__observacao' }, observacao, salvo),
      marcado,
    )
    return {
      no,
      atualizar(p, info) {
        atual = p
        const status = STATUS.includes(p.status) ? p.status : 'pendente'
        const hoje = partesDeHoje()
        trocar(nome, p.nome, ehHoje(info.dia, info.mes, hoje) && info.ano === hoje.ano && etiqueta('Hoje!', 'vermelha'))
        trocar(detalhe, p.detalhe ?? '', info.anos !== null && ` · ${plural(info.anos, 'ano', 'anos')} de casa`)
        dia.textContent = info.dia ? formatarDiaMes(info.dia, info.mes) : '--/--'
        no.className = `controle__pessoa controle__pessoa--${status}`
        for (const [s, b] of Object.entries(botoes)) {
          b.classList.toggle('ativo', s === status)
          b.setAttribute('aria-pressed', s === status ? 'true' : 'false')
          b.disabled = !podeMarcar()
        }
        observacao.disabled = !podeMarcar()
        if (!editando && document.activeElement !== observacao) observacao.value = p.observacao ?? ''
        marcado.textContent = status !== 'pendente' && p.checkinPor ? `Marcado por ${p.checkinPor}${p.horaCheckin ? ` em ${formatarDataHora(p.horaCheckin)}` : ''}` : ''
      },
    }
  }

  async function mudarSituacao(l, status) {
    if (status === 'encerrada') {
      const ok = await confirmar({ titulo: 'Encerrar controle', texto: 'Depois de encerrado, os status não mudam mais. Dá para reabrir depois.', botaoSim: 'Encerrar' })
      if (!ok) return
    }
    try {
      await definirStatusDaLista(l.id, status)
      avisar(status === 'encerrada' ? 'Controle encerrado.' : 'Controle reaberto.')
    } catch (e) {
      avisarErro(mensagemDeErro(e))
    }
  }

  async function excluir(l) {
    const ok = await confirmar({
      titulo: 'Excluir controle',
      texto: `Apagar "${l.nome}" e os status de ${plural(presencas.length, 'pessoa', 'pessoas')}? Não dá para desfazer, e o histórico perde esse mês.`,
      botaoSim: 'Excluir de vez',
      perigo: true,
    })
    if (!ok) return
    try {
      await excluirLista(l.id, presencas)
      avisar('Controle excluído.')
      window.location.hash = '#/aniversariantes'
    } catch (e) {
      avisarErro(mensagemDeErro(e))
    }
  }

  const pararFontes = ouvirFontes(['colaboradores', 'listas'], (novos, e) => {
    if (e) erro = e
    if (novos) dados = novos
    desenhar()
  })
  const pararPresencas = ouvirPresencas(
    id,
    (lista_) => {
      presencas = lista_
      desenhar()
    },
    (e) => {
      erro = e
      desenhar()
    },
  )
  return () => {
    pararFontes()
    pararPresencas()
  }
}
