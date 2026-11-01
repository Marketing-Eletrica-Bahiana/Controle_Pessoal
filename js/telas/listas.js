// Aba Listas: listas de presença com check-in. Endereços:
// #/listas, #/listas/{id} (abre no check-in se estiver aberta, ou no resumo),
// #/listas/{id}/checkin, #/listas/{id}/convocados e #/listas/{id}/resumo
import { ouvirFontes } from '../dados/fontes.js'
import { definirStatusDaLista, excluirLista, ouvirPresencas } from '../dados/listas.js'
import { formatarData } from '../lib/datas.js'
import { mensagemDeErro } from '../lib/erros.js'
import {
  CABECALHO_COMPLETA, CABECALHO_PRESENTES, TODOS_OS_TIPOS, anosDasListas, ehListaDeAniversario, filtrarListas, linhasCompleta,
  linhasPresentes, nomeDoArquivoDaLista, ondeE, quandoE,
} from '../lib/listas.js'
import { pode } from '../lib/papeis.js'
import { endereco } from '../lib/rotas.js'
import { nomeDeArquivo, plural } from '../lib/texto.js'
import {
  abas, aviso, avisar, avisarErro, blocoDeErro, botao, cabecalhoPagina, campoBusca, carregando, comOcupado, confirmar, estadoVazio,
  etiqueta, filtroSelecao, link,
} from '../ui/componentes.js'
import { el, icone, trocar } from '../ui/dom.js'
import { baixarPlanilha } from '../ui/planilha.js'
import { montarCheckin } from './listas/checkin.js'
import { montarConvocados } from './listas/convocados.js'
import { abrirFormularioLista } from './listas/formulario.js'
import { montarResumo } from './listas/resumo.js'

const filtros = { busca: '', tipo: '', situacao: '', ano: '' }

export const etiquetaDeSituacao = (lista) => (lista.status === 'aberta' ? etiqueta('Aberta', 'forte') : etiqueta('Encerrada', 'marinho'))

export function montar(raiz, contexto) {
  const [id] = contexto.params
  return id ? montarDetalhe(raiz, contexto) : montarVisaoGeral(raiz, contexto)
}

// Visão geral

function montarVisaoGeral(raiz, { pessoa }) {
  const admin = pode(pessoa, 'gerenciarListas')
  let dados = null
  let erro = null
  const filtrosCaixa = el('div', { class: 'filtros' })
  const resultado = el('div', { class: 'pagina__resultado' })
  const busca = campoBusca({
    placeholder: 'Buscar pelo nome ou local',
    valor: filtros.busca,
    aoDigitar: (v) => {
      filtros.busca = v
      desenharResultado()
    },
  })
  const nova = () => abrirFormularioLista({ fornecedores: dados?.fornecedores ?? [], pessoa, aoSalvar: (novoId) => (window.location.hash = endereco('listas', novoId, 'convocados')) })

  raiz.replaceChildren(
    el(
      'div',
      { class: 'pagina' },
      cabecalhoPagina({
        titulo: 'Listas',
        icone: 'clipboard-list',
        descricao: 'Listas de presença de treinamentos, eventos e ações internas, com check-in pelo celular.',
        acoes: [admin && botao({ texto: 'Nova lista', icone: 'list-plus', variante: 'principal', aoClicar: nova })],
      }),
      filtrosCaixa,
      resultado,
    ),
  )

  function desenhar() {
    if (erro) return trocar(resultado, blocoDeErro(erro))
    if (!dados) return trocar(resultado, carregando())
    const mudar = (chave) => (valor) => {
      filtros[chave] = valor
      desenharResultado()
    }
    trocar(
      filtrosCaixa,
      busca.no,
      filtroSelecao({ rotulo: 'Tipo', opcoes: [{ valor: '', rotulo: 'Todos os tipos' }, ...TODOS_OS_TIPOS], valor: filtros.tipo, aoMudar: mudar('tipo') }),
      filtroSelecao({
        rotulo: 'Situação',
        opcoes: [
          { valor: '', rotulo: 'Todas' },
          { valor: 'aberta', rotulo: 'Abertas' },
          { valor: 'encerrada', rotulo: 'Encerradas' },
        ],
        valor: filtros.situacao,
        aoMudar: mudar('situacao'),
      }),
      filtroSelecao({ rotulo: 'Ano', opcoes: [{ valor: '', rotulo: 'Todos os anos' }, ...anosDasListas(dados.listas)], valor: filtros.ano, aoMudar: mudar('ano') }),
    )
    desenharResultado()
  }

  function desenharResultado() {
    if (!dados) return
    if (!dados.listas.length) {
      return trocar(
        resultado,
        estadoVazio({
          titulo: 'Nenhuma lista ainda',
          texto: admin ? 'Crie a primeira lista de presença e monte os convocados.' : 'Assim que a administração criar uma lista, ela aparece aqui para o check-in.',
          acoes: admin ? [botao({ texto: 'Nova lista', icone: 'list-plus', variante: 'principal', aoClicar: nova })] : [],
        }),
      )
    }
    const lista = filtrarListas(dados.listas, filtros)
    const marcas = new Map(dados.fornecedores.map((f) => [f.id, f.nome]))
    trocar(
      resultado,
      el('p', { class: 'texto-suave' }, plural(lista.length, 'lista', 'listas')),
      lista.length ? el('div', { class: 'grade-cartoes' }, lista.map((l) => cartaoDaLista(l, marcas))) : aviso('Nenhuma lista com esses filtros.'),
    )
  }

  const parar = ouvirFontes(['listas', 'fornecedores'], (novos, e) => {
    erro = e
    if (novos) dados = novos
    desenhar()
  })
  desenhar()
  return parar
}

