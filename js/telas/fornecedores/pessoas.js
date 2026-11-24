// Pessoas da marca (palestrantes, representantes e convidados): bloco da ficha do fornecedor e janela de cadastro.
// Ficam no campo "pessoas" do documento da marca. Nas listas de presença, aparecem como sugestão ao adicionar
// pessoa de fornecedor (js/telas/listas/convocados.js).
import { salvarPessoaDoFornecedor, tirarPessoaDoFornecedor } from '../../dados/fornecedores.js'
import { formatarWhatsapp, mascararTelefone } from '../../lib/contato.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { FUNCOES_DO_FORNECEDOR, pessoasDoFornecedor, validarPessoaDoFornecedor } from '../../lib/fornecedores.js'
import { plural } from '../../lib/texto.js'
import {
  abrirJanela, aviso, avisar, bloco, botao, botaoIcone, campo, comOcupado, confirmar, entradaComMascara, entradaTexto, etiqueta, mostrarErros,
  selecao, tabela,
} from '../../ui/componentes.js'
import { el } from '../../ui/dom.js'
import { contatosDoColaborador } from '../colaboradores/contatos.js'

// fornecedor(): a marca na versão mais nova (para validar nome repetido com o que acabou de chegar).
export function blocoDePessoas(f, { admin, fornecedor }) {
  const pessoas = pessoasDoFornecedor(f)
  const adicionar = () => abrirPessoaDoFornecedor({ fornecedor })
  return bloco(
    {
      titulo: 'Pessoas da marca',
      icone: 'users',
      descricao: 'Palestrantes, representantes e convidados que a marca envia para os treinamentos e eventos.',
      acoes: [admin && botao({ texto: 'Adicionar pessoa', icone: 'user-plus', variante: 'principal', aoClicar: adicionar })],
    },
    pessoas.length
      ? [
          tabela({
            itens: pessoas,
            colunas: [
              { rotulo: 'Nome', principal: true, celula: (p) => el('span', { class: 'tabela__nome' }, p.nome) },
              { rotulo: 'Função', celula: (p) => etiqueta(p.funcao, 'marinho') },
              { rotulo: 'Contatos', ordenavel: false, celula: (p) => contatosDoColaborador(p) },
              admin && {
                rotulo: 'Ações',
                classe: 'tabela__acoes',
                celula: (p) =>
                  el(
                    'div',
                    { class: 'acoes acoes--juntas' },
                    botaoIcone({ icone: 'pencil', rotulo: `Editar ${p.nome}`, aoClicar: () => abrirPessoaDoFornecedor({ fornecedor, pessoa: p }) }),
                    botaoIcone({ icone: 'trash-2', rotulo: `Tirar ${p.nome} da marca`, perigo: true, aoClicar: () => tirar(f, p) }),
                  ),
              },
            ].filter(Boolean),
          }),
          el('p', { class: 'texto-suave texto-pequeno' }, plural(pessoas.length, 'pessoa cadastrada', 'pessoas cadastradas')),
        ]
      : el(
          'p',
          { class: 'texto-suave' },
          admin
            ? 'Nenhuma pessoa cadastrada ainda. Use "Adicionar pessoa" para guardar os palestrantes, representantes e convidados da marca.'
            : 'Nenhuma pessoa cadastrada ainda.',
        ),
  )
}

async function tirar(f, p) {
  const ok = await confirmar({
    titulo: 'Tirar da marca',
    texto: `${p.nome} sai do cadastro da ${f.nome}. As listas de presença já feitas continuam com o nome.`,
    botaoSim: 'Tirar da marca',
    perigo: true,
  })
  if (!ok) return
  try {
    await tirarPessoaDoFornecedor(f.id, p.id)
    avisar(`${p.nome} saiu da ${f.nome}.`)
  } catch (e) {
    avisar(mensagemDeErro(e), { erro: true })
  }
}

// Cadastro ou edição de uma pessoa da marca.
export function abrirPessoaDoFornecedor({ fornecedor, pessoa = null }) {
  const nova = !pessoa
  const f = fornecedor()
  const janela = abrirJanela({ titulo: nova ? `Nova pessoa: ${f.nome}` : 'Editar pessoa da marca', largura: 560 })
  const campos = {
    nome: campo({ rotulo: 'Nome', entrada: entradaTexto({ value: pessoa?.nome ?? '', maxlength: 120, 'data-foco': true }) }),
    funcao: campo({
      rotulo: 'Função',
      entrada: selecao([{ valor: '', rotulo: 'Escolha a função' }, ...FUNCOES_DO_FORNECEDOR], pessoa?.funcao ?? ''),
    }),
    telefone: campo({
      rotulo: 'Telefone ou WhatsApp',
      opcional: true,
      entrada: entradaComMascara(mascararTelefone, { value: formatarWhatsapp(pessoa?.telefone), placeholder: '(71) 99999-9999', inputmode: 'tel', maxlength: 16 }),
    }),
    email: campo({
      rotulo: 'E-mail',
      opcional: true,
      entrada: entradaTexto({ type: 'email', value: pessoa?.email ?? '', inputmode: 'email', autocapitalize: 'none', spellcheck: 'false', maxlength: 120 }),
    }),
  }
  const caixaDeErro = el('div')
  const salvar = botao({ texto: nova ? 'Cadastrar' : 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
  const formulario = el(
    'form',
    { class: 'formulario', novalidate: true },
    el('div', { class: 'formulario__linha' }, campos.nome.no, campos.funcao.no),
    el('div', { class: 'formulario__linha' }, campos.telefone.no, campos.email.no),
    el('p', { class: 'campo__ajuda' }, 'Ao montar uma lista de presença, as pessoas da marca aparecem como sugestão em "Adicionar pessoa de fornecedor".'),
    caixaDeErro,
    el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
  )
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    caixaDeErro.replaceChildren()
    const atual = fornecedor()
    const valores = Object.fromEntries(Object.entries(campos).map(([chave, c]) => [chave, c.entrada.value]))
    const { erros, dados, valido } = validarPessoaDoFornecedor(valores, { pessoas: atual?.pessoas ?? [], idAtual: pessoa?.id })
    if (!mostrarErros(campos, erros) || !valido) return
    await comOcupado(salvar, async () => {
      try {
        await salvarPessoaDoFornecedor(f.id, { id: pessoa?.id ?? null, ...dados })
        avisar(nova ? `${dados.nome} agora está na ${f.nome}.` : 'Alterações salvas.')
        janela.fechar()
      } catch (e) {
        caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
      }
    })
  })
  janela.corpo.append(formulario)
  janela.focar()
}
