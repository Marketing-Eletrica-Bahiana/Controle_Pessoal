// Informações Pessoais do colaborador (Pet, Família, Sonhos, Time, Hobby): bloco da ficha e janela de preenchimento.
// Servem para as ações internas. Quem tem acesso vê; só o admin preenche (as regras de "colaboradores" já cobrem).
import { salvarInformacoesPessoais } from '../../dados/colaboradores.js'
import { INFORMACOES_PESSOAIS, LIMITE_DA_INFORMACAO_PESSOAL, informacoesPessoaisDe, temInformacoesPessoais, validarInformacoesPessoais } from '../../lib/colaboradores.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { abrirJanela, aviso, avisar, bloco, botao, campo, comOcupado, ficha, mostrarErros } from '../../ui/componentes.js'
import { el } from '../../ui/dom.js'

export function blocoDeInformacoesPessoais(c, { admin }) {
  const preenchido = temInformacoesPessoais(c)
  const respostas = informacoesPessoaisDe(c)
  return bloco(
    {
      titulo: 'Informações Pessoais',
      icone: 'star',
      classe: 'bloco--informacoes-pessoais',
      descricao: 'O que a pessoa conta sobre ela para as nossas ações internas.',
      acoes: [
        admin &&
          botao({
            texto: preenchido ? 'Editar' : 'Preencher',
            icone: 'pencil',
            variante: preenchido ? 'secundario' : 'principal',
            aoClicar: () => abrirInformacoesPessoais(c),
          }),
      ],
    },
    preenchido
      ? ficha(INFORMACOES_PESSOAIS.map(({ campo, rotulo }) => [rotulo, respostas[campo]]))
      : el(
          'p',
          { class: 'texto-suave' },
          admin ? 'Nada preenchido ainda. Use "Preencher" para contar o pet, a família, os sonhos, o time e o hobby da pessoa.' : 'Nada preenchido ainda.',
        ),
  )
}

export function abrirInformacoesPessoais(c) {
  const respostas = informacoesPessoaisDe(c)
  const janela = abrirJanela({ titulo: `Informações Pessoais: ${c.nome}`, largura: 640 })
  const campos = Object.fromEntries(
    INFORMACOES_PESSOAIS.map(({ campo: nome, rotulo, exemplo }, i) => [
      nome,
      campo({
        rotulo,
        opcional: true,
        entrada: el('textarea', { rows: 2, maxlength: LIMITE_DA_INFORMACAO_PESSOAL, placeholder: exemplo, value: respostas[nome], 'data-foco': i === 0 || undefined }),
      }),
    ]),
  )
  const caixaDeErro = el('div')
  const salvar = botao({ texto: 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
  const formulario = el(
    'form',
    { class: 'formulario', novalidate: true },
    el('div', { class: 'formulario__linha' }, campos.pet.no, campos.familia.no),
    el('div', { class: 'formulario__linha' }, campos.sonhos.no, campos.time.no),
    campos.hobby.no,
    el('p', { class: 'campo__ajuda' }, `Todos os espaços são opcionais, com até ${LIMITE_DA_INFORMACAO_PESSOAL} letras cada. Deixe em branco o que a pessoa não quiser contar.`),
    caixaDeErro,
    el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
  )
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    caixaDeErro.replaceChildren()
    const valores = Object.fromEntries(Object.entries(campos).map(([nome, c]) => [nome, c.entrada.value]))
    const { erros, dados, valido } = validarInformacoesPessoais(valores)
    if (!mostrarErros(campos, erros) || !valido) return
    await comOcupado(salvar, async () => {
      try {
        await salvarInformacoesPessoais(c.id, dados)
        avisar('Informações Pessoais salvas.')
        janela.fechar()
      } catch (e) {
        caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
      }
    })
  })
  janela.corpo.append(formulario)
  janela.focar()
}
