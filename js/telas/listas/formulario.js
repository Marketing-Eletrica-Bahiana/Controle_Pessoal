// Janela para criar e editar uma lista de presença (só admin).
import { criarLista, editarLista } from '../../dados/listas.js'
import { formatarData, hojeISO, mascararData } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { LOCAIS, OUTRO_LOCAL, TIPOS_DE_LISTA, validarLista } from '../../lib/listas.js'
import { compararTexto } from '../../lib/texto.js'
import {
  abrirJanela, aviso, avisar, botao, caixaDeMarcar, campo, comOcupado, entradaComMascara, entradaTexto, mostrarErros, selecao,
} from '../../ui/componentes.js'
import { el } from '../../ui/dom.js'

// fornecedores: todas as marcas (as desativadas só aparecem se já estiverem na lista).
export function abrirFormularioLista({ lista = null, fornecedores, pessoa, aoSalvar }) {
  const nova = !lista
  const janela = abrirJanela({ titulo: nova ? 'Nova lista de presença' : 'Editar lista', largura: 640 })
  const escolhidas = new Set(lista?.fornecedores ?? [])

  const campos = {
    nome: campo({ rotulo: 'Nome da lista', entrada: entradaTexto({ value: lista?.nome ?? '', maxlength: 120, placeholder: 'Ex.: Treinamento Legrand: linha Pial Plus', 'data-foco': true }) }),
    tipo: campo({ rotulo: 'Tipo', entrada: selecao([{ valor: '', rotulo: 'Escolha o tipo' }, ...TIPOS_DE_LISTA], lista?.tipo ?? '') }),
    data: campo({ rotulo: 'Data', entrada: entradaComMascara(mascararData, { value: formatarData(lista?.data ?? hojeISO()), placeholder: 'DD/MM/AAAA', maxlength: 10 }) }),
    loja: campo({ rotulo: 'Loja', entrada: selecao([{ valor: '', rotulo: 'Escolha a loja' }, ...LOCAIS], lista?.loja ?? '') }),
    local: campo({ rotulo: 'Local', opcional: true, entrada: entradaTexto({ value: lista?.local ?? '', maxlength: 120, placeholder: 'Ex.: Auditório, sala de reunião, hotel' }) }),
  }
  const atualizarLocal = () => {
    const outro = campos.loja.entrada.value === OUTRO_LOCAL
    campos.local.no.querySelector('.campo__opcional').hidden = outro
  }
  campos.loja.entrada.addEventListener('change', atualizarLocal)
  atualizarLocal()

  const marcas = fornecedores
    .filter((f) => f.ativo !== false || escolhidas.has(f.id))
    .sort((a, b) => compararTexto(a.nome, b.nome))
  const caixasDeMarca = marcas.map((f) =>
    caixaDeMarcar({
      rotulo: f.nome,
      marcada: escolhidas.has(f.id),
      aoMudar: (marcada) => (marcada ? escolhidas.add(f.id) : escolhidas.delete(f.id)),
    }).no,
  )

  const caixaDeErro = el('div')
  const salvar = botao({ texto: nova ? 'Criar lista' : 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
  const formulario = el(
    'form',
    { class: 'formulario', novalidate: true },
    campos.nome.no,
    el('div', { class: 'formulario__linha' }, campos.tipo.no, campos.data.no),
    el('div', { class: 'formulario__linha' }, campos.loja.no, campos.local.no),
    el(
      'fieldset',
      { class: 'campo' },
      el('legend', { class: 'campo__rotulo' }, 'Marcas envolvidas', el('span', { class: 'campo__opcional' }, ' (opcional)')),
      marcas.length ? el('div', { class: 'opcoes opcoes--grade' }, caixasDeMarca) : el('p', { class: 'campo__ajuda' }, 'Nenhuma marca cadastrada na aba Fornecedores.'),
      el('p', { class: 'campo__ajuda' }, 'As marcas das pessoas de fornecedor adicionadas na lista entram aqui sozinhas.'),
    ),
    caixaDeErro,
    el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
  )

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    caixaDeErro.replaceChildren()
    const valores = Object.fromEntries(Object.entries(campos).map(([chave, c]) => [chave, c.entrada.value]))
    const { erros, dados, valido } = validarLista({ ...valores, fornecedores: [...escolhidas] })
    if (!mostrarErros(campos, erros) || !valido) return
    await comOcupado(salvar, async () => {
      try {
        const id = nova ? await criarLista(dados, pessoa) : (await editarLista(lista.id, dados), lista.id)
        avisar(nova ? 'Lista criada! Agora é só montar os convocados.' : 'Alterações salvas.')
        janela.fechar()
        aoSalvar?.(id)
      } catch (e) {
        caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
      }
    })
  })
  janela.corpo.append(formulario)
  janela.focar()
}
