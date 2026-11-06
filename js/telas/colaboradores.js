// Aba Colaboradores: lista geral, visão por setor, setor aberto, pais e mães, desligados e ficha de cada pessoa.
// Endereços: #/colaboradores, #/colaboradores/setores, #/colaboradores/setores/{id},
// #/colaboradores/pais-e-maes, #/colaboradores/desligados, #/colaboradores/ficha/{id}
import { LOJAS } from '../config.js'
import { definirAtivoColaborador, excluirColaborador } from '../dados/colaboradores.js'
import { ouvirFontes } from '../dados/fontes.js'
import {
  CABECALHO_DA_LISTA, CABECALHO_DOS_DESLIGADOS, NIVEIS_DE_LIDERANCA, PAI_OU_MAE, SEM_SETOR, aniversarioDe, contarPorLoja, filtrarColaboradores,
  filtrarDesligados, filtrarPaisEMaes, linhaDaLista, linhaDosDesligados, resumoDosSetores,
} from '../lib/colaboradores.js'
import { formatarData, hojeISO, partesDeHoje } from '../lib/datas.js'
import { mensagemDeErro } from '../lib/erros.js'
import { pode } from '../lib/papeis.js'
import { endereco } from '../lib/rotas.js'
import { compararTexto, formatarNumero, nomeDeArquivo, plural } from '../lib/texto.js'
import {
  abas, aviso, avisar, avisarErro, blocoDeErro, bloco, botao, botaoIcone, cabecalhoPagina, campoBusca, carregando, comOcupado,
  confirmar, estadoVazio, etiqueta, ficha, filtroSelecao, indicadores, tabela,
} from '../ui/componentes.js'
import { el, trocar } from '../ui/dom.js'
import { baixarPlanilha } from '../ui/planilha.js'
import { contatosDoColaborador, emailDoColaborador, telefoneDoColaborador } from './colaboradores/contatos.js'
import { abrirFormularioColaborador, abrirImportacaoColaboradores, abrirImportacaoDesligados, abrirResponsaveis } from './colaboradores/formularios.js'
import { liderancaDoSetor } from './colaboradores/lideranca.js'
import { historicoDaPessoa } from './listas/historico.js'

// Filtros ficam guardados enquanto a pessoa navega (ex.: abre uma ficha e volta).
const filtros = { busca: '', setor: '', loja: '', lideranca: '', situacao: 'ativos' }
const filtrosDePais = { busca: '', tipo: '', setor: '', loja: '' }
const filtrosDeDesligados = { busca: '' }