export function cartaoDaLista(l, marcas = new Map()) {
  const aniversario = ehListaDeAniversario(l)
  const nomesDasMarcas = (l.fornecedores ?? []).map((id) => marcas.get(id)).filter(Boolean)
  return el(
    'article',
    { class: ['cartao', 'cartao-lista', l.status === 'encerrada' && 'cartao-lista--encerrada'] },
    el('div', { class: 'cartao-lista__etiquetas' }, etiqueta(l.tipo), etiquetaDeSituacao(l)),
    el('h2', {}, el('a', { href: endereco('listas', l.id) }, l.nome)),
    el(
      'ul',
      { class: 'contato' },
      el('li', {}, icone('calendar'), `${formatarData(l.data)}`, l.status === 'aberta' && !aniversario && el('span', { class: 'texto-suave' }, ` · ${quandoE(l.data)}`)),
      !aniversario && ondeE(l) && el('li', {}, icone('map-pin'), ondeE(l)),
      nomesDasMarcas.length > 0 && el('li', {}, icone('handshake'), nomesDasMarcas.join(', ')),
    ),
    el(
      'div',
      { class: 'acoes acoes--esquerda' },
      aniversario
        ? link({ texto: 'Abrir controle', icone: 'cake', href: endereco('listas', l.id), variante: 'principal', classe: 'botao--pequeno' })
        : l.status === 'aberta'
          ? link({ texto: 'Fazer check-in', icone: 'clipboard-check', href: endereco('listas', l.id, 'checkin'), variante: 'principal', classe: 'botao--pequeno' })
          : link({ texto: 'Ver resumo', icone: 'chart-column', href: endereco('listas', l.id, 'resumo'), classe: 'botao--pequeno' }),
      !aniversario && link({ texto: 'Convocados', icone: 'users', href: endereco('listas', l.id, 'convocados'), classe: 'botao--pequeno' }),
    ),
  )
}

// Uma lista

