// Aba Fornecedores: marcas parceiras (Soprano, Legrand, Ledvance...). As pessoas que cada marca manda
// para treinamentos e eventos ficam só dentro de cada lista de presença.
// Endereços: #/fornecedores e #/fornecedores/{id}
import { definirAtivoFornecedor, salvarFornecedor } from '../dados/fornecedores.js'
import { ouvirFontes } from '../dados/fontes.js'
import { mensagemDeErro } from '../lib/erros.js'
import { mascararTelefone } from '../lib/eletricistas.js'
import { filtrarFornecedores, validarFornecedor } from '../lib/fornecedores.js'
import { pode } from '../lib/papeis.js'
import { endereco } from '../lib/rotas.js'
import { plural } from '../lib/texto.js'
import {
  abrirJanela, aviso, avisar, blocoDeErro, bloco, botao, cabecalhoPagina, campo, campoBusca, carregando, comOcupado, confirmar,
  entradaComMascara, entradaTexto, estadoVazio, etiqueta, ficha, filtroSelecao, mostrarErros,
} from '../ui/componentes.js'
import { el, icone, trocar } from '../ui/dom.js'
import { participacoesDoFornecedor } from './listas/historico.js'

const filtros = { busca: '', situacao: 'ativos' }

export function montar(raiz, { pessoa, params }) {
  const [id] = params
  const admin = pode(pessoa, 'editarCadastros')
  let dados = null
  let erro = null
  const area = el('div', { class: 'pagina' })
  raiz.replaceChildren(area)
  const fixos = {}
  let pararParticipacoes = null

  function desenhar() {
    if (erro) return trocar(area, blocoDeErro(erro))
    if (!dados) return trocar(area, carregando())
    if (id) desenharFicha()
    else desenharLista()
  }

  function desenharLista() {
    if (!fixos.resultado || !area.contains(fixos.resultado)) {
      fixos.resultado = el('div', { class: 'pagina__resultado' })
      const busca = campoBusca({
        placeholder: 'Buscar pela marca',
        valor: filtros.busca,
        aoDigitar: (v) => {
          filtros.busca = v
          desenharResultado()
        },
      })
      trocar(
        area,
        cabecalhoPagina({
          titulo: 'Fornecedores',
          icone: 'handshake',
          descricao: 'Marcas parceiras que participam dos treinamentos e eventos. Quem cada marca envia é registrado em cada lista de presença.',
          acoes: [admin && botao({ texto: 'Nova marca', icone: 'plus', variante: 'principal', aoClicar: () => abrirFormulario() })],
        }),
        el(
          'div',
          { class: 'filtros' },
          busca.no,
          filtroSelecao({
            rotulo: 'Situação',
            opcoes: [
              { valor: 'ativos', rotulo: 'Ativas' },
              { valor: 'inativos', rotulo: 'Desativadas' },
              { valor: 'todos', rotulo: 'Todas' },
            ],
            valor: filtros.situacao,
            aoMudar: (v) => {
              filtros.situacao = v
              desenharResultado()
            },
          }),
        ),
        fixos.resultado,
      )
    }
    desenharResultado()
  }

  const participacoes = (fornecedorId) =>
    dados.listas.filter((l) => (l.fornecedores ?? []).includes(fornecedorId)).length

  function desenharResultado() {
    if (!dados.fornecedores.length) {
      return trocar(
        fixos.resultado,
        estadoVazio({
          titulo: 'Nenhuma marca cadastrada ainda',
          texto: admin ? 'Cadastre as marcas parceiras, como Soprano, Legrand e Ledvance.' : 'Assim que a administração cadastrar as marcas, elas aparecem aqui.',
          acoes: admin ? [botao({ texto: 'Nova marca', icone: 'plus', variante: 'principal', aoClicar: () => abrirFormulario() })] : [],
        }),
      )
    }
    const lista = filtrarFornecedores(dados.fornecedores, filtros)
    trocar(
      fixos.resultado,
      el('p', { class: 'texto-suave' }, plural(lista.length, 'marca', 'marcas')),
      lista.length
        ? el(
            'div',
            { class: 'grade-cartoes' },
            lista.map((f) => {
              const vezes = participacoes(f.id)
              return el(
                'a',
                { class: 'cartao cartao--clicavel cartao-fornecedor', href: endereco('fornecedores', f.id) },
                el('div', { class: 'cartao-setor__topo' }, el('h2', {}, f.nome), f.ativo === false ? etiqueta('Desativada', 'alerta') : etiqueta(plural(vezes, 'participação', 'participações'), vezes ? 'forte' : '')),
                contato(f, { comLinks: false }),
              )
            }),
          )
        : aviso('Nenhuma marca encontrada com essa busca.'),
    )
  }

  function contato(f, { comLinks = true } = {}) {
    const linhas = [
      f.contatoNome && el('li', {}, icone('user-round'), f.contatoNome),
      f.contatoEmail && el('li', {}, icone('mail'), comLinks ? el('a', { href: `mailto:${f.contatoEmail}` }, f.contatoEmail) : f.contatoEmail),
      f.contatoTelefone && el('li', {}, icone('phone'), comLinks ? el('a', { href: `tel:+55${f.contatoTelefone.replace(/\D/g, '')}` }, f.contatoTelefone) : f.contatoTelefone),
    ].filter(Boolean)
    return linhas.length ? el('ul', { class: 'contato' }, linhas) : el('p', { class: 'texto-suave texto-pequeno' }, 'Sem contato cadastrado.')
  }

  function abrirFormulario(fornecedor = null) {
    const novo = !fornecedor
    const janela = abrirJanela({ titulo: novo ? 'Nova marca' : 'Editar marca', largura: 560 })
    const campos = {
      nome: campo({ rotulo: 'Nome da marca', entrada: entradaTexto({ value: fornecedor?.nome ?? '', maxlength: 80, placeholder: 'Ex.: Legrand', 'data-foco': true }) }),
      contatoNome: campo({ rotulo: 'Nome do contato', opcional: true, entrada: entradaTexto({ value: fornecedor?.contatoNome ?? '', maxlength: 120 }) }),
      contatoEmail: campo({
        rotulo: 'E-mail do contato',
        opcional: true,
        entrada: entradaTexto({ type: 'email', value: fornecedor?.contatoEmail ?? '', inputmode: 'email', autocapitalize: 'none', spellcheck: 'false' }),
      }),
      contatoTelefone: campo({
        rotulo: 'Telefone do contato',
        opcional: true,
        entrada: entradaComMascara(mascararTelefone, { value: fornecedor?.contatoTelefone ?? '', placeholder: '(71) 3333-4444', inputmode: 'tel', maxlength: 16 }),
      }),
    }
    const caixaDeErro = el('div')
    const salvar = botao({ texto: novo ? 'Cadastrar' : 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
    const formulario = el(
      'form',
      { class: 'formulario', novalidate: true },
      campos.nome.no,
      campos.contatoNome.no,
      el('div', { class: 'formulario__linha' }, campos.contatoEmail.no, campos.contatoTelefone.no),
      el('p', { class: 'campo__ajuda' }, 'Palestrantes e representantes mudam a cada evento: eles são registrados dentro de cada lista de presença.'),
      caixaDeErro,
      el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
    )
    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault()
      caixaDeErro.replaceChildren()
      const valores = Object.fromEntries(Object.entries(campos).map(([chave, c]) => [chave, c.entrada.value]))
      const { erros, dados: limpos, valido } = validarFornecedor(valores, { fornecedores: dados.fornecedores, idAtual: fornecedor?.id })
      if (!mostrarErros(campos, erros) || !valido) return
      await comOcupado(salvar, async () => {
        try {
          await salvarFornecedor({ id: fornecedor?.id, dados: limpos })
          avisar(novo ? `Marca ${limpos.nome} cadastrada.` : 'Alterações salvas.')
          janela.fechar()
        } catch (e) {
          caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
        }
      })
    })
    janela.corpo.append(formulario)
    janela.focar()
  }

  async function mudarAtivo(f, ativo) {
    if (!ativo) {
      const ok = await confirmar({
        titulo: 'Desativar marca',
        texto: `${f.nome} deixa de aparecer nas novas listas, mas as participações ficam guardadas. Dá para reativar depois.`,
        botaoSim: 'Desativar',
        perigo: true,
      })
      if (!ok) return
    }
    try {
      await definirAtivoFornecedor(f.id, ativo)
      avisar(ativo ? `${f.nome} está ativa de novo.` : `${f.nome} foi desativada.`)
    } catch (e) {
      avisar(mensagemDeErro(e), { erro: true })
    }
  }

  function desenharFicha() {
    const f = dados.fornecedores.find((x) => x.id === id)
    if (!f) return trocar(area, cabecalhoPagina({ titulo: 'Marca não encontrada', icone: 'handshake', voltar: { href: '#/fornecedores', texto: 'Fornecedores' } }))
    if (!fixos.participacoes) fixos.participacoes = el('div')
    trocar(
      area,
      cabecalhoPagina({
        titulo: f.nome,
        icone: 'handshake',
        voltar: { href: '#/fornecedores', texto: 'Fornecedores' },
        acoes: admin
          ? [
              botao({ texto: 'Editar', icone: 'pencil', aoClicar: () => abrirFormulario(f) }),
              f.ativo === false
                ? botao({ texto: 'Reativar', icone: 'rotate-cw', aoClicar: () => mudarAtivo(f, true) })
                : botao({ texto: 'Desativar', icone: 'power', variante: 'perigo-claro', aoClicar: () => mudarAtivo(f, false) }),
            ]
          : [],
      }),
      el('div', { class: 'acoes acoes--esquerda' }, f.ativo === false ? etiqueta('Desativada', 'alerta') : etiqueta('Ativa', 'forte')),
      bloco(
        { titulo: 'Contato', icone: 'phone' },
        ficha([
          ['Nome do contato', f.contatoNome],
          ['E-mail', f.contatoEmail ? el('a', { href: `mailto:${f.contatoEmail}` }, f.contatoEmail) : ''],
          ['Telefone', f.contatoTelefone ? el('a', { href: `tel:+55${f.contatoTelefone.replace(/\D/g, '')}` }, f.contatoTelefone) : ''],
        ]),
      ),
      fixos.participacoes,
    )
    if (!pararParticipacoes) pararParticipacoes = participacoesDoFornecedor(fixos.participacoes, { fornecedorId: f.id })
  }

  const parar = ouvirFontes(['fornecedores', 'listas'], (novos, e) => {
    erro = e
    if (novos) dados = novos
    desenhar()
  })
  desenhar()
  return () => {
    parar()
    pararParticipacoes?.()
  }
}
