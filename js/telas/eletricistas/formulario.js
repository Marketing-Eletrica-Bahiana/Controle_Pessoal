// Janelas dos eletricistas: cadastro (também usado no check-in) e importação de planilha.
import { cadastrarEletricista, editarEletricista, importarEletricistas } from '../../dados/eletricistas.js'
import { ehSetorComercial } from '../../lib/colaboradores.js'
import {
  CAMPOS_DA_PLANILHA, TEXTO_LGPD, formatarWhatsapp, mascararTelefone, prepararImportacao, validarEletricista,
  vendedoresPossiveis,
} from '../../lib/eletricistas.js'
import { formatarData } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import {
  abrirJanela, aviso, avisar, avisarErro, botao, caixaDeMarcar, campo, comOcupado, confirmar, entradaComMascara, entradaTexto,
  etiqueta, mostrarErros,
} from '../../ui/componentes.js'
import { el } from '../../ui/dom.js'
import { campoEscolherPessoa } from '../../ui/escolherPessoa.js'
import { abrirImportador } from '../../ui/importador.js'

// Espera a confirmação do servidor por alguns segundos; sem internet, o cadastro segue no aparelho.
async function aguardarEnvio(enviado) {
  let terminou = false
  const resultado = await Promise.race([
    enviado.then(() => {
      terminou = true
      return 'enviado'
    }),
    new Promise((resolver) => setTimeout(() => resolver('pendente'), 3500)),
  ])
  if (!terminou) enviado.catch((e) => avisarErro(e))
  return resultado
}

// dados(): { eletricistas, colaboradores }. aoSalvar(id, dadosSalvos) é chamado depois de salvar.
export function abrirFormularioEletricista({ eletricista = null, dados, aoSalvar, titulo }) {
  const novo = !eletricista
  const janela = abrirJanela({ titulo: titulo ?? (novo ? 'Novo eletricista' : 'Editar eletricista'), largura: 600 })

  const consentimento = caixaDeMarcar({
    rotulo: TEXTO_LGPD,
    marcada: eletricista?.consentimentoLgpd === true,
    aoMudar: (marcada) => atualizarWhatsapp(marcada),
  })
  const ajudaWhats = el('p', { class: 'campo__ajuda' })
  const campos = {
    nome: campo({ rotulo: 'Nome completo', entrada: entradaTexto({ value: eletricista?.nome ?? '', maxlength: 120, 'data-foco': true }) }),
    whatsapp: campo({
      rotulo: 'WhatsApp com DDD',
      opcional: true,
      entrada: entradaComMascara(mascararTelefone, { value: formatarWhatsapp(eletricista?.whatsapp), placeholder: '(71) 99999-9999', inputmode: 'tel', maxlength: 16 }),
    }),
  }
  campos.whatsapp.no.append(ajudaWhats)
  const vendedor = campoEscolherPessoa({
    rotulo: 'Vendedor',
    ajuda: 'Os vendedores do setor comercial aparecem primeiro, mas dá para escolher qualquer colaborador.',
    inicial: eletricista?.vendedorId ? { id: eletricista.vendedorId, nome: eletricista.vendedorNome } : null,
    placeholder: 'Digite o nome do vendedor',
    buscar: (texto) => vendedoresPossiveis(dados().colaboradores, texto),
    detalhe: (c) => [c.setor, c.loja].filter(Boolean).join(' · '),
    etiqueta: (c) => (ehSetorComercial(c.setor) ? 'Comercial' : ''),
  })
  if (eletricista?.vendedorNome && !eletricista.vendedorId) vendedor.entrada.value = eletricista.vendedorNome

  function atualizarWhatsapp(marcada) {
    campos.whatsapp.entrada.disabled = !marcada
    campos.whatsapp.mostrarErro('')
    ajudaWhats.textContent = marcada
      ? 'Aceita com ou sem máscara.'
      : novo || !eletricista?.whatsapp
        ? 'Marque a autorização (LGPD) acima para poder salvar o WhatsApp.'
        : 'Sem a autorização, o WhatsApp salvo será apagado.'
  }
  atualizarWhatsapp(eletricista?.consentimentoLgpd === true)

  const caixaDeErro = el('div')
  const salvar = botao({ texto: novo ? 'Cadastrar' : 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
  const formulario = el(
    'form',
    { class: 'formulario', novalidate: true },
    campos.nome.no,
    el('div', { class: 'opcao--destaque' }, consentimento.no),
    campos.whatsapp.no,
    vendedor.no,
    caixaDeErro,
    el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
  )

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    caixaDeErro.replaceChildren()
    const marcada = consentimento.entrada.checked
    const { erros, dados: limpos, valido, homonimo } = validarEletricista(
      { nome: campos.nome.entrada.value, whatsapp: marcada ? campos.whatsapp.entrada.value : '', consentimento: marcada, vendedor: vendedor.valor() },
      { eletricistas: dados().eletricistas, idAtual: eletricista?.id },
    )
    if (vendedor.textoSolto()) {
      if (!novo && vendedor.textoSolto() === eletricista.vendedorNome) {
        limpos.vendedorNome = eletricista.vendedorNome
      } else erros.vendedor = 'Escolha o vendedor na lista ou deixe em branco.'
    }
    vendedor.mostrarErro(erros.vendedor ?? '')
    if (!mostrarErros(campos, erros) || !valido || erros.vendedor) return
    if (homonimo) {
      const seguir = await confirmar({
        titulo: 'Nome igual a outro cadastro',
        texto: `Já existe ${homonimo.nome}${homonimo.vendedorNome ? ` (vendedor ${homonimo.vendedorNome})` : ''}. Se for outra pessoa com o mesmo nome, pode cadastrar.`,
        botaoSim: novo ? 'Cadastrar mesmo assim' : 'Salvar mesmo assim',
      })
      if (!seguir) return
    }
    await comOcupado(salvar, async () => {
      try {
        if (novo) {
          const { id, enviado } = cadastrarEletricista(limpos)
          const situacao = await aguardarEnvio(enviado)
          avisar(situacao === 'enviado' ? `Cadastro de ${limpos.nome} feito!` : 'Cadastro salvo no aparelho. Ele sobe sozinho quando a internet voltar.')
          janela.fechar()
          aoSalvar?.(id, limpos)
        } else {
          await editarEletricista(eletricista.id, eletricista, limpos)
          avisar('Alterações salvas.')
          janela.fechar()
          aoSalvar?.(eletricista.id, limpos)
        }
      } catch (e) {
        caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
      }
    })
  })

  janela.corpo.append(formulario)
  janela.focar()
}

