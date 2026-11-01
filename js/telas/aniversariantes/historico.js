// Histórico dos controles de aniversariantes: por colaborador, em quais meses participou ou não da
// ação, e o ranking de quem mais deixou de participar.
import { lerControles } from '../../dados/aniversariantes.js'
import { fonte } from '../../dados/fontes.js'
import { STATUS_ANIVERSARIO, TIPO_EMPRESA, TIPO_MES, historicoDosAniversarios, rotuloCurtoDoMes } from '../../lib/aniversariantes.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { ehListaDeAniversario } from '../../lib/listas.js'
import { endereco } from '../../lib/rotas.js'
import { combinaBusca, formatarNumero } from '../../lib/texto.js'
import { aviso, bloco, campoBusca, carregando, etiqueta, filtroSelecao, listaComLimite, tabela } from '../../ui/componentes.js'
import { el, trocar } from '../../ui/dom.js'
import { VARIANTE_DO_STATUS, cabecalhoDaAba } from './comum.js'

const filtros = { ano: '', tipo: '', busca: '' }

export function montarHistorico(raiz) {
  let ativo = true
  let listas = null
  let historico = null
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
  raiz.replaceChildren(el('div', { class: 'pagina' }, ...cabecalhoDaAba('historico'), filtrosCaixa, conteudo))

  const controles = () =>
    (listas ?? [])
      .filter(ehListaDeAniversario)
      .filter((l) => !filtros.ano || String(l.data).startsWith(filtros.ano))
      .filter((l) => !filtros.tipo || l.tipo === filtros.tipo)

  function desenharFiltros() {
    const anos = [...new Set((listas ?? []).filter(ehListaDeAniversario).map((l) => String(l.data).slice(0, 4)))].sort().reverse()
    trocar(
      filtrosCaixa,
      busca.no,
      filtroSelecao({
        rotulo: 'Ano',
        opcoes: [{ valor: '', rotulo: 'Todos os anos' }, ...anos],
        valor: filtros.ano,
        aoMudar: (v) => {
          filtros.ano = v
          carregar()
        },
      }),
      filtroSelecao({
        rotulo: 'Controle',
        opcoes: [
          { valor: '', rotulo: 'Os dois' },
          { valor: TIPO_MES, rotulo: 'Aniversariantes do mês' },
          { valor: TIPO_EMPRESA, rotulo: 'Aniversário de empresa' },
        ],
        valor: filtros.tipo,
        aoMudar: (v) => {
          filtros.tipo = v
          carregar()
        },
      }),
    )
  }

  async function carregar() {
    const escolhidos = controles()
    const chave = escolhidos.map((l) => l.id).join(',')
    if (chave === chaveCarregada && historico) return desenharResultado()
    chaveCarregada = chave
    if (!escolhidos.length) {
      historico = { pessoas: [], ranking: [] }
      return desenharResultado()
    }
    trocar(conteudo, carregando('Lendo os controles...'))
    try {
      const lidos = await lerControles(escolhidos)
      if (!ativo || chave !== chaveCarregada) return
      historico = historicoDosAniversarios(lidos)
      desenharResultado()
    } catch (e) {
      if (ativo) trocar(conteudo, aviso(mensagemDeErro(e), { erro: true }))
    }
  }

  const chip = (r) =>
    etiqueta(`${rotuloCurtoDoMes(r.mes, r.ano)} ${r.tipo === TIPO_EMPRESA ? '(empresa)' : ''} ${STATUS_ANIVERSARIO[r.status]}`.replace(/\s+/g, ' '), VARIANTE_DO_STATUS[r.status] ?? '')

  function desenharResultado() {
    if (!historico) return
    if (!controles().length) {
      return trocar(conteudo, aviso('Nenhum controle de aniversariantes gerado ainda. Gere o controle do mês na aba "Do mês".'))
    }
    const pessoas = historico.pessoas.filter((p) => combinaBusca(p.nome, filtros.busca))
    const linkDaPessoa = (p) => el('a', { class: 'tabela__nome', href: endereco('colaboradores', 'ficha', p.pessoaId) }, p.nome)
    trocar(
      conteudo,
      bloco(
        { titulo: 'Quem mais deixou de participar', icone: 'trophy', descricao: 'Contando os meses marcados como "Não participou".' },
        historico.ranking.length
          ? tabela({
              itens: historico.ranking.slice(0, 10),
              chave: (p) => p.pessoaId,
              colunas: [
                { rotulo: 'Posição', classe: 'numero', celula: (p) => `${historico.ranking.indexOf(p) + 1}º` },
                { rotulo: 'Nome', principal: true, celula: linkDaPessoa },
                { rotulo: 'Não participou', classe: 'numero', celula: (p) => etiqueta(formatarNumero(p.conta.nao_participou), 'alerta') },
                { rotulo: 'Participou', classe: 'numero', celula: (p) => formatarNumero(p.conta.participou) },
                { rotulo: 'Pendente', classe: 'numero', celula: (p) => formatarNumero(p.conta.pendente) },
              ],
            })
          : el('p', { class: 'texto-suave' }, 'Ninguém marcado como "Não participou" no período.'),
      ),
      bloco(
        { titulo: 'Por colaborador', icone: 'users', descricao: 'Mês a mês, o que ficou marcado em cada controle.' },
        pessoas.length
          ? listaComLimite(pessoas, (itens) =>
              tabela({
                itens,
                chave: (p) => p.pessoaId,
                colunas: [
                  { rotulo: 'Nome', principal: true, celula: linkDaPessoa },
                  { rotulo: 'Meses', celula: (p) => el('div', { class: 'chips' }, p.registros.map(chip)) },
                ],
              }),
            )
          : el('p', { class: 'texto-suave' }, 'Ninguém encontrado.'),
      ),
    )
  }

  const parar = fonte('listas').ouvir((dados, erro) => {
    if (erro) return trocar(conteudo, aviso(mensagemDeErro(erro), { erro: true }))
    if (!dados) return
    listas = dados
    desenharFiltros()
    carregar()
  })
  return () => {
    ativo = false
    parar()
  }
}
