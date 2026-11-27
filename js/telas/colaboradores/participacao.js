// Parte "Participação" da aba Colaboradores (#/colaboradores/participacao): quem mais participou das ações de
// endomarketing (ou de outro tipo de lista, pelo filtro) e dos controles de aniversariantes, com as observações.
// Só colaboradores ativos e só listas que já aconteceram. Regras em js/lib/participacao.js.
import { lerControles } from '../../dados/aniversariantes.js'
import { fonte } from '../../dados/fontes.js'
import { lerPresencas } from '../../dados/listas.js'
import { historicoDosAniversarios } from '../../lib/aniversariantes.js'
import { formatarData, hojeISO } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import {
  CABECALHO_DA_PARTICIPACAO, CABECALHO_DOS_ANIVERSARIOS, TIPOS_DA_PARTICIPACAO, anosDasListas, aniversariosDosAtivos, controlesDaParticipacao,
  linhasDaParticipacao, linhasDosAniversarios, listasDaParticipacao, rankingDeParticipacao, tipoDaParticipacao, TIPO_PADRAO,
} from '../../lib/participacao.js'
import { endereco } from '../../lib/rotas.js'
import { combinaBusca, formatarNumero, nomeDeArquivo, plural } from '../../lib/texto.js'
import { aviso, avisarErro, bloco, botao, campoBusca, carregando, comOcupado, etiqueta, filtroSelecao, indicadores, tabela } from '../../ui/componentes.js'
import { el, trocar } from '../../ui/dom.js'
import { baixarPlanilha } from '../../ui/planilha.js'
import { tabelaDoRankingDeAniversarios } from '../aniversariantes/comum.js'

// Filtros ficam guardados enquanto a pessoa navega.
const filtros = { tipo: TIPO_PADRAO, ano: '', busca: '' }

