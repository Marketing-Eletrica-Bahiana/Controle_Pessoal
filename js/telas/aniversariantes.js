// Aba Aniversariantes. Endereços: #/aniversariantes (mês escolhido), #/aniversariantes/historico e
// #/aniversariantes/controle/{id} (tela de status do controle do mês).
import { gerarControle, incluirNoControle } from '../dados/aniversariantes.js'
import { ouvirFontes } from '../dados/fontes.js'
import { ouvirPresencas } from '../dados/listas.js'
import {
  ROTULO_DA_CATEGORIA, TIPO_EMPRESA, TIPO_MES, abasDoMes, aniversariantesDoMes, aniversariosDeEmpresa, categoriaDoAniversario,
  contarCategorias, ehHoje, faltandoNoControle, idDoControle, nomeDoArquivoDoMes, temObservacao,
} from '../lib/aniversariantes.js'
import { NOMES_MESES, formatarDiaMes, formatarMesAno, partesDeHoje } from '../lib/datas.js'
import { mensagemDeErro } from '../lib/erros.js'
import { pode } from '../lib/papeis.js'
import { endereco } from '../lib/rotas.js'
import { formatarNumero, plural } from '../lib/texto.js'
import {
  avisar, avisarErro, blocoDeErro, bloco, botao, botaoIcone, carregando, comOcupado, confirmar, etiqueta, indicadores, link, selecao,
  tabela,
} from '../ui/componentes.js'
import { el, icone, trocar } from '../ui/dom.js'
import { baixarPlanilha } from '../ui/planilha.js'
import { VARIANTE_DO_STATUS, cabecalhoDaAba, periodo } from './aniversariantes/comum.js'
import { contatosDoColaborador } from './colaboradores/contatos.js'
import { montarControle } from './aniversariantes/controle.js'
import { montarHistorico } from './aniversariantes/historico.js'

export function montar(raiz, contexto) {
  const [parte, id] = contexto.params
  if (parte === 'historico') return montarHistorico(raiz, contexto)
  if (parte === 'controle' && id) return montarControle(raiz, { ...contexto, id })
  return montarMes(raiz, contexto)
}

