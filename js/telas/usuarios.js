// Aba Usuários (só admin): quem pode entrar no app e com qual papel.
import { DOMINIO_EMPRESA } from '../config.js'
import { cadastrarUsuario, definirAtivo, editarUsuario, ouvirUsuarios } from '../dados/usuarios.js'
import { mensagemDeErro } from '../lib/erros.js'
import { PAPEIS, pode, rotuloDoPapel } from '../lib/papeis.js'
import { combinaBusca, ordenarPor, plural } from '../lib/texto.js'
import { podeMudarAcesso, validarUsuario } from '../lib/usuarios.js'
import {
  abrirJanela, aviso, avisar, blocoDeErro, botao, botaoIcone, cabecalhoPagina, campo, campoBusca, carregando, comOcupado,
  confirmar, entradaTexto, estadoVazio, etiqueta, indicadores, mostrarErros, selecao, tabela,
} from '../ui/componentes.js'
import { el, trocar } from '../ui/dom.js'

export function montar(raiz, { pessoa }) {
  if (!pode(pessoa, 'gerenciarUsuarios')) {
    raiz.replaceChildren(blocoDeErro('Só a administração gerencia os usuários.'))
    return null
  }

  let usuarios = null
  let erro = null
  let busca = ''

  const resumo = el('div')
  const lista = el('div')
  const campoDeBusca = campoBusca({
    placeholder: 'Buscar por nome, e-mail ou cargo',
    aoDigitar: (valor) => {
      busca = valor
      desenhar()
    },
  })

  raiz.replaceChildren(
    el(
      'div',
      { class: 'pagina' },
      cabecalhoPagina({
        titulo: 'Usuários',
        icone: 'user-cog',
        descricao: 'Quem pode entrar no Controle Pessoal e o que cada pessoa pode fazer.',
        acoes: [botao({ texto: 'Novo usuário', icone: 'user-plus', variante: 'principal', aoClicar: () => abrirFormulario() })],
      }),
      resumo,
      el('div', { class: 'filtros' }, campoDeBusca.no),
      lista,
    ),
  )

  function desenhar() {
    if (erro) return trocar(lista, blocoDeErro(erro))
    if (!usuarios) return trocar(lista, carregando())

    const ativos = usuarios.filter((u) => u.ativo === true)
    trocar(
      resumo,
      indicadores([
        { rotulo: 'Usuários ativos', valor: ativos.length },
        { rotulo: 'Administração', valor: ativos.filter((u) => u.papel === 'admin').length },
        { rotulo: 'Organização', valor: ativos.filter((u) => u.papel === 'organizador').length },
        { rotulo: 'Desativados', valor: usuarios.length - ativos.length },
      ]),
    )

    const filtrados = ordenarPor(usuarios).filter((u) => combinaBusca(`${u.nome} ${u.id} ${u.cargo}`, busca))
    if (!usuarios.length) {
      return trocar(lista, estadoVazio({ titulo: 'Nenhum usuário ainda', texto: 'Cadastre a primeira pessoa com o botão Novo usuário.' }))
    }
    if (!filtrados.length) return trocar(lista, aviso('Ninguém encontrado com essa busca.'))

    trocar(
      lista,
      el('p', { class: 'texto-suave texto-pequeno' }, plural(filtrados.length, 'usuário', 'usuários')),
      tabela({
        itens: filtrados,
        classeDaLinha: (u) => (u.ativo === true ? null : 'linha--inativa'),
        colunas: [
          {
            rotulo: 'Nome',
            principal: true,
            celula: (u) => [
              el('span', { class: 'tabela__nome' }, u.nome || 'Sem nome'),
              !podeMudarAcesso(pessoa, u) && etiqueta('Você'),
              el('span', { class: 'tabela__detalhe' }, u.id),
            ],
          },
          { rotulo: 'Cargo', celula: (u) => u.cargo || 'Não informado' },
          { rotulo: 'Papel', celula: (u) => etiqueta(rotuloDoPapel(u.papel), PAPEIS[u.papel] ? '' : 'alerta') },
          { rotulo: 'Situação', celula: (u) => (u.ativo === true ? etiqueta('Ativo', 'forte') : etiqueta('Desativado', 'alerta')) },
          { rotulo: 'Ações', classe: 'tabela__acoes', celula: (u) => acoesDaLinha(u) },
        ],
      }),
    )
  }

  function acoesDaLinha(usuario) {
    const proprio = !podeMudarAcesso(pessoa, usuario)
    const ativo = usuario.ativo === true
    return el(
      'div',
      { class: 'acoes acoes--juntas' },
      botaoIcone({ icone: 'pencil', rotulo: `Editar ${usuario.nome}`, aoClicar: () => abrirFormulario(usuario) }),
      ativo
        ? botaoIcone({
            icone: 'user-x',
            rotulo: proprio ? 'Você não pode desativar o próprio acesso' : `Desativar ${usuario.nome}`,
            perigo: true,
            disabled: proprio,
            aoClicar: () => mudarAtivo(usuario, false),
          })
        : botaoIcone({ icone: 'user-check', rotulo: `Reativar ${usuario.nome}`, aoClicar: () => mudarAtivo(usuario, true) }),
    )
  }

  async function mudarAtivo(usuario, ativo) {
    if (!ativo) {
      if (!podeMudarAcesso(pessoa, usuario)) return
      const ok = await confirmar({
        titulo: 'Desativar acesso',
        texto: `${usuario.nome} não vai mais conseguir entrar no Controle Pessoal. Dá para reativar depois.`,
        botaoSim: 'Desativar',
        perigo: true,
      })
      if (!ok) return
    }
    try {
      await definirAtivo(usuario.id, ativo)
      avisar(ativo ? `${usuario.nome} pode entrar de novo.` : `Acesso de ${usuario.nome} desativado.`)
    } catch (e) {
      avisar(mensagemDeErro(e), { erro: true })
    }
  }

  function abrirFormulario(usuario = null) {
    const novo = !usuario
    const proprio = !novo && !podeMudarAcesso(pessoa, usuario)
    const janela = abrirJanela({ titulo: novo ? 'Novo usuário' : 'Editar usuário' })
    const campos = {
      email: campo({
        rotulo: 'E-mail',
        entrada: entradaTexto({
          type: 'email',
          value: usuario?.id ?? '',
          disabled: !novo,
          placeholder: `nome@${DOMINIO_EMPRESA}`,
          inputmode: 'email',
          autocapitalize: 'none',
          spellcheck: 'false',
          'data-foco': novo,
        }),
        ajuda: novo ? `Só e-mail @${DOMINIO_EMPRESA}. O e-mail não muda depois do cadastro.` : 'O e-mail não muda depois do cadastro.',
      }),
      nome: campo({ rotulo: 'Nome', entrada: entradaTexto({ value: usuario?.nome ?? '', maxlength: 120, 'data-foco': !novo }) }),
      cargo: campo({ rotulo: 'Cargo', opcional: true, entrada: entradaTexto({ value: usuario?.cargo ?? '', maxlength: 80 }) }),
      papel: campo({
        rotulo: 'Papel',
        entrada: selecao(
          [
            { valor: '', rotulo: 'Escolha o papel' },
            { valor: 'admin', rotulo: 'Administração' },
            { valor: 'organizador', rotulo: 'Organização' },
          ],
          PAPEIS[usuario?.papel] ? usuario.papel : novo ? '' : 'organizador',
          { disabled: proprio },
        ),
        ajuda: proprio
          ? 'Você não pode mudar o próprio papel.'
          : 'Administração cadastra, edita e apaga tudo. Organização vê tudo, faz check-in, cadastra eletricista novo e baixa listas.',
      }),
    }
    const caixaDeErro = el('div')
    const salvar = botao({ texto: novo ? 'Cadastrar' : 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
    const formulario = el(
      'form',
      { class: 'formulario', novalidate: true },
      campos.email.no,
      campos.nome.no,
      campos.cargo.no,
      campos.papel.no,
      caixaDeErro,
      el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
    )
    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault()
      caixaDeErro.replaceChildren()
      const { erros, email, dados, valido } = validarUsuario(
        {
          email: campos.email.entrada.value,
          nome: campos.nome.entrada.value,
          cargo: campos.cargo.entrada.value,
          papel: proprio ? usuario.papel : campos.papel.entrada.value,
        },
        { novo },
      )
      if (novo && !erros.email && usuarios?.some((u) => u.id === email)) erros.email = 'Essa pessoa já está cadastrada.'
      if (!mostrarErros(campos, erros) || !valido) return
      await comOcupado(salvar, async () => {
        try {
          if (novo) await cadastrarUsuario(email, dados)
          else await editarUsuario(usuario.id, dados)
          avisar(novo ? `Cadastro feito! ${dados.nome} já pode entrar.` : 'Alterações salvas.')
          janela.fechar()
        } catch (e) {
          if (e.doApp) campos.email.mostrarErro(e.message)
          else caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
        }
      })
    })
    janela.corpo.append(formulario)
    janela.focar()
  }

  desenhar()
  return ouvirUsuarios(
    (dados) => {
      usuarios = dados
      erro = null
      desenhar()
    },
    (e) => {
      erro = e
      desenhar()
    },
  )
}
