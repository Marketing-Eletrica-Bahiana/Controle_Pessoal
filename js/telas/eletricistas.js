// Aba Eletricistas do CAE: lista com busca e filtro por vendedor, ficha, cadastro e importação.
// Endereços: #/eletricistas e #/eletricistas/{id}
import { definirAtivoEletricista } from '../dados/eletricistas.js'
import { ouvirFontes } from '../dados/fontes.js'
import {
  CABECALHO_DA_LISTA, SEM_VENDEDOR, dataDoCadastro, filtrarEletricistas, formatarWhatsapp, linhaDaLista, linkDoWhatsapp,
  vendedoresDosEletricistas,
} from '../lib/eletricistas.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { mensagemDeErro } from '../lib/erros.js'
import { pode } from '../lib/papeis.js'
import { endereco } from '../lib/rotas.js'
import { nomeDeArquivo, plural } from '../lib/texto.js'
import {
  aviso, avisar, avisarErro, blocoDeErro, bloco, botao, botaoIcone, cabecalhoPagina, campoBusca, carregando, comOcupado, confirmar,
  estadoVazio, etiqueta, ficha, filtroSelecao, listaComLimite, tabela,
} from '../ui/componentes.js'
import { el, icone, trocar } from '../ui/dom.js'
import { baixarPlanilha } from '../ui/planilha.js'
import { abrirFormularioEletricista, abrirImportacaoEletricistas } from './eletricistas/formulario.js'
import { historicoDaPessoa } from './listas/historico.js'

const filtros = { busca: '', vendedor: '', situacao: 'ativos' }

export const botaoWhatsapp = (e) =>
  e.whatsapp
    ? el(
        'a',
        { class: 'botao botao--pequeno botao--whatsapp', href: linkDoWhatsapp(e.whatsapp), target: '_blank', rel: 'noopener', title: `Abrir conversa com ${e.nome} no WhatsApp` },
        icone('message-circle'),
        el('span', {}, formatarWhatsapp(e.whatsapp)),
      )
    : el('span', { class: 'texto-suave' }, e.consentimentoLgpd ? 'Sem WhatsApp' : 'Sem autorização')

