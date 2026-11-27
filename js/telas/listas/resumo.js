// Aba Resumo da lista: presentes, ausentes (convocados que não vieram) e não convocados que vieram, com a situação
// marcada no check-in (Não participou ou Outros) e a observação. No Treinamento Comercial, destaca quem do setor
// comercial foi convocado e faltou.
import { formatarHora } from '../../lib/datas.js'
import { nomeComFuncao, resumoDaLista, rotuloDaSituacao, situacaoNoCheckin, tipoDaPresenca } from '../../lib/listas.js'
import { formatarNumero, plural } from '../../lib/texto.js'
import { bloco, etiqueta, indicadores, tabela } from '../../ui/componentes.js'
import { el, trocar } from '../../ui/dom.js'

// ctx: { lista(), presencas(), dados() => { colaboradores } }
export function montarResumo(caixa, ctx) {
  const conteudo = el('div', { class: 'pagina' })
  caixa.replaceChildren(conteudo)

  // Ausentes mostram a situação marcada; a observação aparece quando alguém da tabela tem.
  const tabelaDe = (pessoas, { comHora = false, comSituacao = false } = {}) =>
    pessoas.length
      ? tabela({
          itens: pessoas,
          classe: 'tabela--compacta',
          colunas: [
            { rotulo: 'Nome', principal: true, celula: (p) => el('span', { class: 'tabela__nome' }, p.nome) },
            { rotulo: 'Tipo', celula: tipoDaPresenca },
            { rotulo: 'Detalhe', celula: (p) => p.detalhe ?? '' },
            comHora && { rotulo: 'Check-in', classe: 'numero', celula: (p) => (p.horaCheckin ? formatarHora(p.horaCheckin) : '') },
            comSituacao && {
              rotulo: 'Situação',
              celula: (p) => {
                const s = situacaoNoCheckin(p)
                return s ? etiqueta(rotuloDaSituacao(s), s === 'nao_participou' ? 'alerta' : 'marinho') : el('span', { class: 'texto-suave' }, 'Sem marcação')
              },
            },
            pessoas.some((p) => p.observacao) && { rotulo: 'Observação', ordenavel: false, celula: (p) => p.observacao ?? '' },
          ].filter(Boolean),
        })
      : el('p', { class: 'texto-suave' }, 'Ninguém.')

  function desenhar() {
    const lista = ctx.lista()
    const r = resumoDaLista(lista, ctx.presencas(), ctx.dados().colaboradores)
    const { conta } = r
    trocar(
      conteudo,
      indicadores([
        { rotulo: 'Convocados', valor: formatarNumero(conta.convocados) },
        { rotulo: 'Convocados presentes', valor: formatarNumero(conta.presentesConvocados), detalhe: conta.taxa === null ? 'Sem convocados' : `${conta.taxa}% de presença` },
        { rotulo: 'Ausentes', valor: formatarNumero(conta.ausentes), detalhe: 'convocados que não vieram' },
        { rotulo: 'Não convocados que vieram', valor: formatarNumero(conta.naoConvocadosPresentes) },
      ]),
      lista.tipo === 'Treinamento Comercial' &&
        bloco(
          {
            titulo: r.comercialFaltou.length ? `Do setor comercial, ${plural(r.comercialFaltou.length, 'faltou', 'faltaram')}` : 'Todo o setor comercial convocado participou',
            icone: r.comercialFaltou.length ? 'triangle-alert' : 'circle-check',
            classe: r.comercialFaltou.length ? 'bloco--alerta' : 'bloco--destaque',
            descricao: 'Colaboradores do setor comercial que foram convocados e não fizeram check-in.',
          },
          r.comercialFaltou.length > 0 && tabelaDe(r.comercialFaltou, { comSituacao: true }),
        ),
      bloco(
        {
          titulo: `Ausentes (${formatarNumero(r.ausentes.length)})`,
          icone: 'user-x',
          descricao: 'Convocados que não fizeram check-in, com o que foi marcado ao abrir o nome no check-in.',
        },
        tabelaDe(r.ausentes, { comSituacao: true }),
      ),
      bloco({ titulo: `Não convocados que vieram (${formatarNumero(r.naoConvocados.length)})`, icone: 'user-plus' }, tabelaDe(r.naoConvocados, { comHora: true })),
      r.porMarca.size > 0 &&
        bloco(
          { titulo: 'Pessoas enviadas pelas marcas', icone: 'handshake' },
          el(
            'ul',
            { class: 'lista-simples' },
            [...r.porMarca].map(([marca, pessoas]) =>
              el('li', {}, el('strong', {}, `${marca}: `), pessoas.map((p) => `${nomeComFuncao(p)}${p.presente ? '' : ' (não participou)'}`).join(', ')),
            ),
          ),
        ),
      bloco({ titulo: `Presentes (${formatarNumero(r.presentes.length)})`, icone: 'circle-check' }, tabelaDe(r.presentes, { comHora: true })),
    )
  }

  desenhar()
  return { atualizar: desenhar }
}