export function montar(raiz, { pessoa, params }) {
  const [parte, id] = params
  const admin = pode(pessoa, 'editarCadastros')
  let dados = null
  let erro = null
  const atuais = () => dados ?? { colaboradores: [], setores: [] }

  const vista =
    parte === 'setores' && id ? 'setor'
    : parte === 'setores' ? 'setores'
    : parte === 'ficha' && id ? 'ficha'
    : parte === 'pais-e-maes' ? 'pais'
    : parte === 'desligados' ? 'desligados'
    : 'lista'
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
    else if (vista === 'pais') desenharPaisEMaes()
    else if (vista === 'desligados') desenharDesligados()
    else desenharFicha()
  }

  const botaoImportarDesligados = (variante) =>
    botao({ texto: 'Importar desligados', icone: 'file-spreadsheet', variante, aoClicar: () => abrirImportacaoDesligados({ dados: atuais }) })

  function cabecalhoDaAba() {
    return [
      cabecalhoPagina({
        titulo: 'Colaboradores',
        icone: 'users',
        descricao: 'Quem trabalha em cada setor e loja, com gerentes, coordenadores e supervisores.',
        acoes: !admin
          ? []
          : vista === 'desligados'
            ? [botaoImportarDesligados('principal')]
            : [
                botao({ texto: 'Importar planilha', icone: 'file-spreadsheet', aoClicar: () => abrirImportacaoColaboradores({ dados: atuais }) }),
                botao({ texto: 'Novo colaborador', icone: 'user-plus', variante: 'principal', aoClicar: () => abrirFormularioColaborador({ dados: atuais }) }),
              ],
      }),
      abas([
        { rotulo: 'Todos', icone: 'users', href: '#/colaboradores', ativo: vista === 'lista' },
        { rotulo: 'Por setor', icone: 'building-2', href: '#/colaboradores/setores', ativo: vista === 'setores' },
        { rotulo: 'Pais e mães', icone: 'baby', href: '#/colaboradores/pais-e-maes', ativo: vista === 'pais' },
        { rotulo: 'Desligados', icone: 'user-x', href: '#/colaboradores/desligados', ativo: vista === 'desligados' },
      ]),
    ]
  }

  const opcoesDeSetor = () => [
    { valor: '', rotulo: 'Todos os setores' },
    ...[...dados.setores].sort((a, b) => compararTexto(a.nome, b.nome)).map((s) => ({ valor: s.nome, rotulo: s.nome })),
    { valor: SEM_SETOR, rotulo: 'Sem setor' },
  ]

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
    const { colaboradores } = dados
    const mudar = (chave) => (valor) => {
      filtros[chave] = valor
      desenharResultado()
    }
    trocar(
      fixos.lista.filtrosCaixa,
      fixos.lista.busca.no,
      filtroSelecao({ rotulo: 'Setor', opcoes: opcoesDeSetor(), valor: filtros.setor, aoMudar: mudar('setor') }),
      filtroSelecao({ rotulo: 'Loja', opcoes: [{ valor: '', rotulo: 'Todas as lojas' }, ...LOJAS], valor: filtros.loja, aoMudar: mudar('loja') }),
      filtroSelecao({
        rotulo: 'Liderança',
        opcoes: [
          { valor: '', rotulo: 'Todas' },
          ...NIVEIS_DE_LIDERANCA.map((n) => ({ valor: n.valor, rotulo: n.plural })),
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

  function botaoBaixar(lista, titulo, { cabecalho = CABECALHO_DA_LISTA, linha = linhaDaLista, aba = 'Colaboradores' } = {}) {
    const b = botao({
      texto: 'Baixar lista',
      icone: 'download',
      disabled: !lista.length,
      aoClicar: () =>
        comOcupado(b, async () => {
          try {
            const data = formatarData(hojeISO()).replaceAll('/', '-')
            await baixarPlanilha(nomeDeArquivo(`${titulo} ${data}`), [{ nome: aba, cabecalho, linhas: lista.map(linha) }])
          } catch (e) {
            avisarErro(e)
          }
        }),
    })
    return b
  }

  function tabelaDePessoas(lista, { comSetor = true } = {}) {
    return tabela({
      itens: lista,
      limite: 200,
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
    })
  }

  function acoesDoColaborador(c) {
    return el(
      'div',
      { class: 'acoes acoes--juntas' },
      botaoIcone({ icone: 'pencil', rotulo: `Editar ${c.nome}`, aoClicar: () => abrirFormularioColaborador({ colaborador: c, dados: atuais }) }),
      c.ativo === false
        ? [
            botaoIcone({ icone: 'user-check', rotulo: `Reativar ${c.nome}`, aoClicar: () => mudarAtivo(c, true) }),
            botaoIcone({ icone: 'trash-2', rotulo: `Excluir ${c.nome} de vez`, perigo: true, aoClicar: () => excluirDeVez(c) }),
          ]
        : botaoIcone({ icone: 'user-x', rotulo: `Desativar ${c.nome}`, perigo: true, aoClicar: () => mudarAtivo(c, false) }),
    )
  }

  // Só quem já está desativado pode ser excluído de vez: assim ninguém ativo some por um clique errado.
  async function excluirDeVez(c) {
    const ok = await confirmar({
      titulo: 'Excluir de vez',
      texto: `${c.nome} sai do cadastro para sempre, e não dá para desfazer. As listas de presença e os controles de aniversário continuam mostrando o nome, mas a ficha e o histórico da pessoa somem.`,
      botaoSim: 'Excluir de vez',
      perigo: true,
    })
    if (!ok) return
    try {
      await excluirColaborador({ id: c.id, setores: dados.setores })
      avisar(`Cadastro de ${c.nome} excluído.`)
      if (vista === 'ficha') window.location.hash = '#/colaboradores/desligados'
    } catch (e) {
      avisar(mensagemDeErro(e), { erro: true })
    }
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

  // Pais e mães: só quem está ativo e marcado no cadastro, com os contatos.

  function desenharPaisEMaes() {
    const todos = filtrarPaisEMaes(dados.colaboradores)
    if (!todos.length) {
      fixos.pais = null
      return trocar(
        area,
        ...cabecalhoDaAba(),
        estadoVazio({
          titulo: 'Nenhum pai ou mãe marcado ainda',
          texto: admin
            ? 'Edite o cadastro da pessoa e escolha Pai ou Mãe, com o telefone e o e-mail. Para todo mundo de uma vez, importe a lista oficial: as colunas "Tem Filhos" e "Gênero" dizem quem é pai ou mãe.'
            : 'Assim que a administração marcar quem é pai ou mãe, as pessoas aparecem aqui com os contatos.',
          acoes: admin ? [botao({ texto: 'Importar planilha', icone: 'file-spreadsheet', variante: 'principal', aoClicar: () => abrirImportacaoColaboradores({ dados: atuais }) })] : [],
        }),
      )
    }
    if (!fixos.pais || !area.contains(fixos.pais.resultado)) {
      const resumo = el('div')
      const filtrosCaixa = el('div', { class: 'filtros' })
      const resultado = el('div', { class: 'pagina__resultado' })
      const busca = campoBusca({
        valor: filtrosDePais.busca,
        aoDigitar: (v) => {
          filtrosDePais.busca = v
          desenharResultadoDePais()
        },
      })
      fixos.pais = { resumo, filtrosCaixa, resultado, busca }
      trocar(area, ...cabecalhoDaAba(), resumo, filtrosCaixa, resultado)
    }
    const mudar = (chave) => (valor) => {
      filtrosDePais[chave] = valor
      desenharResultadoDePais()
    }
    trocar(
      fixos.pais.resumo,
      indicadores([
        { rotulo: 'Pais e mães', valor: formatarNumero(todos.length) },
        ...PAI_OU_MAE.map((p) => ({ rotulo: p.plural, valor: formatarNumero(todos.filter((c) => c.paiOuMae === p.valor).length) })),
      ]),
    )
    trocar(
      fixos.pais.filtrosCaixa,
      fixos.pais.busca.no,
      filtroSelecao({
        rotulo: 'Pai ou mãe',
        opcoes: [{ valor: '', rotulo: 'Todos' }, ...PAI_OU_MAE.map((p) => ({ valor: p.valor, rotulo: p.plural }))],
        valor: filtrosDePais.tipo,
        aoMudar: mudar('tipo'),
      }),
      filtroSelecao({ rotulo: 'Setor', opcoes: opcoesDeSetor(), valor: filtrosDePais.setor, aoMudar: mudar('setor') }),
      filtroSelecao({ rotulo: 'Loja', opcoes: [{ valor: '', rotulo: 'Todas as lojas' }, ...LOJAS], valor: filtrosDePais.loja, aoMudar: mudar('loja') }),
    )
    desenharResultadoDePais()
  }

  function desenharResultadoDePais() {
    const lista = filtrarPaisEMaes(dados.colaboradores, filtrosDePais)
    const titulo = PAI_OU_MAE.find((p) => p.valor === filtrosDePais.tipo)?.plural ?? 'Pais e mães'
    const nomeDoSetor = filtrosDePais.setor === SEM_SETOR ? 'Sem setor' : filtrosDePais.setor
    trocar(
      fixos.pais.resultado,
      el(
        'div',
        { class: 'pagina__barra' },
        el('p', { class: 'texto-suave' }, plural(lista.length, 'pessoa', 'pessoas')),
        botaoBaixar(lista, [titulo, nomeDoSetor, filtrosDePais.loja].filter(Boolean).join(' ')),
      ),
      lista.length ? tabelaDePaisEMaes(lista) : aviso('Ninguém encontrado com esses filtros.'),
    )
  }

  function tabelaDePaisEMaes(lista) {
    return tabela({
      itens: lista,
      limite: 200,
      colunas: [
        {
          rotulo: 'Nome',
          principal: true,
          celula: (c) => [el('a', { class: 'tabela__nome', href: endereco('colaboradores', 'ficha', c.id) }, c.nome), etiqueta(c.paiOuMae, 'marinho')],
        },
        { rotulo: 'Contatos', ordenavel: false, celula: (c) => contatosDoColaborador(c) },
        { rotulo: 'Setor', celula: (c) => c.setor || 'Sem setor' },
        { rotulo: 'Loja', celula: (c) => c.loja || 'Sem loja' },
        admin && {
          rotulo: 'Ações',
          classe: 'tabela__acoes',
          celula: (c) => botaoIcone({ icone: 'pencil', rotulo: `Editar ${c.nome}`, aoClicar: () => abrirFormularioColaborador({ colaborador: c, dados: atuais }) }),
        },
      ].filter(Boolean),
    })
  }

  // Desligados: quem está desativado, com a data de desligamento (aba "Desligados" da lista oficial).

  function desenharDesligados() {
    const todos = filtrarDesligados(dados.colaboradores)
    if (!todos.length) {
      fixos.desligados = null
      return trocar(
        area,
        ...cabecalhoDaAba(),
        estadoVazio({
          titulo: 'Nenhum desligado ainda',
          texto: admin
            ? 'Importe a aba "Desligados" da lista oficial, com o nome e a data de desligamento. Quem for desativado no cadastro também aparece aqui.'
            : 'Quem sair da empresa aparece aqui, com a data de desligamento.',
          acoes: admin ? [botaoImportarDesligados('principal')] : [],
        }),
      )
    }
    if (!fixos.desligados || !area.contains(fixos.desligados.resultado)) {
      const resultado = el('div', { class: 'pagina__resultado' })
      const busca = campoBusca({
        valor: filtrosDeDesligados.busca,
        aoDigitar: (v) => {
          filtrosDeDesligados.busca = v
          desenharResultadoDosDesligados()
        },
      })
      fixos.desligados = { resultado, busca }
      trocar(area, ...cabecalhoDaAba(), el('div', { class: 'filtros' }, busca.no), resultado)
    }
    desenharResultadoDosDesligados()
  }

  function desenharResultadoDosDesligados() {
    const lista = filtrarDesligados(dados.colaboradores, filtrosDeDesligados)
    trocar(
      fixos.desligados.resultado,
      el(
        'div',
        { class: 'pagina__barra' },
        el('p', { class: 'texto-suave' }, plural(lista.length, 'pessoa desligada', 'pessoas desligadas')),
        botaoBaixar(lista, 'Desligados', { cabecalho: CABECALHO_DOS_DESLIGADOS, linha: linhaDosDesligados, aba: 'Desligados' }),
      ),
      lista.length
        ? tabela({
            itens: lista,
            limite: 200,
            classeDaLinha: () => 'linha--inativa',
            colunas: [
              { rotulo: 'Nome', principal: true, celula: (c) => el('a', { class: 'tabela__nome', href: endereco('colaboradores', 'ficha', c.id) }, c.nome) },
              { rotulo: 'Desligamento', classe: 'numero', ordem: (c) => c.desligamento ?? '', celula: (c) => (c.desligamento ? formatarData(c.desligamento) : 'Não informada') },
              { rotulo: 'Setor', celula: (c) => c.setor || '' },
              { rotulo: 'Loja', celula: (c) => c.loja || '' },
              { rotulo: 'Cargo', celula: (c) => c.cargo || '' },
              admin && { rotulo: 'Ações', classe: 'tabela__acoes', celula: (c) => acoesDoColaborador(c) },
            ].filter(Boolean),
          })
        : aviso('Ninguém encontrado com essa busca.'),
    )
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
              cartaoDoSetor({ setor: { id: SEM_SETOR, nome: 'Sem setor' }, lideranca: [], ...contarPorLoja(semSetor) }),
          )
        : estadoVazio({ titulo: 'Nenhum setor ainda', texto: 'Os setores aparecem aqui conforme os colaboradores são cadastrados ou importados.' }),
    )
  }

  function cartaoDoSetor({ setor, lideranca, porLoja, total }) {
    return el(
      'a',
      { class: 'cartao cartao--clicavel cartao-setor', href: endereco('colaboradores', 'setores', setor.id) },
      el('div', { class: 'cartao-setor__topo' }, el('h2', {}, setor.nome), etiqueta(plural(total, 'pessoa', 'pessoas'), 'forte')),
      liderancaDoSetor(lideranca),
      el(
        'ul',
        { class: 'cartao-setor__lojas' },
        LOJAS.map((loja) => el('li', {}, el('span', {}, loja), el('strong', { class: 'numero' }, formatarNumero(porLoja[loja])))),
      ),
    )
  }

  function desenharSetor() {
    const semSetor = id === SEM_SETOR
    const resumo = resumoDosSetores(dados.setores, dados.colaboradores)
    const item = semSetor
      ? { setor: { id: SEM_SETOR, nome: 'Sem setor' }, lideranca: [], pessoas: resumo.semSetor, ...contarPorLoja(resumo.semSetor) }
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
      !semSetor &&
        bloco(
          { titulo: 'Responsáveis', icone: 'crown', classe: 'bloco--destaque' },
          liderancaDoSetor(item.lideranca) ?? el('p', { class: 'texto-suave' }, 'Ninguém definido como responsável por este setor.'),
        ),
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
        voltar: c.ativo === false ? { href: '#/colaboradores/desligados', texto: 'Desligados' } : { href: '#/colaboradores', texto: 'Colaboradores' },
        acoes: admin
          ? [
              botao({ texto: 'Editar', icone: 'pencil', aoClicar: () => abrirFormularioColaborador({ colaborador: c, dados: atuais }) }),
              c.ativo === false
                ? [
                    botao({ texto: 'Reativar', icone: 'user-check', aoClicar: () => mudarAtivo(c, true) }),
                    botao({ texto: 'Excluir de vez', icone: 'trash-2', variante: 'perigo-claro', aoClicar: () => excluirDeVez(c) }),
                  ]
                : botao({ texto: 'Desativar', icone: 'user-x', variante: 'perigo-claro', aoClicar: () => mudarAtivo(c, false) }),
            ].flat()
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
          ['Telefone', telefoneDoColaborador(c)],
          ['E-mail', emailDoColaborador(c)],
          ['Pai ou mãe', c.paiOuMae || 'Não'],
          c.ativo === false && ['Desligamento', formatarData(c.desligamento)],
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
