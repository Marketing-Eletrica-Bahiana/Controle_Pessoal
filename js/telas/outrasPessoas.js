// Aba Outras pessoas: Diretoria, prestadores de serviço e outros que não são colaboradores mas entram nas listas (como
// na festa de final de ano). Endereços: #/outras-pessoas e #/outras-pessoas/{id}
import { definirAtivoOutraPessoa } from '../dados/outrasPessoas.js'
import { ouvirFontes } from '../dados/fontes.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { mensagemDeErro } from '../lib/erros.js'
import { CABECALHO_DA_LISTA, GRUPOS_DE_OUTRAS_PESSOAS, filtrarOutrasPessoas, linhaDaLista } from '../lib/outrasPessoas.js'
import { pode } from '../lib/papeis.js'
import { endereco } from '../lib/rotas.js'
import { nomeDeArquivo, plural } from '../lib/texto.js'
import {
  aviso, avisar, avisarErro, bloco, blocoDeErro, botao, botaoIcone, cabecalhoPagina, campoBusca, carregando, comOcupado, confirmar,
  estadoVazio, etiqueta, ficha, filtroSelecao, tabela,
} from '../ui/componentes.js'
import { el, trocar } from '../ui/dom.js'
import { baixarPlanilha } from '../ui/planilha.js'
import { historicoDaPessoa } from './listas/historico.js'
import { abrirFormularioOutraPessoa, abrirImportacaoOutrasPessoas } from './outrasPessoas/formulario.js'

const TITULO = 'Outras pessoas'
const filtros = { busca: '', grupo: '', situacao: 'ativos' }

// Antes de publicar as regras novas no Firebase, a coleção nega a leitura: explica o que fazer.
export const avisoDasRegras = (erro) =>
  erro?.code === 'permission-denied'
    ? aviso('Esta parte precisa das regras novas do Firebase. Abra o console do Firebase em Firestore Database > Regras, cole o conteúdo do arquivo firestore.rules e clique em Publicar (passo a passo no README, parte "Como publicar novas regras do Firestore").', { erro: true })
    : blocoDeErro(erro)

