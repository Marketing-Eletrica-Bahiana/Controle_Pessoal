// "Importar planilha" em Convocados: sobe um Excel com os nomes (e, se tiver, se participou e a observação) direto na
// lista. Usa a mesma janela de importação dos colaboradores (js/ui/importador.js). Regras em js/lib/planilhaDaLista.js.
import { importarPlanilhaNaLista } from '../../dados/listas.js'
import { hojeISO } from '../../lib/datas.js'
import {
  CAMPOS_DA_PLANILHA_DA_LISTA, contarGravacoesDaPlanilha, marcacaoDoItem, noCadastro, prepararPlanilhaDaLista,
} from '../../lib/planilhaDaLista.js'
import { formatarNumero, plural } from '../../lib/texto.js'
import { abrirImportador } from '../../ui/importador.js'

// ctx: { pessoa, lista(), presencas(), dados() => { colaboradores, eletricistas } }
export function abrirPlanilhaNaLista(ctx) {
  const lista = ctx.lista()
  abrirImportador({
    titulo: `Importar planilha em ${lista.nome}`,
    ajuda:
      'A planilha precisa de uma coluna com o nome da pessoa. Se tiver, também: "Participou?" (Sim, Não ou Outros) e "Observação". ' +
      'Os nomes são procurados nos colaboradores (inclusive desligados), nos eletricistas e em Outras pessoas; quem já está na lista recebe a situação e a observação da planilha.',
    campos: CAMPOS_DA_PLANILHA_DA_LISTA,
    opcoes: [
      {
        chave: 'participaram',
        rotulo: 'Quem está na planilha participou (marcar como Participou)',
        ajuda: 'Vale para as linhas sem "Participou?" preenchido. Use quando a planilha é a lista de quem esteve na ação.',
        // Lista de um dia que já passou: a planilha costuma ser a de quem participou.
        padrao: String(lista.data) < hojeISO(),
      },
      {
        chave: 'convidados',
        rotulo: 'Incluir quem não está no cadastro como convidado (só o nome)',
        ajuda: 'Deixe desmarcado se todo mundo da planilha deveria estar no cadastro: assim dá para conferir os nomes que não foram achados.',
      },
    ],
    preparar: (registros, opcoes) => {
      const { colaboradores, eletricistas = [], outrasPessoas = [] } = ctx.dados()
      const previa = prepararPlanilhaDaLista({ registros, colaboradores, eletricistas, outrasPessoas, presencas: ctx.presencas() }, opcoes)
      const { naoEncontrados } = previa.contagem
      previa.extras = naoEncontrados
        ? [{ texto: `${plural(naoEncontrados, 'nome não foi achado', 'nomes não foram achados')} no cadastro e ${naoEncontrados === 1 ? 'fica' : 'ficam'} de fora. Confira a grafia ou marque a opção de incluir como convidado.`, erro: true }]
        : []
      return previa
    },
    indicadores: ({ contagem }) => [
      { rotulo: 'Entram na lista', valor: formatarNumero(contagem.novos) },
      { rotulo: 'Já estão na lista', valor: formatarNumero(contagem.existentes), detalhe: 'recebem o que a planilha disser' },
      { rotulo: 'Não achados no cadastro', valor: formatarNumero(contagem.naoEncontrados) },
      { rotulo: 'Repetidos ou sem nome', valor: formatarNumero(contagem.repetidos + contagem.ignorados) },
    ],
    situacoes: {
      novo: ['Entra na lista', 'forte'],
      existente: ['Já está na lista', ''],
      naoEncontrado: ['Não achado', 'alerta'],
    },
    colunas: [
      { rotulo: 'No cadastro', celula: noCadastro },
      { rotulo: 'Marcar como', celula: marcacaoDoItem },
      { rotulo: 'Observação', celula: (i) => (i.situacao === 'novo' || i.situacao === 'existente' ? i.observacao : '') },
    ],
    contarGravacoes: (previa) => contarGravacoesDaPlanilha(previa, ctx.pessoa.nome),
    textoDoBotao: (total) => `Gravar ${plural(total, 'pessoa', 'pessoas')} na lista`,
    textoDoFim: (total) => `Pronto: ${plural(total, 'pessoa gravada', 'pessoas gravadas')} na lista.`,
    gravar: (previa, _opcoes, aoAvancar) => importarPlanilhaNaLista(lista.id, previa, ctx.pessoa, aoAvancar),
  })
}
