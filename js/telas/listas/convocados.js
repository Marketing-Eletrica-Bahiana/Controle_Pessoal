// Aba Convocados da lista: o admin monta quem foi chamado (colaboradores, eletricistas e pessoas
// de fornecedor); a organização só vê.
import { LOJAS } from '../../config.js'
import { salvarPessoaDoFornecedor } from '../../dados/fornecedores.js'
import { adicionarConvocados, removerPresenca } from '../../dados/listas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { vendedoresDosEletricistas } from '../../lib/eletricistas.js'
import { FUNCOES_DO_FORNECEDOR, pessoasDoFornecedor } from '../../lib/fornecedores.js'
import {
  TIPOS_DE_PESSOA, fornecedorJaNaLista, idDaPresenca, pessoasNaLista, presencaDeColaborador, presencaDeEletricista, presencaDeFornecedor,
} from '../../lib/listas.js'
import { pode } from '../../lib/papeis.js'
import { combinaBusca, compararTexto, limparEspacos, normalizar, plural } from '../../lib/texto.js'
import {
  abrirJanela, aviso, avisar, avisarErro, botao, botaoIcone, caixaDeMarcar, campo, campoBusca, comOcupado, confirmar,
  entradaTexto, etiqueta, listaComLimite, selecao, tabela,
} from '../../ui/componentes.js'
import { el, icone, trocar } from '../../ui/dom.js'
import { campoEscolherPessoa } from '../../ui/escolherPessoa.js'

const PLURAIS = {
  colaborador: ['colaborador', 'colaboradores'],
  eletricista: ['eletricista', 'eletricistas'],
  fornecedor: ['pessoa de fornecedor', 'pessoas de fornecedor'],
  convidado: ['convidado', 'convidados'],
}

// ctx: { pessoa, lista(), presencas(), dados() => { colaboradores, setores, eletricistas, fornecedores } }
export function montarConvocados(caixa, ctx) {
  const admin = pode(ctx.pessoa, 'gerenciarListas')
  const conteudo = el('div', { class: 'pagina__resultado' })
  caixa.replaceChildren(conteudo)

  function desenhar() {
    const presencas = ctx.presencas()
    const contagem = Object.keys(TIPOS_DE_PESSOA).map((tipo) => [tipo, presencas.filter((p) => p.tipoPessoa === tipo && p.convocado).length])
    const naoConvocados = presencas.filter((p) => !p.convocado).length
    trocar(
      conteudo,
      admin &&
        el(
          'div',
          { class: 'acoes acoes--esquerda' },
          botao({ texto: 'Adicionar colaboradores', icone: 'users', variante: 'principal', aoClicar: () => abrirColaboradores(ctx) }),
          botao({ texto: 'Adicionar eletricistas', icone: 'zap', aoClicar: () => abrirEletricistas(ctx) }),
          botao({ texto: 'Adicionar pessoa de fornecedor', icone: 'handshake', aoClicar: () => abrirFornecedor(ctx) }),
        ),
      el(
        'p',
        { class: 'resumo-tipos' },
        contagem.filter(([, n]) => n).map(([tipo, n]) => etiqueta(plural(n, ...PLURAIS[tipo]))),
        naoConvocados > 0 && etiqueta(plural(naoConvocados, 'não convocado', 'não convocados'), 'alerta'),
      ),
      presencas.length
        ? tabela({
              itens: [...presencas].sort((a, b) => compararTexto(a.nome, b.nome)),
              limite: 200,
              colunas: [
                { rotulo: 'Nome', principal: true, celula: (p) => [el('span', { class: 'tabela__nome' }, p.nome), el('span', { class: 'tabela__detalhe' }, p.detalhe)] },
                { rotulo: 'Tipo', celula: (p) => TIPOS_DE_PESSOA[p.tipoPessoa] ?? '' },
                { rotulo: 'Convocado', celula: (p) => (p.convocado ? 'Sim' : etiqueta('Não convocado', 'alerta')) },
                { rotulo: 'Presente', celula: (p) => (p.presente ? etiqueta('Presente', 'forte') : 'Não') },
                admin && {
                  rotulo: 'Ações',
                  classe: 'tabela__acoes',
                  celula: (p) => botaoIcone({ icone: 'trash-2', rotulo: `Tirar ${p.nome} da lista`, perigo: true, aoClicar: () => tirar(p) }),
                },
              ].filter(Boolean),
            })
        : aviso(admin ? 'Ninguém convocado ainda. Use os botões acima para montar a lista.' : 'Ninguém convocado ainda.'),
    )
  }

  async function tirar(p) {
    const ok = await confirmar({
      titulo: 'Tirar da lista',
      texto: p.presente ? `${p.nome} já fez check-in. Tirar da lista apaga essa presença.` : `Tirar ${p.nome} da lista?`,
      botaoSim: 'Tirar da lista',
      perigo: true,
    })
    if (!ok) return
    try {
      await removerPresenca(ctx.lista().id, p.id)
      avisar(`${p.nome} saiu da lista.`)
    } catch (e) {
      avisarErro(mensagemDeErro(e))
    }
  }

  desenhar()
  return { atualizar: desenhar }
}

