// "Importar planilha" em Convocados e no Check-in: sobe um Excel com os nomes (e, se tiver, se participou e a
// observação) direto na lista. Usa a mesma janela de importação dos colaboradores (js/ui/importador.js). Regras em
// js/lib/planilhaDaLista.js. Quem não está em nenhum cadastro vem marcado para ser cadastrado em Outras pessoas (com o
// grupo escolhido na linha) e entrar na lista; desmarcado, fica de fora (pedido de 27/11/2026).
import { importarPlanilhaNaLista } from '../../dados/listas.js'
import { hojeISO } from '../../lib/datas.js'
import { GRUPOS_DE_OUTRAS_PESSOAS } from '../../lib/outrasPessoas.js'
import {
  CAMPOS_DA_PLANILHA_DA_LISTA, contarGravacoesDaPlanilha, contarNaoAchados, marcacaoDoItem, noCadastro, observacaoDoItem,
  prepararPlanilhaDaLista,
} from '../../lib/planilhaDaLista.js'
import { formatarNumero, plural } from '../../lib/texto.js'
import { caixaDeMarcar, selecao } from '../../ui/componentes.js'
import { el } from '../../ui/dom.js'
import { abrirImportador } from '../../ui/importador.js'

// ctx: { pessoa, lista(), presencas(), dados() => { colaboradores, eletricistas, outrasPessoas, indisponiveis } }
export function abrirPlanilhaNaLista(ctx) {
  const lista = ctx.lista()
  // Sem as regras novas publicadas, Outras pessoas não abre: aí quem não foi achado só fica de fora.
  const podeCadastrar = !ctx.dados().indisponiveis?.includes('outrasPessoas')
  // O que foi marcado em cada linha (linha → { adicionar, grupo }); sobrevive quando a prévia é refeita.
  const escolhas = new Map()

  // Caixa "Cadastrar" e o grupo, na linha de quem não foi achado.
  function escolhaDaLinha(item, { atualizar } = {}) {
    const guardar = () => escolhas.set(item.linha, { adicionar: item.adicionar, grupo: item.grupo })
    const grupo = selecao(GRUPOS_DE_OUTRAS_PESSOAS, item.grupo, {
      'aria-label': `Grupo de ${item.nome} em Outras pessoas`,
      class: 'importador__grupo',
      disabled: !item.adicionar,
      onChange: (e) => {
        item.grupo = e.target.value
        guardar()
      },
    })
    const caixa = caixaDeMarcar({
      rotulo: 'Cadastrar',
      marcada: item.adicionar,
      'aria-label': `Cadastrar ${item.nome} em Outras pessoas e pôr na lista`,
      aoMudar: (marcada) => {
        item.adicionar = marcada
        grupo.disabled = !marcada
        guardar()
        atualizar?.()
      },
    })
    return el('div', { class: 'importador__outra' }, caixa.no, grupo)
  }

  abrirImportador({
    titulo: `Importar planilha em ${lista.nome}`,
    ajuda:
      'A planilha precisa de uma coluna com o nome da pessoa. Se tiver, também: "Participou?" (Sim, Não ou Outros) e "Observação". ' +
      'Os nomes são procurados nos colaboradores (inclusive desligados), nos eletricistas e em Outras pessoas; quem já está na lista recebe a situação e a observação da planilha. ' +
      'Quem não estiver em nenhum cadastro pode ser cadastrado em Outras pessoas na hora.',
    campos: CAMPOS_DA_PLANILHA_DA_LISTA,
    opcoes: [
      {
        chave: 'participaram',
        rotulo: 'Quem está na planilha participou (marcar como Participou)',
        ajuda: 'Vale para as linhas sem "Participou?" preenchido. Use quando a planilha é a lista de quem esteve na ação.',
        // Lista de um dia que já passou: a planilha costuma ser a de quem participou.
        padrao: String(lista.data) < hojeISO(),
      },
    ],
    preparar: (registros, opcoes) => {
      const { colaboradores, eletricistas = [], outrasPessoas = [] } = ctx.dados()
      const previa = prepararPlanilhaDaLista(
        { registros, colaboradores, eletricistas, outrasPessoas, presencas: ctx.presencas() },
        { ...opcoes, escolhas, cadastrarNaoAchados: podeCadastrar },
      )
      const { naoEncontrados } = previa.contagem
      previa.extras = !naoEncontrados
        ? []
        : podeCadastrar
          ? [`${plural(naoEncontrados, 'nome não está', 'nomes não estão')} em nenhum cadastro. ${naoEncontrados === 1 ? 'Ele vem marcado' : 'Eles vêm marcados'} em "Cadastrar": ${naoEncontrados === 1 ? 'é cadastrado' : 'são cadastrados'} em Outras pessoas, com o grupo escolhido na linha, e ${naoEncontrados === 1 ? 'entra' : 'entram'} na lista. Desmarque quem não deve entrar ou quem for colaborador com o nome escrito diferente.`]
          : [{ texto: `${plural(naoEncontrados, 'nome não foi achado', 'nomes não foram achados')} no cadastro e ${naoEncontrados === 1 ? 'fica' : 'ficam'} de fora. Para cadastrar em Outras pessoas, as regras novas do Firebase precisam estar publicadas.`, erro: true }]
      return previa
    },
    indicadores: (previa) => {
      const { contagem } = previa
      const { cadastrar, deFora } = contarNaoAchados(previa)
      return [
        { rotulo: 'Entram na lista', valor: formatarNumero(contagem.novos + cadastrar) },
        { rotulo: 'Já estão na lista', valor: formatarNumero(contagem.existentes), detalhe: 'recebem o que a planilha disser' },
        { rotulo: 'Novos em Outras pessoas', valor: formatarNumero(cadastrar), detalhe: 'não estavam em nenhum cadastro' },
        { rotulo: 'Ficam de fora', valor: formatarNumero(deFora + contagem.repetidos + contagem.ignorados), detalhe: 'desmarcados, repetidos ou sem nome' },
      ]
    },
    situacoes: {
      novo: ['Entra na lista', 'forte'],
      existente: ['Já está na lista', ''],
      naoEncontrado: ['Não achado', 'alerta'],
    },
    colunas: [
      { rotulo: 'No cadastro', celula: noCadastro },
      { rotulo: 'Outras pessoas', celula: (i, contexto) => (i.situacao === 'naoEncontrado' && podeCadastrar ? escolhaDaLinha(i, contexto) : '') },
      { rotulo: 'Marcar como', celula: marcacaoDoItem },
      { rotulo: 'Observação', celula: observacaoDoItem },
    ],
    contarGravacoes: (previa) => contarGravacoesDaPlanilha(previa, ctx.pessoa.nome),
    textoDoBotao: (total) => `Gravar ${plural(total, 'pessoa', 'pessoas')} na lista`,
    textoDoFim: (total) => `Pronto: ${plural(total, 'pessoa gravada', 'pessoas gravadas')} na lista.`,
    gravar: (previa, _opcoes, aoAvancar) => importarPlanilhaNaLista(lista.id, previa, ctx.pessoa, aoAvancar),
  })
}