export function montar(raiz, { pessoa, params }) {
  const [id] = params
  const admin = pode(pessoa, 'editarCadastros')
  let dados = null
  let erro = null
  const atuais = () => dados ?? { outrasPessoas: [], colaboradores: [] }
  const area = el('div', { class: 'pagina' })
  raiz.replaceChildren(area)
  const fixos = {}
  let pararHistorico = null

  function desenhar() {
    if (erro) return trocar(area, cabecalhoPagina({ titulo: TITULO, icone: 'briefcase' }), avisoDasRegras(erro))
    if (!dados) return trocar(area, carregando())
    if (id) desenharFicha()
    else desenharLista()
  }

  const nova = () => abrirFormularioOutraPessoa({ dados: atuais, grupo: filtros.grupo })

  function desenharLista() {
    if (!fixos.resultado || !area.contains(fixos.resultado)) {
      fixos.filtros = el('div', { class: 'filtros' })
      fixos.resultado = el('div', { class: 'pagina__resultado' })
      fixos.busca = campoBusca({
        valor: filtros.busca,
        placeholder: 'Buscar pelo nome ou empresa',
        aoDigitar: (v) => {
          filtros.busca = v
          desenharResultado()
        },
      })
      trocar(
        area,
        cabecalhoPagina({
          titulo: TITULO,
          icone: 'briefcase',
          descricao: 'Diretoria, prestadores de serviço e outras pessoas que não são colaboradores, mas entram nas listas (como na festa de final de ano).',
          acoes: admin
            ? [
                botao({ texto: 'Importar planilha', icone: 'file-spreadsheet', aoClicar: () => abrirImportacaoOutrasPessoas({ dados: atuais }) }),
                botao({ texto: 'Nova pessoa', icone: 'user-plus', variante: 'principal', aoClicar: nova }),
              ]
            : [],
        }),
        fixos.filtros,
        fixos.resultado,
      )
    }
    trocar(
      fixos.filtros,
      fixos.busca.no,
      filtroSelecao({
        rotulo: 'Grupo',
        opcoes: [{ valor: '', rotulo: 'Todos os grupos' }, ...GRUPOS_DE_OUTRAS_PESSOAS.map((g) => ({ valor: g, rotulo: g }))],
        valor: filtros.grupo,
        aoMudar: (v) => {
          filtros.grupo = v
          desenharResultado()
        },
      }),
      filtroSelecao({
        rotulo: 'Situação',
        opcoes: [
          { valor: 'ativos', rotulo: 'Ativos' },
          { valor: 'inativos', rotulo: 'Desativados' },
          { valor: 'todos', rotulo: 'Todos' },
        ],
        valor: filtros.situacao,
        aoMudar: (v) => {
          filtros.situacao = v
          desenharResultado()
        },
      }),
    )
    if (!dados.outrasPessoas.length) {
      return trocar(
        fixos.resultado,
        estadoVazio({
          titulo: 'Ninguém cadastrado ainda',
          texto: admin ? 'Cadastre a Diretoria e os prestadores de serviço um a um ou importe uma planilha com os nomes.' : 'A Administração cadastra as pessoas aqui.',
          acoes: [admin && botao({ texto: 'Nova pessoa', icone: 'user-plus', variante: 'principal', aoClicar: nova })].filter(Boolean),
        }),
      )
    }
    desenharResultado()
  }

  function desenharResultado() {
    const lista = filtrarOutrasPessoas(dados.outrasPessoas, filtros)
    const baixar = botao({
      texto: 'Baixar lista',
      icone: 'download',
      disabled: !lista.length,
      aoClicar: () =>
        comOcupado(baixar, async () => {
          try {
            const titulo = [TITULO, filtros.grupo, formatarData(hojeISO()).replaceAll('/', '-')].filter(Boolean).join(' ')
            await baixarPlanilha(nomeDeArquivo(titulo), [{ nome: TITULO, cabecalho: CABECALHO_DA_LISTA, linhas: lista.map(linhaDaLista) }])
          } catch (e) {
            avisarErro(e)
          }
        }),
    })
    trocar(
      fixos.resultado,
      el('div', { class: 'pagina__barra' }, el('p', { class: 'texto-suave' }, plural(lista.length, 'pessoa', 'pessoas')), baixar),
      lista.length
        ? tabela({
            itens: lista,
            limite: 200,
            classeDaLinha: (o) => (o.ativo === false ? 'linha--inativa' : null),
            colunas: [
              {
                rotulo: 'Nome',
                principal: true,
                celula: (o) => [el('a', { class: 'tabela__nome', href: endereco('outras-pessoas', o.id) }, o.nome), o.ativo === false && etiqueta('Desativado', 'alerta')],
              },
              { rotulo: 'Grupo', celula: (o) => etiqueta(o.grupo || 'Outro', o.grupo === 'Diretoria' ? 'marinho' : '') },
              { rotulo: 'Empresa ou função', celula: (o) => o.empresa || '' },
              admin && { rotulo: 'Ações', classe: 'tabela__acoes', celula: (o) => acoes(o) },
            ].filter(Boolean),
          })
        : aviso('Ninguém encontrado com esses filtros.'),
    )
  }

  function acoes(o) {
    return el(
      'div',
      { class: 'acoes acoes--juntas' },
      botaoIcone({ icone: 'pencil', rotulo: `Editar ${o.nome}`, aoClicar: () => abrirFormularioOutraPessoa({ outra: o, dados: atuais }) }),
      o.ativo === false
        ? botaoIcone({ icone: 'user-check', rotulo: `Reativar ${o.nome}`, aoClicar: () => mudarAtivo(o, true) })
        : botaoIcone({ icone: 'user-x', rotulo: `Desativar ${o.nome}`, perigo: true, aoClicar: () => mudarAtivo(o, false) }),
    )
  }

  async function mudarAtivo(o, ativo) {
    if (!ativo) {
      const ok = await confirmar({
        titulo: 'Desativar pessoa',
        texto: `${o.nome} deixa de aparecer para adicionar nas listas, mas o histórico fica guardado. Dá para reativar depois.`,
        botaoSim: 'Desativar',
        perigo: true,
      })
      if (!ok) return
    }
    try {
      await definirAtivoOutraPessoa(o.id, ativo)
      avisar(ativo ? `${o.nome} reativado.` : `${o.nome} desativado.`)
    } catch (e) {
      avisarErro(mensagemDeErro(e))
    }
  }

  function desenharFicha() {
    const o = dados.outrasPessoas.find((x) => x.id === id)
    const voltar = { href: '#/outras-pessoas', texto: TITULO }
    if (!o) return trocar(area, cabecalhoPagina({ titulo: 'Pessoa não encontrada', icone: 'briefcase', voltar }))
    if (!fixos.historico) fixos.historico = el('div')
    trocar(
      area,
      cabecalhoPagina({
        titulo: o.nome,
        icone: 'briefcase',
        voltar,
        acoes: admin
          ? [
              botao({ texto: 'Editar', icone: 'pencil', aoClicar: () => abrirFormularioOutraPessoa({ outra: o, dados: atuais }) }),
              o.ativo === false
                ? botao({ texto: 'Reativar', icone: 'user-check', aoClicar: () => mudarAtivo(o, true) })
                : botao({ texto: 'Desativar', icone: 'user-x', variante: 'perigo-claro', aoClicar: () => mudarAtivo(o, false) }),
            ]
          : [],
      }),
      el('div', { class: 'acoes acoes--esquerda' }, o.ativo === false ? etiqueta('Desativado', 'alerta') : etiqueta('Ativo', 'forte')),
      bloco({ titulo: 'Dados', icone: 'badge-check' }, ficha([['Grupo', o.grupo || 'Outro'], ['Empresa ou função', o.empresa || 'Não informada']])),
      fixos.historico,
    )
    if (!pararHistorico) pararHistorico = historicoDaPessoa(fixos.historico, { tipo: 'outro', id: o.id })
  }

  const parar = ouvirFontes(['outrasPessoas', 'colaboradores'], (novos, e) => {
    erro = e
    if (novos) dados = novos
    desenhar()
  })
  desenhar()
  return () => {
    parar()
    pararHistorico?.()
  }
}