async function gravar(ctx, novas, janela, botaoAlvo) {
  if (!novas.length) return
  await comOcupado(botaoAlvo, async () => {
    try {
      await adicionarConvocados(ctx.lista().id, novas)
      avisar(`${plural(novas.length, 'pessoa convocada', 'pessoas convocadas')}.`)
      janela?.fechar()
    } catch (e) {
      avisarErro(mensagemDeErro(e))
    }
  })
}

// Colaboradores: um a um, um setor inteiro ou uma loja inteira.
function abrirColaboradores(ctx) {
  const janela = abrirJanela({ titulo: 'Adicionar colaboradores', largura: 720 })
  let modo = 'individual'
  const escolhidos = new Set()
  const corpo = el('div', { class: 'formulario' })
  janela.corpo.append(corpo)

  const ativos = () => ctx.dados().colaboradores.filter((c) => c.ativo !== false).sort((a, b) => compararTexto(a.nome, b.nome))
  const jaNaLista = () => pessoasNaLista(ctx.presencas())
  const fora = (c) => !jaNaLista().has(idDaPresenca('colaborador', c.id))

  function desenhar() {
    const seletor = el(
      'div',
      { class: 'segmentado', role: 'tablist' },
      [
        ['individual', 'Um a um', 'user-round'],
        ['setor', 'Setor inteiro', 'building-2'],
        ['loja', 'Loja inteira', 'store'],
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
    if (modo === 'individual') trocar(corpo, seletor, ...individual())
    else trocar(corpo, seletor, ...grupo(modo))
  }

  function individual() {
    const resultado = el('div', { class: 'escolha escolha--rolavel' })
    const total = el('span')
    const adicionar = botao({ texto: 'Adicionar', icone: 'plus', variante: 'principal', aoClicar: () => gravar(ctx, ativos().filter((c) => escolhidos.has(c.id)).map((c) => presencaDeColaborador(c)), janela, adicionar) })
    const atualizarTotal = () => {
      trocar(total, plural(escolhidos.size, 'escolhido', 'escolhidos'))
      adicionar.disabled = !escolhidos.size
    }
    let texto = ''
    const busca = campoBusca({
      placeholder: 'Buscar colaborador pelo nome',
      aoDigitar: (v) => {
        texto = v
        mostrar()
      },
    })
    busca.entrada.setAttribute('data-foco', '')
    function mostrar() {
      const lista = ativos().filter((c) => combinaBusca(c.nome, texto))
      trocar(
        resultado,
        lista.length
          ? listaComLimite(lista, (itens) =>
              el(
                'div',
                {},
                itens.map((c) => {
                  const naLista = !fora(c)
                  const caixaDeMarca = caixaDeMarcar({
                    rotulo: c.nome,
                    marcada: naLista || escolhidos.has(c.id),
                    disabled: naLista,
                    aoMudar: (marcada) => {
                      if (marcada) escolhidos.add(c.id)
                      else escolhidos.delete(c.id)
                      atualizarTotal()
                    },
                  })
                  return el('div', { class: 'escolha__item' }, caixaDeMarca.no, el('span', { class: 'tabela__detalhe' }, naLista ? 'Já está na lista' : [c.setor || 'Sem setor', c.loja].filter(Boolean).join(' · ')))
                }),
              ),
            { passo: 100 })
          : el('p', { class: 'texto-suave' }, 'Ninguém encontrado.'),
      )
    }
    mostrar()
    atualizarTotal()
    return [busca.no, resultado, el('div', { class: 'janela-modal__acoes janela-modal__acoes--entre' }, total, el('div', { class: 'acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), adicionar))]
  }

  function grupo(tipo) {
    const opcoes =
      tipo === 'setor'
        ? [...ctx.dados().setores].sort((a, b) => compararTexto(a.nome, b.nome)).map((s) => ({ valor: s.nome, rotulo: s.nome }))
        : LOJAS.map((l) => ({ valor: l, rotulo: l }))
    const escolha = selecao([{ valor: '', rotulo: tipo === 'setor' ? 'Escolha o setor' : 'Escolha a loja' }, ...opcoes], '', { 'data-foco': true })
    const previa = el('div')
    const adicionar = botao({ texto: 'Adicionar', icone: 'plus', variante: 'principal', disabled: true })
    let pessoas = []
    escolha.addEventListener('change', () => {
      const valor = escolha.value
      const todos = valor ? ativos().filter((c) => (tipo === 'setor' ? normalizar(c.setor) === normalizar(valor) : c.loja === valor)) : []
      pessoas = todos.filter(fora)
      adicionar.disabled = !pessoas.length
      trocar(adicionar, icone('plus'), el('span', {}, pessoas.length ? `Adicionar ${plural(pessoas.length, 'pessoa', 'pessoas')}` : 'Adicionar'))
      trocar(
        previa,
        valor &&
          (todos.length
            ? el(
                'div',
                { class: 'formulario' },
                aviso(`${plural(todos.length, 'colaborador ativo', 'colaboradores ativos')}${todos.length - pessoas.length ? `, ${plural(todos.length - pessoas.length, 'já está', 'já estão')} na lista` : ''}.`),
                pessoas.length > 0 && el('p', { class: 'texto-suave texto-pequeno' }, pessoas.map((c) => c.nome).join(', ')),
              )
            : aviso('Nenhum colaborador ativo aqui.', { erro: true })),
      )
    })
    adicionar.addEventListener('click', () => gravar(ctx, pessoas.map((c) => presencaDeColaborador(c)), janela, adicionar))
    return [
      campo({ rotulo: tipo === 'setor' ? 'Setor' : 'Loja', entrada: escolha }).no,
      el('p', { class: 'campo__ajuda' }, 'Uma lista pode misturar pessoas de vários setores e lojas: dá para adicionar mais depois.'),
      previa,
      el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), adicionar),
    ]
  }

  desenhar()
  janela.focar()
}

function abrirEletricistas(ctx) {
  const janela = abrirJanela({ titulo: 'Adicionar eletricistas', largura: 720 })
  const escolhidos = new Set()
  let texto = ''
  let vendedor = ''
  const ativos = () => ctx.dados().eletricistas.filter((e) => e.ativo !== false).sort((a, b) => compararTexto(a.nome, b.nome))
  const jaNaLista = () => pessoasNaLista(ctx.presencas())
  const resultado = el('div', { class: 'escolha escolha--rolavel' })
  const total = el('span')
  const adicionar = botao({ texto: 'Adicionar', icone: 'plus', variante: 'principal', aoClicar: () => gravar(ctx, ativos().filter((e) => escolhidos.has(e.id)).map((e) => presencaDeEletricista(e)), janela, adicionar) })
  const atualizarTotal = () => {
    trocar(total, plural(escolhidos.size, 'escolhido', 'escolhidos'))
    adicionar.disabled = !escolhidos.size
  }
  const visiveis = () =>
    ativos()
      .filter((e) => combinaBusca(e.nome, texto))
      .filter((e) => !vendedor || normalizar(e.vendedorNome) === normalizar(vendedor))
      .filter((e) => !jaNaLista().has(idDaPresenca('eletricista', e.id)))

  const busca = campoBusca({
    placeholder: 'Buscar eletricista pelo nome',
    aoDigitar: (v) => {
      texto = v
      mostrar()
    },
  })
  busca.entrada.setAttribute('data-foco', '')
  const filtroVendedor = selecao([{ valor: '', rotulo: 'Todos os vendedores' }, ...vendedoresDosEletricistas(ctx.dados().eletricistas)], '', {
    'aria-label': 'Vendedor',
    onChange: (e) => {
      vendedor = e.target.value
      mostrar()
    },
  })
  const todos = botao({
    texto: 'Marcar todos os mostrados',
    icone: 'list-checks',
    classe: 'botao--pequeno',
    aoClicar: () => {
      visiveis().forEach((e) => escolhidos.add(e.id))
      mostrar()
      atualizarTotal()
    },
  })

  function mostrar() {
    const lista = visiveis()
    trocar(
      resultado,
      lista.length
        ? listaComLimite(lista, (itens) =>
            el(
              'div',
              {},
              itens.map((e) =>
                el(
                  'div',
                  { class: 'escolha__item' },
                  caixaDeMarcar({
                    rotulo: e.nome,
                    marcada: escolhidos.has(e.id),
                    aoMudar: (marcada) => {
                      if (marcada) escolhidos.add(e.id)
                      else escolhidos.delete(e.id)
                      atualizarTotal()
                    },
                  }).no,
                  el('span', { class: 'tabela__detalhe' }, e.vendedorNome ? `Vendedor: ${e.vendedorNome}` : 'Sem vendedor'),
                ),
              ),
            ),
          { passo: 100 })
        : el('p', { class: 'texto-suave' }, 'Ninguém para adicionar com esse filtro (quem já está na lista não aparece).'),
    )
  }
  mostrar()
  atualizarTotal()
  janela.corpo.append(
    el(
      'div',
      { class: 'formulario' },
      el('div', { class: 'filtros' }, busca.no, el('div', { class: 'campo campo--compacto' }, filtroVendedor)),
      el('div', { class: 'acoes acoes--esquerda' }, todos),
      resultado,
      el('div', { class: 'janela-modal__acoes janela-modal__acoes--entre' }, total, el('div', { class: 'acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), adicionar)),
    ),
  )
  janela.focar()
}

// Pessoa de fornecedor (palestrante, representante ou convidado da marca): escolhida entre as pessoas da ficha da
// marca ou digitada, sempre com a função. Quem é digitado pode ficar guardado na ficha para as próximas listas.
function abrirFornecedor(ctx) {
  const janela = abrirJanela({ titulo: 'Adicionar pessoa de fornecedor', largura: 560 })
  const marcas = ctx.dados().fornecedores.filter((f) => f.ativo !== false).sort((a, b) => compararTexto(a.nome, b.nome))
  const naLista = new Set(ctx.lista().fornecedores ?? [])
  const marca = campo({
    rotulo: 'Marca',
    entrada: selecao([{ valor: '', rotulo: 'Escolha a marca' }, ...marcas.map((f) => ({ valor: f.id, rotulo: f.nome }))], marcas.find((f) => naLista.has(f.id))?.id ?? ''),
  })
  // Sempre na versão mais nova: quem acabou de ser guardado na ficha já aparece na próxima busca.
  const marcaEscolhida = () => ctx.dados().fornecedores.find((f) => f.id === marca.entrada.value) ?? null
  const cadastradas = () => pessoasDoFornecedor(marcaEscolhida())
  // Pessoa da ficha da marca: a escolhida na lista ou alguém com o mesmo nome (sem diferenciar acentos).
  const cadastrada = (nome) =>
    cadastradas().find((p) => p.id === pessoa.valor()?.id) ?? cadastradas().find((p) => normalizar(p.nome) === normalizar(nome)) ?? null

  const funcao = campo({ rotulo: 'Função', entrada: selecao([{ valor: '', rotulo: 'Escolha a função' }, ...FUNCOES_DO_FORNECEDOR], '') })
  const pessoa = campoEscolherPessoa({
    rotulo: 'Nome da pessoa',
    opcional: false,
    placeholder: 'Digite o nome',
    ajuda: 'Quem está cadastrado na ficha da marca aparece como sugestão. Também dá para digitar um nome novo.',
    semResultado: null,
    buscar: (texto) => cadastradas().filter((p) => combinaBusca(p.nome, texto)),
    detalhe: (p) => p.funcao,
    aoEscolher: (p) => {
      funcao.entrada.value = p.funcao
      funcao.mostrarErro('')
      atualizarGuardar()
    },
  })
  pessoa.entrada.setAttribute('data-foco', '')
  const guardar = caixaDeMarcar({ rotulo: 'Guardar também na ficha da marca, para as próximas listas', marcada: true })
  function atualizarGuardar() {
    const nome = limparEspacos(pessoa.entrada.value)
    guardar.no.hidden = !nome || !marcaEscolhida() || Boolean(cadastrada(nome))
  }
  pessoa.entrada.addEventListener('input', atualizarGuardar)
  marca.entrada.addEventListener('change', atualizarGuardar)
  atualizarGuardar()

  const feitos = el('p', { class: 'texto-suave texto-pequeno' })
  const nomesFeitos = []
  const salvar = botao({ texto: 'Adicionar', icone: 'plus', variante: 'principal', tipo: 'submit' })
  const formulario = el(
    'form',
    { class: 'formulario', novalidate: true },
    marcas.length ? marca.no : aviso('Cadastre a marca na aba Fornecedores primeiro.', { erro: true }),
    pessoa.no,
    funcao.no,
    guardar.no,
    feitos,
    el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Fechar', aoClicar: () => janela.fechar() }), salvar),
  )
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fornecedor = marcaEscolhida()
    const texto = limparEspacos(pessoa.entrada.value)
    const funcaoEscolhida = funcao.entrada.value
    if (!fornecedor) return marca.mostrarErro('Escolha a marca.')
    if (!texto) return pessoa.mostrarErro('Informe o nome.')
    if (texto.length > 120) return pessoa.mostrarErro('Use até 120 letras.')
    if (!FUNCOES_DO_FORNECEDOR.includes(funcaoEscolhida)) return funcao.mostrarErro('Escolha Palestrante, Representante ou Convidado.')
    const daFicha = cadastrada(texto)
    const nome = daFicha?.nome ?? texto
    if (fornecedorJaNaLista(ctx.presencas(), fornecedor.id, nome)) return pessoa.mostrarErro(`${nome} já está nesta lista pela ${fornecedor.nome}.`)
    const guardarNaFicha = !daFicha && guardar.entrada.checked
    await comOcupado(salvar, async () => {
      try {
        if (guardarNaFicha) await salvarPessoaDoFornecedor(fornecedor.id, { nome, funcao: funcaoEscolhida, telefone: '', email: '' })
        await adicionarConvocados(ctx.lista().id, [presencaDeFornecedor(nome, fornecedor, funcaoEscolhida)])
        avisar(guardarNaFicha ? `${nome} entrou na lista e na ficha da ${fornecedor.nome}.` : '1 pessoa convocada.')
        nomesFeitos.push(`${nome} (${fornecedor.nome})`)
        feitos.textContent = `Adicionados: ${nomesFeitos.join(', ')}. Pode adicionar mais.`
        pessoa.entrada.value = ''
        pessoa.entrada.dispatchEvent(new Event('input')) // limpa a escolha anterior
        funcao.entrada.value = ''
        pessoa.entrada.focus()
      } catch (erro) {
        avisarErro(mensagemDeErro(erro))
      }
    })
  })
  janela.corpo.append(formulario)
  janela.focar()
}