function montarDetalhe(raiz, { pessoa, params }) {
  const [id, parteDoEndereco] = params
  const admin = pode(pessoa, 'gerenciarListas')
  let dados = null
  let presencas = null
  let pendente = false
  let erro = null
  let modulo = null
  let parteMontada = null

  const topo = el('div')
  const corpo = el('div')
  raiz.replaceChildren(el('div', { class: 'pagina' }, topo, corpo))

  const lista = () => dados.listas.find((l) => l.id === id)
  const ctx = {
    pessoa,
    lista,
    presencas: () => presencas ?? [],
    pendente: () => pendente,
    dados: () => dados,
  }

  function parteAtual() {
    if (['checkin', 'convocados', 'resumo'].includes(parteDoEndereco)) return parteDoEndereco
    return lista()?.status === 'encerrada' ? 'resumo' : 'checkin'
  }

  function desenhar() {
    if (erro) return trocar(corpo, blocoDeErro(erro))
    if (!dados || !presencas) return trocar(corpo, carregando())
    const l = lista()
    if (!l) {
      trocar(topo, cabecalhoPagina({ titulo: 'Lista não encontrada', icone: 'clipboard-list', voltar: { href: '#/listas', texto: 'Listas' } }))
      return trocar(corpo, aviso('Essa lista não existe mais. Ela pode ter sido apagada.', { erro: true }))
    }
    if (ehListaDeAniversario(l)) {
      trocar(topo, cabecalhoPagina({ titulo: l.nome, icone: 'cake', voltar: { href: '#/listas', texto: 'Listas' } }))
      return trocar(corpo, aviso('Este controle de aniversariantes se abre na aba Aniversariantes.'))
    }
    desenharTopo(l)
    const parte = parteAtual()
    if (parteMontada !== parte) {
      parteMontada = parte
      const caixa = el('div')
      trocar(corpo, caixa)
      modulo = parte === 'checkin' ? montarCheckin(caixa, ctx) : parte === 'convocados' ? montarConvocados(caixa, ctx) : montarResumo(caixa, ctx)
    } else modulo?.atualizar()
  }

  function desenharTopo(l) {
    const parte = parteAtual()
    const marcas = (l.fornecedores ?? []).map((f) => dados.fornecedores.find((x) => x.id === f)?.nome).filter(Boolean)
    trocar(
      topo,
      cabecalhoPagina({ titulo: l.nome, icone: 'clipboard-list', voltar: { href: '#/listas', texto: 'Listas' } }),
      el(
        'div',
        { class: 'lista-meta' },
        etiqueta(l.tipo),
        etiquetaDeSituacao(l),
        el('span', {}, icone('calendar'), formatarData(l.data)),
        ondeE(l) && el('span', {}, icone('map-pin'), ondeE(l)),
        marcas.length > 0 && el('span', {}, icone('handshake'), marcas.join(', ')),
      ),
      el(
        'div',
        { class: 'acoes acoes--esquerda lista-acoes' },
        botaoBaixar('Baixar presentes', 'presentes', () => [{ nome: 'Presentes', cabecalho: CABECALHO_PRESENTES, linhas: linhasPresentes(ctx.presencas()) }]),
        botaoBaixar('Baixar lista completa', 'completa', () => [{ nome: 'Lista completa', cabecalho: CABECALHO_COMPLETA, linhas: linhasCompleta(ctx.presencas()) }]),
        admin && botao({ texto: 'Editar', icone: 'pencil', classe: 'botao--pequeno', aoClicar: () => abrirFormularioLista({ lista: l, fornecedores: dados.fornecedores, pessoa }) }),
        admin &&
          (l.status === 'aberta'
            ? botao({ texto: 'Encerrar', icone: 'lock', classe: 'botao--pequeno', aoClicar: () => encerrar(l) })
            : botao({ texto: 'Reabrir', icone: 'lock-open', classe: 'botao--pequeno', aoClicar: () => reabrir(l) })),
        admin && botao({ texto: 'Excluir', icone: 'trash-2', variante: 'perigo-claro', classe: 'botao--pequeno', aoClicar: () => excluir(l) }),
      ),
      abas([
        { rotulo: 'Check-in', icone: 'clipboard-check', href: endereco('listas', id, 'checkin'), ativo: parte === 'checkin' },
        { rotulo: 'Convocados', icone: 'users', href: endereco('listas', id, 'convocados'), ativo: parte === 'convocados' },
        { rotulo: 'Resumo', icone: 'chart-column', href: endereco('listas', id, 'resumo'), ativo: parte === 'resumo' },
      ]),
    )
  }

  function botaoBaixar(texto, complemento, abasDaPlanilha) {
    if (!pode(pessoa, 'baixarListas')) return null
    const b = botao({
      texto,
      icone: 'download',
      classe: 'botao--pequeno',
      aoClicar: () =>
        comOcupado(b, async () => {
          try {
            await baixarPlanilha(nomeDeArquivo(nomeDoArquivoDaLista(lista(), complemento)), abasDaPlanilha())
          } catch (e) {
            avisarErro(e)
          }
        }),
    })
    return b
  }

  async function encerrar(l) {
    const ok = await confirmar({
      titulo: 'Encerrar lista',
      texto: 'Depois de encerrada, a lista não aceita mais check-in. Dá para reabrir depois.',
      botaoSim: 'Encerrar',
    })
    if (!ok) return
    try {
      await definirStatusDaLista(l.id, 'encerrada')
      avisar('Lista encerrada.')
    } catch (e) {
      avisarErro(mensagemDeErro(e))
    }
  }

  async function reabrir(l) {
    try {
      await definirStatusDaLista(l.id, 'aberta')
      avisar('Lista reaberta: o check-in voltou a funcionar.')
    } catch (e) {
      avisarErro(mensagemDeErro(e))
    }
  }

  async function excluir(l) {
    const total = ctx.presencas().length
    const ok = await confirmar({
      titulo: 'Excluir lista',
      texto: `Apagar "${l.nome}" e ${plural(total, 'presença registrada', 'presenças registradas')}? Não dá para desfazer, e o histórico das pessoas perde essa lista.`,
      botaoSim: 'Excluir de vez',
      perigo: true,
    })
    if (!ok) return
    try {
      await excluirLista(l.id, ctx.presencas())
      avisar('Lista excluída.')
      window.location.hash = '#/listas'
    } catch (e) {
      avisarErro(mensagemDeErro(e))
    }
  }

  const pararFontes = ouvirFontes(['listas', 'colaboradores', 'setores', 'eletricistas', 'fornecedores'], (novos, e) => {
    if (e) erro = e
    if (novos) dados = novos
    desenhar()
  })
  const pararPresencas = ouvirPresencas(
    id,
    (lista_, info) => {
      presencas = lista_
      pendente = Boolean(info?.pendente)
      desenhar()
    },
    (e) => {
      erro = e
      desenhar()
    },
  )
  desenhar()
  return () => {
    pararFontes()
    pararPresencas()
  }
}

