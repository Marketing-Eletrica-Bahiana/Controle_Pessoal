// Dashboard: tela inicial depois do login. Sem mascotes (regra da marca).
import { LOJAS } from '../config.js'
import { comercialQueFaltou, contagensDaLista, contarEletricistasAtivos, contarPendentes } from '../dados/dashboard.js'
import { ouvirFontes } from '../dados/fontes.js'
import { TIPO_EMPRESA, TIPO_MES, aniversariantesDoMes, aniversariosDeEmpresa, idDoControle } from '../lib/aniversariantes.js'
import { resumoDosSetores } from '../lib/colaboradores.js'
import {
  anosDisponiveis, descricaoDoPeriodo, listasAbertas, listasDoPeriodo, numerosGerais, rankingDeFornecedores, resumoDosTreinamentos,
} from '../lib/dashboard.js'
import { NOMES_MESES, formatarData, formatarDiaMes, formatarMesAno, hojeISO, partesDeHoje } from '../lib/datas.js'
import { mensagemDeErro } from '../lib/erros.js'
import { ondeE, quandoE } from '../lib/listas.js'
import { pode } from '../lib/papeis.js'
import { endereco } from '../lib/rotas.js'
import { formatarNumero, plural, primeiroNome } from '../lib/texto.js'
import { aviso, blocoDeErro, bloco, cabecalhoPagina, carregando, etiqueta, filtroSelecao, indicadores, link, tabela } from '../ui/componentes.js'
import { el, icone, trocar } from '../ui/dom.js'
import { CORES, grafico } from '../ui/grafico.js'

const periodo = { ano: partesDeHoje().ano, mes: 0 }

