// Check-in da lista, feito no celular durante o evento. Atualiza ao vivo (duas pessoas podem fazer
// check-in ao mesmo tempo) e funciona com internet fraca: o que não subiu fica no aparelho.
import { adicionarNaoConvocado, marcarPresenca, marcarSituacao } from '../../dados/listas.js'
import { formatarHora } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import {
  LIMITE_DA_OBSERVACAO, SITUACOES_DO_CHECKIN, TIPOS_DE_PESSOA, contarPresencas, idDaPresenca, limparObservacao, presencaDeColaborador,
  presencaDeConvidado, presencaDeEletricista, presencasParaCheckin, rotuloDaSituacao, situacaoNoCheckin,
} from '../../lib/listas.js'
import { combinaBusca, compararTexto, formatarNumero, limparEspacos } from '../../lib/texto.js'
import { pode } from '../../lib/papeis.js'
import {
  abrirJanela, aviso, avisar, avisarErro, botao, campo, campoBusca, entradaTexto, etiqueta,
} from '../../ui/componentes.js'
import { el, icone, trocar } from '../../ui/dom.js'
import { abrirFormularioEletricista } from '../eletricistas/formulario.js'
import { abrirPlanilhaNaLista } from './planilha.js'

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
  // Subir o Excel direto daqui (a mesma janela de Convocados). Só o admin: quem entra pela planilha vira convocado.
  const admin = pode(ctx.pessoa, 'gerenciarListas')
  const importar = admin && botao({
    texto: 'Importar planilha',
    icone: 'file-spreadsheet',
    classe: 'botao--grande checkin__adicionar',
    aoClicar: () => abrirPlanilhaNaLista(ctx),
  })
  const botoes = el('div', { class: 'checkin__botoes' }, adicionar, importar)

  caixa.replaceChildren(
    el('section', { class: 'checkin' }, aviso_encerrada, el('div', { class: 'checkin__topo' }, contador, busca.no, filtrosCaixa), situacao, botoes, lista),
  )

  function desenhar() {
    const aberta = ctx.lista().status === 'aberta'
    const podeFazer = aberta && pode(ctx.pessoa, 'fazerCheckin')
    adicionar.hidden = !podeFazer
    botoes.hidden = !podeFazer && !importar
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
      const dica = podeFazer && importar
        ? ' Use os botões acima para adicionar quem chegar ou importar uma planilha.'
        : podeFazer
          ? ' Use o botão acima para adicionar quem chegar.'
          : importar
            ? ' Use o botão acima para importar uma planilha.'
            : ''
      return trocar(lista, el('li', { class: 'checkin__vazio' }, 'Ninguém na lista ainda.', dica))
    }
    if (!itens.length) return trocar(lista, el('li', { class: 'checkin__vazio' }, 'Ninguém encontrado.'))
    trocar(lista, itens.map((p) => linha(p, podeFazer)))
  }

  // Abrir o nome (quem pode marcar): Participou, Não participou, Outros ou sem marcação, e a observação. Na lista
  // encerrada, só o admin (as regras deixam o organizador mexer só na lista aberta).
  const podeMarcarSituacao = (podeFazer) => podeFazer || pode(ctx.pessoa, 'gerenciarListas')

  function linha(p, podeFazer) {
    const situacao = situacaoNoCheckin(p)
    const nome = podeMarcarSituacao(podeFazer)
      ? el(
          'button',
          { type: 'button', class: 'checkin__nome checkin__nome--botao', title: 'Marcar situação e observação', onClick: () => abrirSituacao(ctx, p.id) },
          p.nome,
          icone('pencil'),
        )
      : el('strong', { class: 'checkin__nome' }, p.nome)
    return el(
      'li',
      { class: ['checkin__pessoa', p.presente && 'presente'] },
      el(
        'div',
        { class: 'checkin__info' },
        nome,
        el('span', { class: 'checkin__detalhe' }, etiqueta(TIPOS_DE_PESSOA[p.tipoPessoa] ?? 'Pessoa'), !p.convocado && etiqueta('Não convocado', 'alerta'), p.detalhe),
        p.observacao && el('span', { class: 'checkin__observacao' }, icone('message-circle'), p.observacao),
      ),
      el(
        'div',
        { class: 'checkin__acao' },
        p.presente
          ? [
              el('span', { class: 'checkin__hora' }, icone('circle-check'), `Presente${p.horaCheckin ? ` ${formatarHora(p.horaCheckin)}` : ''}`),
              podeFazer && botao({ texto: 'Desfazer', icone: 'undo-2', classe: 'botao--pequeno', 'aria-label': `Desfazer check-in de ${p.nome}`, aoClicar: () => marcar(p, false) }),
            ]
          : [
              situacao && etiqueta(rotuloDaSituacao(situacao), situacao === 'nao_participou' ? 'alerta' : 'marinho'),
              podeFazer
                ? botao({ texto: 'Check-in', icone: 'check', variante: 'principal', classe: 'checkin__botao', 'aria-label': `Fazer check-in de ${p.nome}`, aoClicar: () => marcar(p, true) })
                : !situacao && el('span', { class: 'texto-suave' }, 'Não participou'),
            ],
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

// Janela aberta pelo nome da pessoa no check-in: situação (Participou, Não participou, Outros ou sem marcação) e
// observação. Não espera o servidor, como o check-in.
function abrirSituacao(ctx, presencaId) {
  const atual = ctx.presencas().find((p) => p.id === presencaId)
  if (!atual) return
  const janela = abrirJanela({ titulo: atual.nome, largura: 560 })
  let escolhida = situacaoNoCheckin(atual)
  const botoes = SITUACOES_DO_CHECKIN.map((s) =>
    el(
      'button',
      {
        type: 'button',
        class: ['segmentado__opcao', `status--${s.valor || 'pendente'}`],
        'aria-pressed': 'false',
        onClick: () => {
          escolhida = s.valor
          marcarBotoes()
        },
      },
      icone(s.icone),
      s.rotulo,
    ),
  )
  const marcarBotoes = () =>
    botoes.forEach((b, i) => {
      const ativo = SITUACOES_DO_CHECKIN[i].valor === escolhida
      b.classList.toggle('ativo', ativo)
      b.setAttribute('aria-pressed', ativo ? 'true' : 'false')
    })
  marcarBotoes()
  const observacao = el('textarea', {
    rows: 3,
    maxlength: LIMITE_DA_OBSERVACAO,
    placeholder: 'Ex.: estava de férias, atestado médico, chegou atrasado',
    value: atual.observacao ?? '',
  })
  const salvar = botao({ texto: 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
  const formulario = el(
    'form',
    { class: 'formulario', novalidate: true },
    el('p', { class: 'texto-suave' }, etiqueta(TIPOS_DE_PESSOA[atual.tipoPessoa] ?? 'Pessoa'), ' ', atual.detalhe ?? ''),
    el('fieldset', { class: 'campo' }, el('legend', { class: 'campo__rotulo' }, 'Situação'), el('div', { class: 'segmentado controle__status', role: 'group', 'aria-label': 'Situação' }, botoes)),
    campo({ rotulo: 'Observação', opcional: true, entrada: observacao, ajuda: `Até ${LIMITE_DA_OBSERVACAO} letras. Em "Outros", conte o motivo aqui.` }).no,
    el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
  )
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault()
    // Usa a presença mais recente (outra pessoa pode ter feito o check-in enquanto a janela estava aberta).
    const agora = ctx.presencas().find((p) => p.id === presencaId) ?? atual
    const texto = limparObservacao(observacao.value)
    if (escolhida === situacaoNoCheckin(agora) && texto === (agora.observacao ?? '')) return janela.fechar()
    marcarSituacao(ctx.lista().id, agora, escolhida, texto, ctx.pessoa).catch((e) => avisarErro(mensagemDeErro(e)))
    avisar(`${agora.nome}: ${rotuloDaSituacao(escolhida) || 'sem marcação'}.`)
    janela.fechar()
  })
  janela.corpo.append(formulario)
  janela.focar()
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
