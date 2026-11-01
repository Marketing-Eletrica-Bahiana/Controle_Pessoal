// Aba Colaboradores: lista geral, visão por setor, setor aberto e ficha de cada pessoa.
// Endereços: #/colaboradores, #/colaboradores/setores, #/colaboradores/setores/{id}, #/colaboradores/ficha/{id}
import { LOJAS } from '../config.js'
import { definirAtivoColaborador } from '../dados/colaboradores.js'
import { ouvirFontes } from '../dados/fontes.js'
import {
  CABECALHO_DA_LISTA, SEM_SETOR, aniversarioDe, colaboradoresDoSetor, contarPorLoja, filtrarColaboradores, linhaDaLista,
  resumoDosSetores,
} from '../lib/colaboradores.js'
import { formatarData, hojeISO, partesDeHoje } from '../lib/datas.js'
import { mensagemDeErro } from '../lib/erros.js'
import { pode } from '../lib/papeis.js'
import { endereco } from '../lib/rotas.js'
import { compararTexto, formatarNumero, nomeDeArquivo, plural } from '../lib/texto.js'
import {
  abas, aviso, avisar, avisarErro, blocoDeErro, bloco, botao, botaoIcone, cabecalhoPagina, campoBusca, carregando, comOcupado,
  confirmar, estadoVazio, etiqueta, ficha, filtroSelecao, indicadores, listaComLimite, tabela,
} from '../ui/componentes.js'
import { el, icone, trocar } from '../ui/dom.js'
import { baixarPlanilha } from '../ui/planilha.js'
import { abrirFormularioColaborador, abrirImportacaoColaboradores, abrirResponsaveis } from './colaboradores/formularios.js'
import { historicoDaPessoa } from './listas/historico.js'

// Filtros ficam guardados enquanto a pessoa navega (ex.: abre uma ficha e volta).
const filtros = { busca: '', setor: '', loja: '', lideranca: '', situacao: 'ativos' }

