// Check-in da lista, feito no celular durante o evento. Atualiza ao vivo (duas pessoas podem fazer
// check-in ao mesmo tempo) e funciona com internet fraca: o que não subiu fica no aparelho.
import { adicionarNaoConvocado, marcarPresenca } from '../../dados/listas.js'
import { formatarHora } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import {
  TIPOS_DE_PESSOA, contarPresencas, idDaPresenca, presencaDeColaborador, presencaDeConvidado, presencaDeEletricista,
  presencasParaCheckin,
} from '../../lib/listas.js'
import { combinaBusca, compararTexto, formatarNumero, limparEspacos } from '../../lib/texto.js'
import { pode } from '../../lib/papeis.js'
import {
  abrirJanela, aviso, avisar, avisarErro, botao, campo, campoBusca, entradaTexto, etiqueta,
} from '../../ui/componentes.js'
import { el, icone, trocar } from '../../ui/dom.js'
import { abrirFormularioEletricista } from '../eletricistas/formulario.js'

// ctx: { pessoa, lista(), presencas(), pendente(), dados() => { colaboradores, eletricistas } }
export function montarCheckin(caixa, ctx) {
  const estado = { busca: '', filtro: 'todos' }
  const contador = el('div', { class: 'checkin__contador', 'aria-live': 'polite' })
  const filtrosCaixa = el('div', { class: 'checkin__filtros', role: 'group', 'aria-label': 'Mostrar' })
  const situacao = el('p', { class: 'checkin__situacao', role: 'status' })
  const lista = el('ul', { class: 'checkin__lista' })
  const aviso_encerrada = el('div')
  const busca = campoBusca({
    rotulo: 'Buscar participante',
    placeholder: 'Buscar pelo nome',
    grande: true,
    aoDigitar: (v) => {
      estado.busca = v
      desenharLista()
    },
  })
  const adicionar = botao({
    texto: 'Adicionar participante não convocado',
    icone: 'user-plus',
    classe: 'botao--grande checkin__adicionar',
    aoClicar: () => abrirNaoConvocado(ctx),
  })

  caixa.replaceChildren(
    el('section', { class: 'checkin' }, aviso_encerrada, el('div', { class: 'checkin__topo' }, contador, busca.no, filtrosCaixa), situacao, adicionar, lista),
  )

  function desenhar() {
    const aberta = ctx.lista().status === 'aberta'
    const podeFazer = aberta && pode(ctx.pessoa, 'fazerCheckin')
    adicionar.hidden = !podeFazer
    trocar(aviso_encerrada, !aberta && aviso('Lista encerrada: não aceita mais check-in.', { icone: 'lock', erro: true }))
    const presencas = ctx.presencas()
    const conta = contarPresencas(presencas)
    const parte = conta.convocados ? Math.round((conta.presentesConvocados / conta.convocados) * 100) : 0
    trocar(
      contador,
      el(
        'p',
        { class: 'checkin__numeros' },
        el('strong', { class: 'checkin__presentes' }, formatarNumero(conta.presentesConvocados)),
        el('span', { class: 'checkin__de' }, ` / ${formatarNumero(conta.convocados)}`),
        el('span', { class: 'checkin__rotulo' }, ' convocados presentes'),
      ),
      el('div', { class: 'barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(parte), 'aria-label': 'Convocados presentes' }, el('span', { style: { width: `${parte}%` } })),
      conta.naoConvocadosPresentes > 0 && el('p', { class: 'checkin__extra' }, `+ ${formatarNumero(conta.naoConvocadosPresentes)} não ${conta.naoConvocadosPresentes === 1 ? 'convocado presente' : 'convocados presentes'}`),
    )
    const faltam = presencas.filter((p) => !p.presente).length
    trocar(
      filtrosCaixa,
      [
        ['todos', `Todos (${presencas.length})`],
        ['faltam', `Faltam (${faltam})`],
        ['presentes', `Presentes (${presencas.length - faltam})`],
      ].map(([valor, rotulo]) =>
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
          rotulo,
        ),
      ),
    )
    trocar(situacao, ctx.pendente() ? [icone('loader-circle', 'girando'), 'Enviando... Sem internet, os check-ins ficam guardados no aparelho e sobem quando a conexão voltar.'] : '')
    situacao.hidden = !ctx.pendente()
    desenharLista(podeFazer)
  }

  function desenharLista(podeFazer = ctx.lista().status === 'aberta' && pode(ctx.pessoa, 'fazerCheckin')) {
    const itens = presencasParaCheckin(ctx.presencas(), estado)
    if (!ctx.presencas().length) {
      return trocar(lista, el('li', { class: 'checkin__vazio' }, 'Ninguém na lista ainda.', podeFazer ? ' Use o botão acima para adicionar quem chegar.' : ''))
    }
    if (!itens.length) return trocar(lista, el('li', { class: 'checkin__vazio' }, 'Ninguém encontrado.'))
    trocar(lista, itens.map((p) => linha(p, podeFazer)))
  }

  function linha(p, podeFazer) {
    return el(
      'li',
      { class: ['checkin__pessoa', p.presente && 'presente'] },
      el(
        'div',
        { class: 'checkin__info' },
        el('strong', { class: 'checkin__nome' }, p.nome),
        el('span', { class: 'checkin__detalhe' }, etiqueta(TIPOS_DE_PESSOA[p.tipoPessoa] ?? 'Pessoa'), !p.convocado && etiqueta('Não convocado', 'alerta'), p.detalhe),
      ),
      el(
        'div',
        { class: 'checkin__acao' },
        p.presente
          ? [
              el('span', { class: 'checkin__hora' }, icone('circle-check'), `Presente${p.horaCheckin ? ` ${formatarHora(p.horaCheckin)}` : ''}`),
              podeFazer && botao({ texto: 'Desfazer', icone: 'undo-2', classe: 'botao--pequeno', 'aria-label': `Desfazer check-in de ${p.nome}`, aoClicar: () => marcar(p, false) }),
            ]
          : podeFazer
            ? botao({ texto: 'Check-in', icone: 'check', variante: 'principal', classe: 'checkin__botao', 'aria-label': `Fazer check-in de ${p.nome}`, aoClicar: () => marcar(p, true) })
            : el('span', { class: 'texto-suave' }, 'Não veio'),
      ),
    )
  }

  function marcar(p, presente) {
    marcarPresenca(ctx.lista().id, p.id, presente, ctx.pessoa).catch((e) => avisarErro(mensagemDeErro(e)))
    if (presente && estado.busca) {
      // Depois do check-in pela busca, a busca é limpa para a próxima pessoa.
      estado.busca = ''
      busca.entrada.value = ''
      desenharLista()
      busca.entrada.focus()
    }
  }

  desenhar()
  return { atualizar: desenhar }
}

// Janela "Adicionar participante não convocado": pessoa já cadastrada, eletricista novo ou convidado.
function abrirNaoConvocado(ctx) {
  const janela = abrirJanela({ titulo: 'Adicionar participante não convocado', largura: 640 })
  let modo = 'cadastrado'
  const corpo = el('div', { class: 'formulario' })
  const seletor = el('div', { class: 'segmentado', role: 'tablist' })
  janela.corpo.append(seletor, corpo)

  function entrarNaLista(presenca) {
    const { enviado } = adicionarNaoConvocado(ctx.lista().id, presenca, ctx.pessoa)
    enviado.catch((e) => avisarErro(mensagemDeErro(e)))
    avisar(`${presenca.nome} entrou na lista com check-in.`)
  }

  function desenharSeletor() {
    trocar(
      seletor,
      [
        ['cadastrado', 'Já cadastrado', 'user-search'],
        ['eletricista', 'Eletricista novo', 'zap'],
        ['convidado', 'Convidado', 'user-round'],
      ].map(([valor, rotulo, nomeIcone]) =>
        el(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: ['segmentado__opcao', modo === valor && 'ativo'],
            'aria-selected': modo === valor ? 'true' : 'false',
            onClick: () => {
              modo = valor
              desenhar()
            },
          },
          icone(nomeIcone),
          rotulo,
        ),
      ),
    )
  }

  function desenhar() {
    desenharSeletor()
    if (modo === 'cadastrado') desenharCadastrado()
    else if (modo === 'eletricista') desenharEletricistaNovo()
    else desenharConvidado()
    janela.focar()
  }

  function desenharCadastrado() {
    const resultado = el('ul', { class: 'escolha' })
    const busca = campoBusca({
      rotulo: 'Buscar colaborador ou eletricista',
      placeholder: 'Digite o nome do colaborador ou eletricista',
      aoDigitar: (v) => mostrar(v),
    })
    busca.entrada.setAttribute('data-foco', '')
    function mostrar(texto) {
      if (limparEspacos(texto).length < 2) return trocar(resultado, el('li', { class: 'escolha__vazio' }, 'Digite pelo menos duas letras do nome.'))
      const { colaboradores, eletricistas } = ctx.dados()
      const naLista = new Map(ctx.presencas().filter((p) => p.pessoaId).map((p) => [`${p.tipoPessoa}_${p.pessoaId}`, p]))
      const encontrados = [
        ...colaboradores.filter((c) => c.ativo !== false && combinaBusca(c.nome, texto)).map((c) => ({ tipo: 'colaborador', pessoa: c, presenca: presencaDeColaborador(c, false) })),
        ...eletricistas.filter((e) => e.ativo !== false && combinaBusca(e.nome, texto)).map((e) => ({ tipo: 'eletricista', pessoa: e, presenca: presencaDeEletricista(e, false) })),
      ]
        .sort((a, b) => compararTexto(a.pessoa.nome, b.pessoa.nome))
        .slice(0, 30)
      if (!encontrados.length) {
        return trocar(resultado, el('li', { class: 'escolha__vazio' }, 'Ninguém encontrado. Se for um eletricista sem cadastro, use "Eletricista novo".'))
      }
      trocar(
        resultado,
        encontrados.map(({ tipo, pessoa, presenca }) => {
          const atual = naLista.get(idDaPresenca(tipo, pessoa.id))
          let acao
          if (atual?.presente) acao = el('span', { class: 'checkin__hora' }, icone('circle-check'), 'Já está presente')
          else if (atual) {
            acao = botao({
              texto: 'Fazer check-in',
              icone: 'check',
              variante: 'principal',
              classe: 'botao--pequeno',
              aoClicar: () => {
                marcarPresenca(ctx.lista().id, atual.id, true, ctx.pessoa).catch((e) => avisarErro(mensagemDeErro(e)))
                avisar(`Check-in de ${pessoa.nome} feito.`)
                janela.fechar()
              },
            })
          } else {
            acao = botao({
              texto: 'Adicionar',
              icone: 'plus',
              variante: 'principal',
              classe: 'botao--pequeno',
              aoClicar: () => {
                entrarNaLista(presenca)
                janela.fechar()
              },
            })
          }
          return el(
            'li',
            { class: 'escolha__item' },
            el('div', {}, el('strong', {}, pessoa.nome), el('span', { class: 'tabela__detalhe' }, etiqueta(TIPOS_DE_PESSOA[tipo]), ' ', presenca.detalhe, atual && !atual.presente ? ' · já convocado' : '')),
            acao,
          )
        }),
      )
    }
    mostrar('')
    trocar(corpo, busca.no, resultado)
  }

  function desenharEletricistaNovo() {
    trocar(
      corpo,
      el('p', {}, 'Cadastre o eletricista na hora, com a autorização LGPD. Ele entra na lista já com check-in.'),
      el(
        'div',
        { class: 'acoes acoes--esquerda' },
        botao({
          texto: 'Cadastrar eletricista novo',
          icone: 'user-plus',
          variante: 'principal',
          'data-foco': true,
          aoClicar: () => {
            janela.fechar()
            abrirFormularioEletricista({
              titulo: 'Eletricista novo na lista',
              dados: () => ctx.dados(),
              aoSalvar: (id, dados) => entrarNaLista(presencaDeEletricista({ id, ...dados }, false)),
            })
          },
        }),
      ),
    )
  }

  function desenharConvidado() {
    const nome = campo({ rotulo: 'Nome do convidado', entrada: entradaTexto({ maxlength: 120, 'data-foco': true }) })
    const formulario = el(
      'form',
      { class: 'formulario', novalidate: true },
      el('p', { class: 'texto-suave' }, 'Para quem não é colaborador nem eletricista: só o nome, sem cadastro.'),
      nome.no,
      el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Adicionar convidado', icone: 'plus', variante: 'principal', tipo: 'submit' })),
    )
    formulario.addEventListener('submit', (e) => {
      e.preventDefault()
      const texto = limparEspacos(nome.entrada.value)
      if (!texto) return nome.mostrarErro('Informe o nome.')
      entrarNaLista(presencaDeConvidado(texto.slice(0, 120)))
      janela.fechar()
    })
    trocar(corpo, formulario)
  }

  desenhar()
}