function montarMes(raiz, { pessoa }) {
  const admin = pode(pessoa, 'gerenciarListas')
  let dados = null
  let erro = null
  const presencas = { [TIPO_MES]: null, [TIPO_EMPRESA]: null }
  const ouvintes = {}

  const seletor = el('div', { class: 'seletor-mes' })
  const conteudo = el('div', { class: 'pagina' })
  raiz.replaceChildren(el('div', { class: 'pagina' }, ...cabecalhoDaAba('mes'), seletor, conteudo))

  const controleDe = (tipo) => dados?.listas.find((l) => l.id === idDoControle(tipo, periodo.mes, periodo.ano)) ?? null

  // Ouve as presenças dos controles do mês escolhido (quando existem).
  function ouvirControles() {
    for (const tipo of [TIPO_MES, TIPO_EMPRESA]) {
      const lista = controleDe(tipo)
      const alvo = lista?.id ?? null
      if (ouvintes[tipo]?.id === alvo) continue
      ouvintes[tipo]?.parar()
      presencas[tipo] = null
      ouvintes[tipo] = {
        id: alvo,
        parar: alvo
          ? ouvirPresencas(
              alvo,
              (lista_) => {
                presencas[tipo] = lista_
                desenhar()
              },
              (e) => avisarErro(mensagemDeErro(e)),
            )
          : () => {},
      }
    }
  }

  function mudarMes(mes, ano) {
    periodo.mes = mes
    periodo.ano = ano
    ouvirControles()
    desenharSeletor()
    desenhar()
  }

  function desenharSeletor() {
    const anoAtual = partesDeHoje().ano
    const anos = Array.from({ length: 7 }, (_, i) => anoAtual - 4 + i)
    const anterior = () => (periodo.mes === 1 ? mudarMes(12, periodo.ano - 1) : mudarMes(periodo.mes - 1, periodo.ano))
    const proximo = () => (periodo.mes === 12 ? mudarMes(1, periodo.ano + 1) : mudarMes(periodo.mes + 1, periodo.ano))
    const hoje = partesDeHoje()
    trocar(
      seletor,
      botaoIcone({ icone: 'chevron-left', rotulo: 'Mês anterior', aoClicar: anterior }),
      selecao(NOMES_MESES.map((nome, i) => ({ valor: String(i + 1), rotulo: nome })), String(periodo.mes), {
        'aria-label': 'Mês',
        onChange: (e) => mudarMes(Number(e.target.value), periodo.ano),
      }),
      selecao([...new Set([...anos, periodo.ano])].sort().map((a) => ({ valor: String(a), rotulo: String(a) })), String(periodo.ano), {
        'aria-label': 'Ano',
        onChange: (e) => mudarMes(periodo.mes, Number(e.target.value)),
      }),
      botaoIcone({ icone: 'chevron-right', rotulo: 'Próximo mês', aoClicar: proximo }),
      (periodo.mes !== hoje.mes || periodo.ano !== hoje.ano) && botao({ texto: 'Mês atual', classe: 'botao--pequeno', aoClicar: () => mudarMes(hoje.mes, hoje.ano) }),
      el('span', { class: 'seletor-mes__espaco' }),
      botaoDoMes(),
    )
  }

  function botaoDoMes() {
    const b = botao({
      texto: 'Baixar planilha do mês',
      icone: 'download',
      aoClicar: () =>
        comOcupado(b, async () => {
          try {
            const { mes, ano } = periodo
            const mapa = (tipo) => (controleDe(tipo) && presencas[tipo] ? new Map(presencas[tipo].map((p) => [p.pessoaId, p])) : null)
            await baixarPlanilha(
              nomeDoArquivoDoMes(mes, ano),
              abasDoMes({
                mes,
                ano,
                doMes: aniversariantesDoMes(dados.colaboradores, mes),
                deEmpresa: aniversariosDeEmpresa(dados.colaboradores, mes, ano),
                statusMes: mapa(TIPO_MES),
                statusEmpresa: mapa(TIPO_EMPRESA),
              }),
            )
          } catch (e) {
            avisarErro(e)
          }
        }),
    })
    return b
  }

  function desenhar() {
    if (erro) return trocar(conteudo, blocoDeErro(erro))
    if (!dados) return trocar(conteudo, carregando())
    const { mes, ano } = periodo
    const hoje = partesDeHoje()
    const doMes = aniversariantesDoMes(dados.colaboradores, mes)
    const deEmpresa = aniversariosDeEmpresa(dados.colaboradores, mes, ano)
    const deHoje = mes === hoje.mes && ano === hoje.ano ? [...doMes, ...deEmpresa].filter((a) => a.dia === hoje.dia) : []
    trocar(
      conteudo,
      deHoje.length > 0 &&
        el(
          'div',
          { class: 'destaque-hoje', role: 'status' },
          icone('party-popper'),
          el('div', {}, el('strong', {}, 'Hoje tem festa!'), el('p', {}, [...new Set(deHoje.map((a) => a.colaborador.nome))].join(', '))),
        ),
      secao({ tipo: TIPO_MES, titulo: `Aniversariantes de ${formatarMesAno(mes, ano)}`, icone: 'cake', itens: doMes, hoje }),
      secao({ tipo: TIPO_EMPRESA, titulo: `Aniversário de empresa em ${formatarMesAno(mes, ano)}`, icone: 'briefcase', itens: deEmpresa, hoje }),
    )
  }

  function secao({ tipo, titulo, icone: nomeIcone, itens, hoje }) {
    const lista = controleDe(tipo)
    const daLista = presencas[tipo]
    const porPessoa = new Map((daLista ?? []).map((p) => [p.pessoaId, p]))
    const empresa = tipo === TIPO_EMPRESA
    return bloco(
      { titulo, icone: nomeIcone, acoes: [areaDoControle(tipo, lista, daLista, itens)], descricao: plural(itens.length, empresa ? 'pessoa completa tempo de casa' : 'aniversariante', empresa ? 'pessoas completam tempo de casa' : 'aniversariantes') },
      lista && daLista?.length > 0 && cartoesDoControle(daLista),
      itens.length
        ? tabela({
            itens,
            chave: (a) => a.colaborador.id,
            classeDaLinha: (a) => (ehHoje(a.dia, periodo.mes, hoje) && periodo.ano === hoje.ano ? 'linha--hoje' : null),
            colunas: [
              { rotulo: 'Dia', classe: 'numero', celula: (a) => formatarDiaMes(a.dia, periodo.mes) },
              {
                rotulo: 'Nome',
                principal: true,
                celula: (a) => [
                  el('a', { class: 'tabela__nome', href: endereco('colaboradores', 'ficha', a.colaborador.id) }, a.colaborador.nome),
                  ehHoje(a.dia, periodo.mes, hoje) && periodo.ano === hoje.ano && etiqueta('Hoje!', 'vermelha'),
                ],
              },
              { rotulo: 'Contato', ordenavel: false, celula: (a) => contatosDoColaborador(a.colaborador) },
              { rotulo: 'Setor', celula: (a) => a.colaborador.setor || 'Sem setor' },
              { rotulo: 'Loja', celula: (a) => a.colaborador.loja || '' },
              empresa && { rotulo: 'Tempo de casa', celula: (a) => plural(a.anos, 'ano', 'anos') },
              lista && {
                rotulo: 'Status',
                celula: (a) => {
                  const p = porPessoa.get(a.colaborador.id)
                  if (!daLista) return ''
                  if (!p) return el('span', { class: 'texto-suave' }, 'Fora do controle')
                  const categoria = categoriaDoAniversario(p)
                  return [
                    etiqueta(ROTULO_DA_CATEGORIA[categoria], VARIANTE_DO_STATUS[categoria]),
                    temObservacao(p) && el('span', { class: 'tabela__detalhe' }, p.observacao.trim()),
                  ]
                },
              },
            ].filter(Boolean),
          })
        : el('p', { class: 'texto-suave' }, empresa ? 'Ninguém completa tempo de casa neste mês.' : 'Nenhum aniversariante neste mês.'),
    )
  }

  // Cartões do controle (como os do Dashboard): Participou, Não participou e Outros (quem não participou e tem
  // observação). Pendentes só aparecem enquanto ainda tem gente para marcar.
  function cartoesDoControle(daLista) {
    const conta = contarCategorias(daLista)
    const total = daLista.length
    const cartoes = [
      { rotulo: 'Participou', valor: formatarNumero(conta.participou), detalhe: `${Math.round((conta.participou / total) * 100)}% do controle` },
      { rotulo: 'Não participou', valor: formatarNumero(conta.nao_participou), detalhe: 'sem observação' },
      { rotulo: 'Outros', valor: formatarNumero(conta.outros), detalhe: 'com observação' },
      conta.pendente > 0 && { rotulo: 'Pendentes', valor: formatarNumero(conta.pendente), detalhe: 'ainda faltam marcar' },
    ].filter(Boolean)
    return indicadores(cartoes, { classe: cartoes.length === 3 ? 'indicadores--tres' : undefined })
  }

  function areaDoControle(tipo, lista, daLista, itens) {
    if (lista) {
      const conta = contarCategorias(daLista ?? [])
      const faltam = daLista ? faltandoNoControle(itens, daLista) : []
      const incluir =
        admin &&
        faltam.length > 0 &&
        lista.status === 'aberta' &&
        botao({
          texto: `Incluir ${plural(faltam.length, 'que falta', 'que faltam')}`,
          icone: 'user-plus',
          classe: 'botao--pequeno',
          aoClicar: () =>
            comOcupado(incluir, async () => {
              try {
                await incluirNoControle(lista.id, faltam.map((a) => a.colaborador))
                avisar(`${plural(faltam.length, 'aniversariante incluído', 'aniversariantes incluídos')} no controle.`)
              } catch (e) {
                avisarErro(mensagemDeErro(e))
              }
            }),
        })
      return el(
        'div',
        { class: 'controle-do-mes' },
        lista.status === 'encerrada' ? etiqueta('Controle encerrado', 'marinho') : etiqueta(plural(conta.pendente, 'pendente', 'pendentes'), conta.pendente ? 'alerta' : 'forte'),
        incluir,
        link({ texto: 'Abrir controle', icone: 'list-checks', href: endereco('aniversariantes', 'controle', lista.id), variante: 'principal', classe: 'botao--pequeno' }),
      )
    }
    if (!admin) return el('span', { class: 'texto-suave texto-pequeno' }, 'Controle do mês ainda não gerado')
    const gerar = botao({
      texto: 'Gerar controle do mês',
      icone: 'list-plus',
      variante: 'principal',
      classe: 'botao--pequeno',
      disabled: !itens.length,
      aoClicar: async () => {
        const ok = await confirmar({
          titulo: 'Gerar controle do mês',
          texto: `Criar "${tipo === TIPO_EMPRESA ? 'Aniversário de empresa' : 'Aniversariantes'} de ${formatarMesAno(periodo.mes, periodo.ano)}" com ${plural(itens.length, 'pessoa', 'pessoas')}, todas como Pendente?`,
          botaoSim: 'Gerar controle',
        })
        if (!ok) return
        await comOcupado(gerar, async () => {
          try {
            await gerarControle({ tipo, mes: periodo.mes, ano: periodo.ano, colaboradores: itens.map((a) => a.colaborador), pessoa })
            avisar('Controle gerado! Agora é só marcar quem participou.')
          } catch (e) {
            avisarErro(mensagemDeErro(e))
          }
        })
      },
    })
    return gerar
  }

  const parar = ouvirFontes(['colaboradores', 'listas'], (novos, e) => {
    erro = e
    if (novos) dados = novos
    ouvirControles()
    desenhar()
  })
  desenharSeletor()
  desenhar()
  return () => {
    parar()
    for (const o of Object.values(ouvintes)) o?.parar()
  }
}