export function montar(raiz, { pessoa, params }) {
  const [parte, id] = params
  const admin = pode(pessoa, 'editarCadastros')
  let dados = null
  let erro = null
  const atuais = () => dados ?? { colaboradores: [], setores: [] }

  const vista = parte === 'setores' && id ? 'setor' : parte === 'setores' ? 'setores' : parte === 'ficha' && id ? 'ficha' : 'lista'
  const area = el('div', { class: 'pagina' })
  raiz.replaceChildren(area)

  // Partes que não podem ser redesenhadas a cada mudança (campo de busca com o foco).
  const fixos = {}
  let pararHistorico = null

  function desenhar() {
    if (erro) return trocar(area, blocoDeErro(erro))
    if (!dados) return trocar(area, carregando())
    if (vista === 'lista') desenharLista()
    else if (vista === 'setores') desenharSetores()
    else if (vista === 'setor') desenharSetor()
    else desenharFicha()
  }

  function cabecalhoDaAba() {
    return [
      cabecalhoPagina({
        titulo: 'Colaboradores',
        icone: 'users',
        descricao: 'Quem trabalha em cada setor e loja, com gerentes e supervisores.',
        acoes: admin
          ? [
              botao({ texto: 'Importar planilha', icone: 'file-spreadsheet', aoClicar: () => abrirImportacaoColaboradores({ dados: atuais }) }),
              botao({ texto: 'Novo colaborador', icone: 'user-plus', variante: 'principal', aoClicar: () => abrirFormularioColaborador({ dados: atuais }) }),
            ]
          : [],
      }),
      abas([
        { rotulo: 'Todos', icone: 'users', href: '#/colaboradores', ativo: vista === 'lista' },
        { rotulo: 'Por setor', icone: 'building-2', href: '#/colaboradores/setores', ativo: vista !== 'lista' },
      ]),
    ]
  }

  // Lista geral

  function desenharLista() {
    if (!fixos.lista || !area.contains(fixos.lista.resultado)) {
      const resultado = el('div', { class: 'pagina__resultado' })
      const filtrosCaixa = el('div', { class: 'filtros' })
      const busca = campoBusca({
        valor: filtros.busca,
        aoDigitar: (v) => {
          filtros.busca = v
          desenharResultado()
        },
      })
      fixos.lista = { resultado, filtrosCaixa, busca }
      trocar(area, ...cabecalhoDaAba(), filtrosCaixa, resultado)
    }
    const { colaboradores, setores } = dados
    const opcoesDeSetor = [
      { valor: '', rotulo: 'Todos os setores' },
      ...[...setores].sort((a, b) => compararTexto(a.nome, b.nome)).map((s) => ({ valor: s.nome, rotulo: s.nome })),
      { valor: SEM_SETOR, rotulo: 'Sem setor' },
    ]
    const mudar = (chave) => (valor) => {
      filtros[chave] = valor
      desenharResultado()
    }
    trocar(
      fixos.lista.filtrosCaixa,
      fixos.lista.busca.no,
      filtroSelecao({ rotulo: 'Setor', opcoes: opcoesDeSetor, valor: filtros.setor, aoMudar: mudar('setor') }),
      filtroSelecao({ rotulo: 'Loja', opcoes: [{ valor: '', rotulo: 'Todas as lojas' }, ...LOJAS], valor: filtros.loja, aoMudar: mudar('loja') }),
      filtroSelecao({
        rotulo: 'Liderança',
        opcoes: [
          { valor: '', rotulo: 'Todas' },
          { valor: 'Gerente', rotulo: 'Gerentes' },
          { valor: 'Supervisor', rotulo: 'Supervisores' },
          { valor: 'sem', rotulo: 'Sem liderança' },
        ],
        valor: filtros.lideranca,
        aoMudar: mudar('lideranca'),
      }),
      filtroSelecao({
        rotulo: 'Situação',
        opcoes: [
          { valor: 'ativos', rotulo: 'Ativos' },
          { valor: 'inativos', rotulo: 'Desativados' },
          { valor: 'todos', rotulo: 'Todos' },
        ],
        valor: filtros.situacao,
        aoMudar: mudar('situacao'),
      }),
    )
    if (!colaboradores.length) {
      return trocar(
        fixos.lista.resultado,
        estadoVazio({
          titulo: 'Nenhum colaborador cadastrado ainda',
          texto: admin ? 'Comece importando a planilha de pessoal ou cadastre uma pessoa de cada vez.' : 'Assim que a administração cadastrar a equipe, ela aparece aqui.',
          acoes: admin ? [botao({ texto: 'Importar planilha', icone: 'file-spreadsheet', variante: 'principal', aoClicar: () => abrirImportacaoColaboradores({ dados: atuais }) })] : [],
        }),
      )
    }
    desenharResultado()
  }

  function desenharResultado() {
    const lista = filtrarColaboradores(dados.colaboradores, filtros)
    const nomeDoSetor = filtros.setor === SEM_SETOR ? 'Sem setor' : filtros.setor
    trocar(
      fixos.lista.resultado,
      el(
        'div',
        { class: 'pagina__barra' },
        el('p', { class: 'texto-suave' }, plural(lista.length, 'colaborador', 'colaboradores')),
        botaoBaixar(lista, ['Colaboradores', nomeDoSetor, filtros.loja].filter(Boolean).join(' ')),
      ),
      lista.length ? tabelaDePessoas(lista) : aviso('Ninguém encontrado com esses filtros.'),
    )
  }

  function botaoBaixar(lista, titulo) {
    const b = botao({
      texto: 'Baixar lista',
      icone: 'download',
      disabled: !lista.length,
      aoClicar: () =>
        comOcupado(b, async () => {
          try {
            const data = formatarData(hojeISO()).replaceAll('/', '-')
            await baixarPlanilha(nomeDeArquivo(`${titulo} ${data}`), [{ nome: 'Colaboradores', cabecalho: CABECALHO_DA_LISTA, linhas: lista.map(linhaDaLista) }])
          } catch (e) {
            avisarErro(e)
          }
        }),
    })
    return b
  }

  function tabelaDePessoas(lista, { comSetor = true } = {}) {
    return listaComLimite(lista, (itens) =>
      tabela({
        itens,
        classeDaLinha: (c) => (c.ativo === false ? 'linha--inativa' : null),
        colunas: [
          {
            rotulo: 'Nome',
            principal: true,
            celula: (c) => [
              el('a', { class: 'tabela__nome', href: endereco('colaboradores', 'ficha', c.id) }, c.nome),
              c.lideranca && etiqueta(c.lideranca, 'marinho'),
              c.ativo === false && etiqueta('Desativado', 'alerta'),
            ],
          },
          comSetor && { rotulo: 'Setor', celula: (c) => c.setor || 'Sem setor' },
          { rotulo: 'Loja', celula: (c) => c.loja || 'Sem loja' },
          { rotulo: 'Cargo', celula: (c) => c.cargo || '' },
          admin && { rotulo: 'Ações', classe: 'tabela__acoes', celula: (c) => acoesDoColaborador(c) },
        ].filter(Boolean),
      }),
    )
  }

  function acoesDoColaborador(c) {
    return el(
      'div',
      { class: 'acoes acoes--juntas' },
      botaoIcone({ icone: 'pencil', rotulo: `Editar ${c.nome}`, aoClicar: () => abrirFormularioColaborador({ colaborador: c, dados: atuais }) }),
      c.ativo === false
        ? botaoIcone({ icone: 'user-check', rotulo: `Reativar ${c.nome}`, aoClicar: () => mudarAtivo(c, true) })
        : botaoIcone({ icone: 'user-x', rotulo: `Desativar ${c.nome}`, perigo: true, aoClicar: () => mudarAtivo(c, false) }),
    )
  }

  async function mudarAtivo(c, ativo) {
    if (!ativo) {
      const ok = await confirmar({
        titulo: 'Desativar colaborador',
        texto: `${c.nome} deixa de aparecer nos setores, nas novas listas e nos aniversariantes, mas o histórico de participação fica guardado. Dá para reativar depois.`,
        botaoSim: 'Desativar',
        perigo: true,
      })
      if (!ok) return
    }
    try {
      await definirAtivoColaborador(c.id, ativo)
      avisar(ativo ? `Cadastro de ${c.nome} reativado.` : `Cadastro de ${c.nome} desativado.`)
    } catch (e) {
      avisar(mensagemDeErro(e), { erro: true })
    }
  }

  // Visão por setor

  function desenharSetores() {
    const { setores, semSetor } = resumoDosSetores(dados.setores, dados.colaboradores)
    trocar(
      area,
      ...cabecalhoDaAba(),
      setores.length || semSetor.length
        ? el(
            'div',
            { class: 'grade-cartoes' },
            setores.map((s) => cartaoDoSetor(s)),
            semSetor.length > 0 &&
              cartaoDoSetor({ setor: { id: SEM_SETOR, nome: 'Sem setor' }, gerentes: [], supervisores: [], ...contarPorLoja(semSetor) }),
          )
        : estadoVazio({ titulo: 'Nenhum setor ainda', texto: 'Os setores aparecem aqui conforme os colaboradores são cadastrados ou importados.' }),
    )
  }

  function cartaoDoSetor({ setor, gerentes, supervisores, porLoja, total }) {
    return el(
      'a',
      { class: 'cartao cartao--clicavel cartao-setor', href: endereco('colaboradores', 'setores', setor.id) },
      el('div', { class: 'cartao-setor__topo' }, el('h2', {}, setor.nome), etiqueta(plural(total, 'pessoa', 'pessoas'), 'forte')),
      responsaveis(gerentes, supervisores, setor.id !== SEM_SETOR),
      el(
        'ul',
        { class: 'cartao-setor__lojas' },
        LOJAS.map((loja) => el('li', {}, el('span', {}, loja), el('strong', { class: 'numero' }, formatarNumero(porLoja[loja])))),
      ),
    )
  }

  function responsaveis(gerentes, supervisores, mostrarVazio = true) {
    const linha = (nomeDoIcone, um, varios, lista) =>
      el(
        'p',
        { class: 'responsaveis' },
        el('span', { class: 'responsaveis__rotulo' }, icone(nomeDoIcone), lista.length > 1 ? varios : um),
        lista.length ? el('strong', {}, lista.map((c) => c.nome).join(', ')) : el('span', { class: 'texto-suave' }, 'não definido'),
      )
    if (!mostrarVazio && !gerentes.length && !supervisores.length) return null
    return el(
      'div',
      { class: 'cartao-setor__responsaveis' },
      linha('crown', 'Gerente', 'Gerentes', gerentes),
      linha('star', 'Supervisor', 'Supervisores', supervisores),
    )
  }

  function desenharSetor() {
    const semSetor = id === SEM_SETOR
    const resumo = resumoDosSetores(dados.setores, dados.colaboradores)
    const item = semSetor
      ? { setor: { id: SEM_SETOR, nome: 'Sem setor' }, gerentes: [], supervisores: [], pessoas: resumo.semSetor, ...contarPorLoja(resumo.semSetor) }
      : resumo.setores.find((s) => s.setor.id === id)
    if (!item) {
      return trocar(area, cabecalhoPagina({ titulo: 'Setor não encontrado', icone: 'building-2', voltar: { href: '#/colaboradores/setores', texto: 'Todos os setores' } }))
    }
    const pessoas = [...item.pessoas].sort((a, b) => compararTexto(a.nome, b.nome))
    trocar(
      area,
      cabecalhoPagina({
        titulo: item.setor.nome,
        icone: 'building-2',
        voltar: { href: '#/colaboradores/setores', texto: 'Todos os setores' },
        acoes: [
          admin && !semSetor && botao({ texto: 'Definir responsáveis', icone: 'crown', aoClicar: () => abrirResponsaveis({ setor: item.setor, dados: atuais }) }),
          botaoBaixar(pessoas, `Colaboradores ${item.setor.nome}`),
        ],
      }),
      indicadores([
        { rotulo: 'Pessoas no setor', valor: formatarNumero(item.total) },
        ...LOJAS.map((loja) => ({ rotulo: loja, valor: formatarNumero(item.porLoja[loja]) })),
      ]),
      !semSetor && bloco({ titulo: 'Responsáveis', icone: 'crown', classe: 'bloco--destaque' }, responsaveis(item.gerentes, item.supervisores)),
      pessoas.length ? tabelaDePessoas(pessoas, { comSetor: false }) : aviso('Nenhum colaborador ativo neste setor.'),
    )
  }

  // Ficha

  function desenharFicha() {
    const c = dados.colaboradores.find((x) => x.id === id)
    if (!c) {
      return trocar(area, cabecalhoPagina({ titulo: 'Colaborador não encontrado', icone: 'user-round', voltar: { href: '#/colaboradores', texto: 'Colaboradores' } }))
    }
    const setor = dados.setores.find((s) => s.nome === c.setor)
    const anos = c.admissao ? partesDeHoje().ano - Number(c.admissao.slice(0, 4)) - (hojeISO().slice(5) < c.admissao.slice(5) ? 1 : 0) : null
    if (!fixos.historico) fixos.historico = el('div')
    trocar(
      area,
      cabecalhoPagina({
        titulo: c.nome,
        icone: 'user-round',
        voltar: { href: '#/colaboradores', texto: 'Colaboradores' },
        acoes: admin
          ? [
              botao({ texto: 'Editar', icone: 'pencil', aoClicar: () => abrirFormularioColaborador({ colaborador: c, dados: atuais }) }),
              c.ativo === false
                ? botao({ texto: 'Reativar', icone: 'user-check', aoClicar: () => mudarAtivo(c, true) })
                : botao({ texto: 'Desativar', icone: 'user-x', variante: 'perigo-claro', aoClicar: () => mudarAtivo(c, false) }),
            ]
          : [],
      }),
      el('div', { class: 'acoes acoes--esquerda' }, c.lideranca && etiqueta(c.lideranca, 'marinho'), c.ativo === false ? etiqueta('Desativado', 'alerta') : etiqueta('Ativo', 'forte')),
      bloco(
        { titulo: 'Dados', icone: 'badge-check' },
        ficha([
          ['Setor', setor ? el('a', { href: endereco('colaboradores', 'setores', setor.id) }, c.setor) : c.setor],
          ['Loja', c.loja],
          ['Cargo', c.cargo],
          ['Liderança', c.lideranca || 'Sem liderança'],
          ['Aniversário', aniversarioDe(c)],
          ['Admissão', c.admissao ? `${formatarData(c.admissao)}${anos !== null && anos >= 1 ? ` (${plural(anos, 'ano', 'anos')} de casa)` : ''}` : ''],
        ]),
      ),
      fixos.historico,
    )
    if (!pararHistorico) pararHistorico = historicoDaPessoa(fixos.historico, { tipo: 'colaborador', id: c.id })
  }

  const parar = ouvirFontes(['colaboradores', 'setores'], (novos, e) => {
    erro = e
    if (novos) dados = { colaboradores: novos.colaboradores, setores: novos.setores }
    desenhar()
  })
  desenhar()
  return () => {
    parar()
    pararHistorico?.()
  }
}