// Devolve { parar, colaboradores(novos) }: a aba Colaboradores avisa quando o cadastro muda.
export function montarParticipacao(caixa, { colaboradores, podeBaixar }) {
  let ativo = true
  let pessoas = colaboradores
  let listas = null
  let lidas = null
  let chaveCarregada = ''
  const filtrosCaixa = el('div', { class: 'filtros' })
  const conteudo = el('div', { class: 'pagina' }, carregando())
  const busca = campoBusca({
    valor: filtros.busca,
    aoDigitar: (v) => {
      filtros.busca = v
      desenharResultado()
    },
  })
  trocar(caixa, filtrosCaixa, conteudo)

  function desenharFiltros() {
    trocar(
      filtrosCaixa,
      busca.no,
      filtroSelecao({
        rotulo: 'Tipo de lista',
        opcoes: TIPOS_DA_PARTICIPACAO.map((t) => ({ valor: t.valor, rotulo: t.rotulo })),
        valor: filtros.tipo,
        aoMudar: (v) => {
          filtros.tipo = v
          carregar()
        },
      }),
      filtroSelecao({
        rotulo: 'Ano',
        opcoes: [{ valor: '', rotulo: 'Todos os anos' }, ...anosDasListas(listas ?? [])],
        valor: filtros.ano,
        aoMudar: (v) => {
          filtros.ano = v
          carregar()
        },
      }),
    )
  }

  // Lê as presenças só quando mudam as listas escolhidas (não a cada mudança em outra lista).
  async function carregar() {
    const escolhidas = listasDaParticipacao(listas ?? [], filtros, hojeISO())
    const controles = controlesDaParticipacao(listas ?? [], filtros)
    const chave = `${escolhidas.map((l) => l.id).join(',')}|${controles.map((l) => l.id).join(',')}`
    if (chave === chaveCarregada && lidas) return desenharResultado()
    chaveCarregada = chave
    trocar(conteudo, carregando('Lendo as listas...'))
    try {
      const [acoes, aniversarios] = await Promise.all([
        Promise.all(escolhidas.map((lista) => lerPresencas(lista.id, [['tipoPessoa', '==', 'colaborador']]).then((presencas) => ({ lista, presencas })))),
        lerControles(controles),
      ])
      if (!ativo || chave !== chaveCarregada) return
      lidas = { acoes, aniversarios, temControles: controles.length > 0 }
      desenharResultado()
    } catch (e) {
      if (ativo) trocar(conteudo, aviso(mensagemDeErro(e), { erro: true }))
    }
  }

  function desenharResultado() {
    if (!lidas) return
    const tipo = tipoDaParticipacao(filtros.tipo)
    const { ranking, participacoes, semParticipar } = rankingDeParticipacao(lidas.acoes, pessoas)
    const aniversarios = aniversariosDosAtivos(historicoDosAniversarios(lidas.aniversarios).participaram, pessoas)
    const noAno = filtros.ano ? ` em ${filtros.ano}` : ''
    const daBusca = (nome) => combinaBusca(nome, filtros.busca)
    const aniversariosDaBusca = aniversarios.filter((p) => daBusca(p.nome))
    trocar(
      conteudo,
      indicadores([
        { rotulo: tipo.rotulo, valor: formatarNumero(lidas.acoes.length), detalhe: filtros.ano || 'Todos os anos' },
        { rotulo: 'Colaboradores que participaram', valor: formatarNumero(ranking.length) },
        { rotulo: 'Participações', valor: formatarNumero(participacoes) },
        { rotulo: 'Ainda não participaram', valor: formatarNumero(semParticipar), detalhe: 'Colaboradores ativos' },
      ]),
      el(
        'div',
        { class: 'pagina__barra' },
        el('p', { class: 'texto-suave' }, 'Só colaboradores ativos e listas que já aconteceram.'),
        podeBaixar && botaoBaixar(tipo, ranking, aniversarios),
      ),
      bloco(
        {
          titulo: `Quem mais participou: ${tipo.rotulo}`,
          icone: 'trophy',
          descricao: lidas.acoes.length
            ? `Em ${plural(lidas.acoes.length, tipo.um, tipo.varios)}${noAno}. Conta quem fez check-in, convocado ou não. "Faltou" é quem foi convocado e não fez check-in.`
            : '',
        },
        !lidas.acoes.length
          ? el('p', { class: 'texto-suave' }, `Nenhuma lista${filtros.tipo ? ` do tipo "${filtros.tipo}"` : ''} aconteceu${noAno} até hoje.`)
          : ranking.length
            ? tabelaDeAcoes(ranking, ranking.filter((r) => daBusca(r.colaborador.nome)))
            : el('p', { class: 'texto-suave' }, 'Nenhum colaborador ativo fez check-in nessas listas.'),
      ),
      bloco(
        {
          titulo: 'Quem mais participou dos aniversariantes',
          icone: 'cake',
          descricao: 'Contando os meses marcados como "Participou" nos controles de aniversariantes (do mês e de empresa), com as observações.',
        },
        !lidas.temControles
          ? el('p', { class: 'texto-suave' }, `Nenhum controle de aniversariantes gerado${noAno}.`)
          : !aniversarios.length
            ? el('p', { class: 'texto-suave' }, `Ninguém ativo marcado como "Participou"${noAno}.`)
            : aniversariosDaBusca.length
              ? tabelaDoRankingDeAniversarios(aniversarios, { destaque: 'participou', itens: aniversariosDaBusca, limite: 200, comSetor: true })
              : aviso('Ninguém encontrado com essa busca.'),
      ),
    )
  }

  function tabelaDeAcoes(ranking, itens) {
    const posicao = new Map(ranking.map((r, i) => [r.colaborador.id, i + 1]))
    if (!itens.length) return aviso('Ninguém encontrado com essa busca.')
    return tabela({
      itens,
      limite: 200,
      chave: (r) => r.colaborador.id,
      colunas: [
        { rotulo: 'Posição', classe: 'numero', ordem: (r) => posicao.get(r.colaborador.id), celula: (r) => `${posicao.get(r.colaborador.id)}º` },
        {
          rotulo: 'Nome',
          principal: true,
          celula: (r) => el('a', { class: 'tabela__nome', href: endereco('colaboradores', 'ficha', r.colaborador.id) }, r.colaborador.nome),
        },
        { rotulo: 'Setor', celula: (r) => r.colaborador.setor || 'Sem setor' },
        { rotulo: 'Participou', classe: 'numero', ordem: (r) => r.participou, celula: (r) => etiqueta(formatarNumero(r.participou), 'forte') },
        { rotulo: 'Convocado', classe: 'numero', ordem: (r) => r.convocado, celula: (r) => formatarNumero(r.convocado) },
        { rotulo: 'Faltou', classe: 'numero', ordem: (r) => r.faltou, celula: (r) => formatarNumero(r.faltou) },
        { rotulo: 'Última participação', classe: 'numero', ordem: (r) => r.ultima, celula: (r) => formatarData(r.ultima) },
      ],
    })
  }

  function botaoBaixar(tipo, ranking, aniversarios) {
    const b = botao({
      texto: 'Baixar planilha',
      icone: 'download',
      disabled: !ranking.length && !aniversarios.length,
      aoClicar: () =>
        comOcupado(b, async () => {
          try {
            const data = formatarData(hojeISO()).replaceAll('/', '-')
            await baixarPlanilha(nomeDeArquivo(`Participação ${tipo.rotulo} ${filtros.ano || 'todos os anos'} ${data}`), [
              { nome: tipo.rotulo, cabecalho: CABECALHO_DA_PARTICIPACAO, linhas: linhasDaParticipacao(ranking) },
              { nome: 'Aniversariantes', cabecalho: CABECALHO_DOS_ANIVERSARIOS, linhas: linhasDosAniversarios(aniversarios) },
            ])
          } catch (e) {
            avisarErro(e)
          }
        }),
    })
    return b
  }

  const parar = fonte('listas').ouvir((dados, erro) => {
    if (!ativo) return
    if (erro) return trocar(conteudo, aviso(mensagemDeErro(erro), { erro: true }))
    if (!dados) return
    listas = dados
    desenharFiltros()
    carregar()
  })

  return {
    parar: () => {
      ativo = false
      parar()
    },
    colaboradores: (novos) => {
      pessoas = novos
      desenharResultado()
    },
  }
}