export function abrirImportacaoEletricistas({ dados }) {
  abrirImportador({
    titulo: 'Importar eletricistas',
    ajuda: 'Precisa ter pelo menos a coluna com o nome. O WhatsApp só é salvo para quem autorizou o uso dos dados (LGPD). O vendedor é procurado pelo nome entre os colaboradores.',
    campos: CAMPOS_DA_PLANILHA,
    opcoes: [
      { chave: 'atualizar', rotulo: 'Atualizar quem já existe com os dados da planilha', ajuda: 'Só mudam os campos preenchidos na planilha.', padrao: true },
      {
        chave: 'todosAutorizaram',
        rotulo: 'Todos os eletricistas desta planilha autorizaram o uso dos dados para contato (LGPD)',
        ajuda: 'Marque só se a autorização de todos estiver registrada. Sem isso, vale a coluna "Autorizou LGPD" de cada linha.',
        padrao: false,
      },
    ],
    preparar: (registros, opcoes) => {
      const { eletricistas, colaboradores } = dados()
      return prepararImportacao({ registros, eletricistas, colaboradores, todosAutorizaram: opcoes.todosAutorizaram })
    },
    colunas: [
      { rotulo: 'WhatsApp', celula: (i) => formatarWhatsapp(i.dados?.whatsapp) },
      { rotulo: 'Vendedor', celula: (i) => i.dados?.vendedorNome ?? '' },
      {
        rotulo: 'LGPD',
        celula: (i) => {
          if (!i.dados) return ''
          if (i.dados.consentimentoLgpd) return etiqueta('Autorizou', 'forte')
          // Quem já existe mantém a autorização que tinha.
          return i.situacao === 'novo' ? etiqueta('Não autorizou', 'alerta') : ''
        },
      },
      { rotulo: 'Cadastro', celula: (i) => formatarData(i.dados?.dataCadastro) },
    ],
    contarGravacoes: (previa, opcoes) => previa.contagem.novos + (opcoes.atualizar ? previa.contagem.existentes : 0),
    gravar: (previa, opcoes, aoAvancar) => importarEletricistas(previa, { atualizarExistentes: opcoes.atualizar }, aoAvancar),
  })
}