export function montar(raiz, { pessoa }) {
  let dados = null
  let erro = null
  let eletricistasAtivos = null
  let ativo = true
  let chaveDoPeriodo = ''
  let versaoDoPeriodo = 0
  const graficos = []

  const caixas = {
    numeros: el('div', { class: 'pagina' }),
    abertas: el('div'),
    aniversarios: el('div'),
    setores: el('div'),
    filtro: el('div', { class: 'filtros' }),
    fornecedores: el('div'),
    cae: el('div'),
    comercial: el('div'),
  }
  raiz.replaceChildren(
    el(
      'div',
      { class: 'pagina pagina--dashboard' },
      cabecalhoPagina({ titulo: 'Dashboard', icone: 'layout-dashboard', descricao: `Olá, ${primeiroNome(pessoa.nome)}! Aqui está o retrato do pessoal, dos fornecedores, do CAE e das listas.` }),
      caixas.numeros,
      el('div', { class: 'grade-duas' }, caixas.abertas, caixas.aniversarios),
      caixas.setores,
      el(
        'section',
        { class: 'periodo' },
        el('div', {}, el('h2', { class: 'bloco__titulo' }, icone('calendar-days'), 'Período'), el('p', { class: 'texto-suave texto-pequeno' }, 'Vale para Fornecedores, CAE e Treinamentos do Comercial.')),
        caixas.filtro,
      ),
      caixas.fornecedores,
      el('div', { class: 'grade-duas' }, caixas.cae, caixas.comercial),
    ),
  )

  function desenhar() {
    if (erro) return trocar(caixas.numeros, blocoDeErro(erro))
    if (!dados) return trocar(caixas.numeros, carregando())
    desenharNumeros()
    desenharAbertas()
    desenharAniversarios()
    desenharSetores()
    desenharFiltro()
    desenharPeriodo()
  }

  // 1. Números gerais
  function desenharNumeros() {
    const hoje = hojeISO()
    const n = numerosGerais({ ...dados, eletricistasAtivos, hoje })
    trocar(
      caixas.numeros,
      indicadores([
        { rotulo: 'Colaboradores ativos', valor: formatarNumero(n.colaboradores), href: '#/colaboradores' },
        ...LOJAS.map((loja) => ({ rotulo: loja, valor: formatarNumero(n.porLoja[loja]), detalhe: 'colaboradores ativos', href: '#/colaboradores' })),
      ]),
      indicadores(
        [
          { rotulo: 'Eletricistas cadastrados', valor: n.eletricistas === null ? '...' : formatarNumero(n.eletricistas), href: '#/eletricistas' },
          { rotulo: 'Fornecedores cadastrados', valor: formatarNumero(n.fornecedores), href: '#/fornecedores' },
          { rotulo: `Listas realizadas em ${n.ano}`, valor: formatarNumero(n.listasNoAno), detalhe: 'treinamentos, eventos e ações', href: '#/listas' },
        ],
        { classe: 'indicadores--tres' },
      ),
    )
  }

  // 7. Próximas listas e listas abertas
  function desenharAbertas() {
    const hoje = hojeISO()
    const abertas = listasAbertas(dados.listas, hoje).slice(0, 8)
    trocar(
      caixas.abertas,
      bloco(
        { titulo: 'Listas abertas e próximas', icone: 'clipboard-check', acoes: [link({ texto: 'Todas as listas', href: '#/listas', classe: 'botao--pequeno' })] },
        abertas.length
          ? el(
              'ul',
              { class: 'lista-rapida' },
              abertas.map((l) =>
                el(
                  'li',
                  {},
                  el('span', { class: 'lista-rapida__data' }, formatarDiaMes(Number(l.data.slice(8, 10)), Number(l.data.slice(5, 7)))),
                  el(
                    'div',
                    { class: 'lista-rapida__texto' },
                    el('a', { class: 'tabela__nome', href: endereco('listas', l.id) }, l.nome),
                    el('span', { class: 'tabela__detalhe' }, [l.tipo, ondeE(l), quandoE(l.data, hoje)].filter(Boolean).join(' · ')),
                  ),
                  pode(pessoa, 'fazerCheckin') && link({ texto: 'Check-in', icone: 'clipboard-check', href: endereco('listas', l.id, 'checkin'), variante: 'principal', classe: 'botao--pequeno' }),
                ),
              ),
            )
          : el('p', { class: 'texto-suave' }, 'Nenhuma lista aberta no momento.'),
      ),
    )
  }

  // 6. Aniversariantes do mês atual
  function desenharAniversarios() {
    const { mes, ano, dia } = partesDeHoje()
    const doMes = aniversariantesDoMes(dados.colaboradores, mes)
    const deEmpresa = aniversariosDeEmpresa(dados.colaboradores, mes, ano)
    const pendentes = el('div', { class: 'pendentes-do-mes' })
    const coluna = (titulo, itens, detalhe) =>
      el(
        'div',
        { class: 'aniversarios-coluna' },
        el('h3', {}, titulo),
        itens.length
          ? el(
              'ul',
              { class: 'lista-aniversarios' },
              itens.slice(0, 8).map((a) =>
                el(
                  'li',
                  { class: a.dia === dia ? 'hoje' : null },
                  el('span', { class: 'lista-aniversarios__dia' }, formatarDiaMes(a.dia, mes)),
                  el('a', { href: endereco('colaboradores', 'ficha', a.colaborador.id) }, a.colaborador.nome),
                  detalhe(a) && el('span', { class: 'texto-suave texto-pequeno' }, detalhe(a)),
                  a.dia === dia && etiqueta('Hoje!', 'vermelha'),
                ),
              ),
              itens.length > 8 && el('li', { class: 'texto-suave texto-pequeno' }, `e mais ${itens.length - 8}`),
            )
          : el('p', { class: 'texto-suave texto-pequeno' }, 'Ninguém neste mês.'),
      )
    trocar(
      caixas.aniversarios,
      bloco(
        { titulo: `Aniversariantes de ${formatarMesAno(mes, ano)}`, icone: 'cake', acoes: [link({ texto: 'Ver todos', href: '#/aniversariantes', classe: 'botao--pequeno' })] },
        el('div', { class: 'aniversarios' }, coluna('Aniversário', doMes, () => ''), coluna('Tempo de casa', deEmpresa, (a) => plural(a.anos, 'ano', 'anos'))),
        pendentes,
      ),
    )
    // Quantos "Pendente" ainda faltam marcar nos controles do mês.
    const controles = [TIPO_MES, TIPO_EMPRESA].map((tipo) => ({ tipo, lista: dados.listas.find((l) => l.id === idDoControle(tipo, mes, ano)) }))
    Promise.all(controles.map(({ lista }) => (lista ? contarPendentes(lista.id) : Promise.resolve(null))))
      .then((contas) => {
        if (!ativo) return
        trocar(
          pendentes,
          controles.map(({ tipo, lista }, i) =>
            el(
              'p',
              {},
              el('strong', {}, tipo === TIPO_MES ? 'Controle de aniversariantes: ' : 'Controle de tempo de casa: '),
              lista
                ? [etiqueta(plural(contas[i], 'pendente', 'pendentes'), contas[i] ? 'alerta' : 'forte'), ' ', el('a', { href: endereco('aniversariantes', 'controle', lista.id) }, 'abrir')]
                : el('span', { class: 'texto-suave' }, 'ainda não gerado'),
            ),
          ),
        )
      })
      .catch((e) => trocar(pendentes, el('p', { class: 'texto-alerta texto-pequeno' }, mensagemDeErro(e))))
  }

  // 2. Setores
  function desenharSetores() {
    const { setores } = resumoDosSetores(dados.setores, dados.colaboradores)
    const nomes = (lista) => lista.map((c) => c.nome).join(', ')
    trocar(
      caixas.setores,
      bloco(
        { titulo: 'Setores', icone: 'building-2', acoes: [link({ texto: 'Ver colaboradores', href: '#/colaboradores/setores', classe: 'botao--pequeno' })] },
        setores.length
          ? el(
              'div',
              { class: 'grade-cartoes grade-cartoes--compacta' },
              setores.map(({ setor, gerentes, supervisores, total }) =>
                el(
                  'a',
                  { class: 'cartao cartao--clicavel cartao-setor cartao-setor--compacto', href: endereco('colaboradores', 'setores', setor.id) },
                  el('div', { class: 'cartao-setor__topo' }, el('h3', {}, setor.nome), etiqueta(plural(total, 'pessoa', 'pessoas'), 'forte')),
                  el(
                    'div',
                    { class: 'cartao-setor__responsaveis' },
                    el('p', { class: 'responsaveis' }, el('span', { class: 'responsaveis__rotulo' }, icone('crown'), gerentes.length > 1 ? 'Gerentes' : 'Gerente'), gerentes.length ? el('strong', {}, nomes(gerentes)) : el('span', { class: 'texto-suave' }, 'não definido')),
                    supervisores.length > 0 && el('p', { class: 'responsaveis' }, el('span', { class: 'responsaveis__rotulo' }, icone('star'), supervisores.length > 1 ? 'Supervisores' : 'Supervisor'), el('strong', {}, nomes(supervisores))),
                  ),
                ),
              ),
            )
          : el('p', { class: 'texto-suave' }, 'Os setores aparecem aqui quando os colaboradores forem cadastrados.'),
      ),
    )
  }

  // 8. Filtro de período
  function desenharFiltro() {
    trocar(
      caixas.filtro,
      filtroSelecao({
        rotulo: 'Mês',
        opcoes: [{ valor: '0', rotulo: 'Ano inteiro' }, ...NOMES_MESES.map((nome, i) => ({ valor: String(i + 1), rotulo: nome }))],
        valor: String(periodo.mes),
        aoMudar: (v) => {
          periodo.mes = Number(v)
          desenharPeriodo()
        },
      }),
      filtroSelecao({
        rotulo: 'Ano',
        opcoes: anosDisponiveis(dados.listas, partesDeHoje().ano).map(String),
        valor: String(periodo.ano),
        aoMudar: (v) => {
          periodo.ano = Number(v)
          desenharPeriodo()
        },
      }),
    )
  }

  // 3, 4 e 5: blocos que dependem do período
  async function desenharPeriodo() {
    const hoje = hojeISO()
    const doPeriodo = listasDoPeriodo(dados.listas, periodo, hoje)
    const chave = JSON.stringify([periodo, doPeriodo.map((l) => [l.id, l.status, l.fornecedores]), dados.fornecedores.length, dados.colaboradores.length])
    if (chave === chaveDoPeriodo) return
    chaveDoPeriodo = chave
    const minha = ++versaoDoPeriodo
    for (const g of graficos.splice(0)) g.destruir()

    const texto = descricaoDoPeriodo(periodo)
    desenharFornecedores(doPeriodo, texto)

    const cae = doPeriodo.filter((l) => l.tipo === 'Treinamento CAE')
    const comercial = doPeriodo.filter((l) => l.tipo === 'Treinamento Comercial')
    trocar(caixas.cae, bloco({ titulo: 'CAE', icone: 'zap' }, carregando('Contando as presenças...')))
    trocar(caixas.comercial, bloco({ titulo: 'Treinamentos do Comercial', icone: 'briefcase' }, carregando('Contando as presenças...')))
    try {
      const contagens = new Map(await Promise.all([...cae, ...comercial].map(async (l) => [l.id, await contagensDaLista(l)])))
      const faltas = new Map(await Promise.all(comercial.map(async (l) => [l.id, await comercialQueFaltou(l, dados.colaboradores)])))
      if (!ativo || minha !== versaoDoPeriodo) return
      desenharCAE(resumoDosTreinamentos(cae, contagens), texto)
      desenharComercial(resumoDosTreinamentos(comercial, contagens), faltas, texto)
    } catch (e) {
      if (!ativo || minha !== versaoDoPeriodo) return
      trocar(caixas.cae, bloco({ titulo: 'CAE', icone: 'zap' }, aviso(mensagemDeErro(e), { erro: true })))
      trocar(caixas.comercial, bloco({ titulo: 'Treinamentos do Comercial', icone: 'briefcase' }, aviso(mensagemDeErro(e), { erro: true })))
    }
  }

  function desenharFornecedores(doPeriodo, texto) {
    const ativas = dados.fornecedores.filter((f) => f.ativo !== false)
    const { ranking, participaram } = rankingDeFornecedores(dados.fornecedores, doPeriodo)
    const top = ranking.slice(0, 10)
    const g = top.length
      ? grafico({
          titulo: `Participações por marca (${texto})`,
          altura: Math.max(160, top.length * 36 + 40),
          configuracao: { tipo: 'barrasDeitadas', rotulos: top.map((r) => r.fornecedor.nome), series: [{ nome: 'Participações', valores: top.map((r) => r.vezes), cor: CORES.brilhante }] },
        })
      : null
    if (g) graficos.push(g)
    trocar(
      caixas.fornecedores,
      bloco(
        { titulo: 'Fornecedores', icone: 'handshake', acoes: [link({ texto: 'Ver marcas', href: '#/fornecedores', classe: 'botao--pequeno' })] },
        indicadores(
          [
            { rotulo: 'Marcas cadastradas', valor: formatarNumero(ativas.length) },
            { rotulo: 'Participaram no período', valor: formatarNumero(participaram), detalhe: `de pelo menos um treinamento ou evento (${texto})` },
          ],
          { classe: 'indicadores--duas indicadores--compactos' },
        ),
        g ? g.no : el('p', { class: 'texto-suave' }, `Nenhuma marca participou de lista no ${texto}.`),
      ),
    )
  }

  function colunasDoTreinamento(extra = []) {
    return [
      { rotulo: 'Treinamento', principal: true, celula: (x) => el('a', { class: 'tabela__nome', href: endereco('listas', x.lista.id, 'resumo') }, x.lista.nome) },
      { rotulo: 'Data', classe: 'numero', celula: (x) => formatarData(x.lista.data) },
      { rotulo: 'Presentes / convocados', classe: 'numero', celula: (x) => `${formatarNumero(x.presentesConvocados)} / ${formatarNumero(x.convocados)}` },
      { rotulo: 'Presença', classe: 'numero', celula: (x) => (x.taxa === null ? 'Sem convocados' : `${x.taxa}%`) },
      ...extra,
    ]
  }

  function desenharCAE(r, texto) {
    const ultimos = [...r.treinamentos].slice(0, 8).reverse()
    const g = ultimos.length
      ? grafico({
          titulo: 'Presentes e convocados por treinamento',
          configuracao: {
            tipo: 'barras',
            rotulos: ultimos.map((t) => `${formatarDiaMes(Number(t.lista.data.slice(8, 10)), Number(t.lista.data.slice(5, 7)))} ${t.lista.nome}`),
            series: [
              { nome: 'Convocados', valores: ultimos.map((t) => t.convocados), cor: CORES.medioClaro },
              { nome: 'Presentes', valores: ultimos.map((t) => t.presentes), cor: CORES.brilhante },
            ],
          },
        })
      : null
    if (g) graficos.push(g)
    trocar(
      caixas.cae,
      bloco(
        { titulo: 'CAE', icone: 'zap', descricao: `Treinamentos CAE no ${texto}.` },
        indicadores(
          [
            { rotulo: 'Eletricistas', valor: eletricistasAtivos === null ? '...' : formatarNumero(eletricistasAtivos), href: '#/eletricistas' },
            { rotulo: 'Presença média', valor: r.mediaDaTaxa === null ? 'Sem dados' : `${r.mediaDaTaxa}%`, detalhe: 'dos convocados' },
            { rotulo: 'Treinamentos', valor: formatarNumero(r.treinamentos.length), detalhe: r.mediaDePresentes === null ? '' : `média de ${r.mediaDePresentes} presentes` },
          ],
          { classe: 'indicadores--tres indicadores--compactos' },
        ),
        g?.no,
        r.treinamentos.length ? tabela({ itens: r.treinamentos, chave: (t) => t.lista.id, classe: 'tabela--compacta', colunas: colunasDoTreinamento() }) : el('p', { class: 'texto-suave' }, `Nenhum treinamento CAE no ${texto}.`),
      ),
    )
  }

  function desenharComercial(r, faltas, texto) {
    const ultimos = [...r.treinamentos].filter((t) => t.taxa !== null).slice(0, 8).reverse()
    const g = ultimos.length
      ? grafico({
          titulo: 'Taxa de presença por treinamento',
          configuracao: {
            tipo: 'barras',
            porcentagem: true,
            rotulos: ultimos.map((t) => `${formatarDiaMes(Number(t.lista.data.slice(8, 10)), Number(t.lista.data.slice(5, 7)))} ${t.lista.nome}`),
            series: [{ nome: 'Presença', valores: ultimos.map((t) => t.taxa), cor: CORES.brilhante }],
          },
        })
      : null
    if (g) graficos.push(g)
    const totalDeFaltas = [...faltas.values()].reduce((s, l) => s + l.length, 0)
    trocar(
      caixas.comercial,
      bloco(
        { titulo: 'Treinamentos do Comercial', icone: 'briefcase', descricao: `Treinamentos Comerciais no ${texto}.` },
        indicadores(
          [
            { rotulo: 'Treinamentos', valor: formatarNumero(r.treinamentos.length) },
            { rotulo: 'Presença média', valor: r.mediaDaTaxa === null ? 'Sem dados' : `${r.mediaDaTaxa}%`, detalhe: 'dos convocados' },
            { rotulo: 'Faltas do comercial', valor: formatarNumero(totalDeFaltas), detalhe: 'convocados do setor que não vieram' },
          ],
          { classe: 'indicadores--tres indicadores--compactos' },
        ),
        g?.no,
        r.treinamentos.length
          ? tabela({
              itens: r.treinamentos,
              chave: (t) => t.lista.id,
              classe: 'tabela--compacta',
              colunas: colunasDoTreinamento([
                {
                  rotulo: 'Comercial faltou',
                  classe: 'numero',
                  celula: (t) => {
                    const n = faltas.get(t.lista.id)?.length ?? 0
                    return n ? etiqueta(plural(n, 'pessoa', 'pessoas'), 'alerta') : etiqueta('Ninguém', 'forte')
                  },
                },
              ]),
            })
          : el('p', { class: 'texto-suave' }, `Nenhum Treinamento Comercial no ${texto}.`),
      ),
    )
  }

  contarEletricistasAtivos()
    .then((n) => {
      eletricistasAtivos = n
      if (ativo && dados) {
        desenharNumeros()
        chaveDoPeriodo = ''
        desenharPeriodo()
      }
    })
    .catch(() => {})

  const parar = ouvirFontes(['colaboradores', 'setores', 'fornecedores', 'listas'], (novos, e) => {
    erro = e
    if (novos) dados = novos
    desenhar()
  })
  desenhar()
  return () => {
    ativo = false
    parar()
    for (const g of graficos.splice(0)) g.destruir()
  }
}