export function montar(raiz, { pessoa, params }) {
  const [id] = params
  const admin = pode(pessoa, 'editarCadastros')
  const podeCadastrar = pode(pessoa, 'cadastrarEletricista')
  let dados = null
  let erro = null
  const atuais = () => dados ?? { eletricistas: [], colaboradores: [] }
  const area = el('div', { class: 'pagina' })
  raiz.replaceChildren(area)
  const fixos = {}
  let pararHistorico = null

  function desenhar() {
    if (erro) return trocar(area, blocoDeErro(erro))
    if (!dados) return trocar(area, carregando())
    if (id) desenharFicha()
    else desenharLista()
  }

  function novoEletricista() {
    abrirFormularioEletricista({ dados: atuais })
  }

  function desenharLista() {
    if (!fixos.resultado || !area.contains(fixos.resultado)) {
      fixos.filtros = el('div', { class: 'filtros' })
      fixos.resultado = el('div', { class: 'pagina__resultado' })
      fixos.busca = campoBusca({
        valor: filtros.busca,
        aoDigitar: (v) => {
          filtros.busca = v
          desenharResultado()
        },
      })
      trocar(
        area,
        cabecalhoPagina({
          titulo: 'Eletricistas do CAE',
          icone: 'zap',
          descricao: 'Eletricistas do CAE, com o vendedor de cada um. O WhatsApp só fica salvo com a autorização (LGPD).',
          acoes: [
            admin && botao({ texto: 'Importar planilha', icone: 'file-spreadsheet', aoClicar: () => abrirImportacaoEletricistas({ dados: atuais }) }),
            podeCadastrar && botao({ texto: 'Novo eletricista', icone: 'user-plus', variante: 'principal', aoClicar: novoEletricista }),
          ],
        }),
        fixos.filtros,
        fixos.resultado,
      )
    }
    const vendedores = vendedoresDosEletricistas(dados.eletricistas)
    if (filtros.vendedor && filtros.vendedor !== SEM_VENDEDOR && !vendedores.includes(filtros.vendedor)) filtros.vendedor = ''
    trocar(
      fixos.filtros,
      fixos.busca.no,
      filtroSelecao({
        rotulo: 'Vendedor',
        opcoes: [{ valor: '', rotulo: 'Todos os vendedores' }, ...vendedores, { valor: SEM_VENDEDOR, rotulo: 'Sem vendedor' }],
        valor: filtros.vendedor,
        aoMudar: (v) => {
          filtros.vendedor = v
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
    if (!dados.eletricistas.length) {
      return trocar(
        fixos.resultado,
        estadoVazio({
          titulo: 'Nenhum eletricista cadastrado ainda',
          texto: admin ? 'Importe a planilha do CAE ou cadastre um de cada vez.' : 'Cadastre o primeiro com o botão Novo eletricista.',
          acoes: [podeCadastrar && botao({ texto: 'Novo eletricista', icone: 'user-plus', variante: 'principal', aoClicar: novoEletricista })].filter(Boolean),
        }),
      )
    }
    desenharResultado()
  }

  function desenharResultado() {
    const lista = filtrarEletricistas(dados.eletricistas, filtros)
    const baixar = botao({
      texto: 'Baixar lista',
      icone: 'download',
      disabled: !lista.length,
      aoClicar: () =>
        comOcupado(baixar, async () => {
          try {
            const vendedor = filtros.vendedor === SEM_VENDEDOR ? 'Sem vendedor' : filtros.vendedor
            const titulo = ['Eletricistas CAE', vendedor, formatarData(hojeISO()).replaceAll('/', '-')].filter(Boolean).join(' ')
            await baixarPlanilha(nomeDeArquivo(titulo), [{ nome: 'Eletricistas', cabecalho: CABECALHO_DA_LISTA, linhas: lista.map(linhaDaLista) }])
          } catch (e) {
            avisarErro(e)
          }
        }),
    })
    trocar(
      fixos.resultado,
      el('div', { class: 'pagina__barra' }, el('p', { class: 'texto-suave' }, plural(lista.length, 'eletricista', 'eletricistas')), baixar),
      lista.length
        ? listaComLimite(lista, (itens) =>
            tabela({
              itens,
              classeDaLinha: (e) => (e.ativo === false ? 'linha--inativa' : null),
              colunas: [
                {
                  rotulo: 'Nome',
                  principal: true,
                  celula: (e) => [el('a', { class: 'tabela__nome', href: endereco('eletricistas', e.id) }, e.nome), e.ativo === false && etiqueta('Desativado', 'alerta')],
                },
                { rotulo: 'WhatsApp', celula: botaoWhatsapp },
                { rotulo: 'Vendedor', celula: (e) => e.vendedorNome || 'Sem vendedor' },
                { rotulo: 'LGPD', celula: (e) => (e.consentimentoLgpd ? etiqueta('Autorizou', 'forte') : etiqueta('Não autorizou', 'alerta')) },
                { rotulo: 'Cadastro', classe: 'numero', celula: (e) => dataDoCadastro(e.dataCadastro) },
                admin && { rotulo: 'Ações', classe: 'tabela__acoes', celula: (e) => acoes(e) },
              ].filter(Boolean),
            }),
          )
        : aviso('Ninguém encontrado com esses filtros.'),
    )
  }

  function acoes(e) {
    return el(
      'div',
      { class: 'acoes acoes--juntas' },
      botaoIcone({ icone: 'pencil', rotulo: `Editar ${e.nome}`, aoClicar: () => abrirFormularioEletricista({ eletricista: e, dados: atuais }) }),
      e.ativo === false
        ? botaoIcone({ icone: 'user-check', rotulo: `Reativar ${e.nome}`, aoClicar: () => mudarAtivo(e, true) })
        : botaoIcone({ icone: 'user-x', rotulo: `Desativar ${e.nome}`, perigo: true, aoClicar: () => mudarAtivo(e, false) }),
    )
  }

  async function mudarAtivo(e, ativo) {
    if (!ativo) {
      const ok = await confirmar({
        titulo: 'Desativar eletricista',
        texto: `${e.nome} deixa de aparecer nas buscas e nas novas listas, mas o histórico de participação fica guardado. Dá para reativar depois.`,
        botaoSim: 'Desativar',
        perigo: true,
      })
      if (!ok) return
    }
    try {
      await definirAtivoEletricista(e.id, ativo)
      avisar(ativo ? `Cadastro de ${e.nome} reativado.` : `Cadastro de ${e.nome} desativado.`)
    } catch (erroAoSalvar) {
      avisar(mensagemDeErro(erroAoSalvar), { erro: true })
    }
  }

  function desenharFicha() {
    const e = dados.eletricistas.find((x) => x.id === id)
    if (!e) return trocar(area, cabecalhoPagina({ titulo: 'Eletricista não encontrado', icone: 'zap', voltar: { href: '#/eletricistas', texto: 'Eletricistas do CAE' } }))
    const vendedor = dados.colaboradores.find((c) => c.id === e.vendedorId)
    if (!fixos.historico) fixos.historico = el('div')
    trocar(
      area,
      cabecalhoPagina({
        titulo: e.nome,
        icone: 'zap',
        voltar: { href: '#/eletricistas', texto: 'Eletricistas do CAE' },
        acoes: admin
          ? [
              botao({ texto: 'Editar', icone: 'pencil', aoClicar: () => abrirFormularioEletricista({ eletricista: e, dados: atuais }) }),
              e.ativo === false
                ? botao({ texto: 'Reativar', icone: 'user-check', aoClicar: () => mudarAtivo(e, true) })
                : botao({ texto: 'Desativar', icone: 'user-x', variante: 'perigo-claro', aoClicar: () => mudarAtivo(e, false) }),
            ]
          : [],
      }),
      el('div', { class: 'acoes acoes--esquerda' }, e.ativo === false ? etiqueta('Desativado', 'alerta') : etiqueta('Ativo', 'forte')),
      bloco(
        { titulo: 'Dados', icone: 'badge-check' },
        ficha([
          ['WhatsApp', botaoWhatsapp(e)],
          ['Vendedor', vendedor ? el('a', { href: endereco('colaboradores', 'ficha', vendedor.id) }, e.vendedorNome) : e.vendedorNome || 'Sem vendedor'],
          ['Autorizou o uso dos dados (LGPD)', e.consentimentoLgpd ? `Sim, em ${dataDoCadastro(e.dataConsentimento) || 'data não registrada'}` : 'Não'],
          ['Cadastro', dataDoCadastro(e.dataCadastro)],
        ]),
      ),
      fixos.historico,
    )
    if (!pararHistorico) pararHistorico = historicoDaPessoa(fixos.historico, { tipo: 'eletricista', id: e.id })
  }

  const parar = ouvirFontes(['eletricistas', 'colaboradores'], (novos, e) => {
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
