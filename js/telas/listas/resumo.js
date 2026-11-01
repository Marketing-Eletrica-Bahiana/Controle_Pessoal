// Aba Resumo da lista: presentes, ausentes (convocados que não vieram) e não convocados que vieram.
// No Treinamento Comercial, destaca quem do setor comercial foi convocado e faltou.
import { formatarHora } from '../../lib/datas.js'
import { TIPOS_DE_PESSOA, resumoDaLista } from '../../lib/listas.js'
import { formatarNumero, plural } from '../../lib/texto.js'
import { bloco, indicadores, tabela } from '../../ui/componentes.js'
import { el, trocar } from '../../ui/dom.js'

// ctx: { lista(), presencas(), dados() => { colaboradores } }
export function montarResumo(caixa, ctx) {
  const conteudo = el('div', { class: 'pagina' })
  caixa.replaceChildren(conteudo)

  const tabelaDe = (pessoas, { comHora = false } = {}) =>
    pessoas.length
      ? tabela({
          itens: pessoas,
          classe: 'tabela--compacta',
          colunas: [
            { rotulo: 'Nome', principal: true, celula: (p) => el('span', { class: 'tabela__nome' }, p.nome) },
            { rotulo: 'Tipo', celula: (p) => TIPOS_DE_PESSOA[p.tipoPessoa] ?? '' },
            { rotulo: 'Detalhe', celula: (p) => p.detalhe ?? '' },
            comHora && { rotulo: 'Check-in', classe: 'numero', celula: (p) => (p.horaCheckin ? formatarHora(p.horaCheckin) : '') },
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
          r.comercialFaltou.length > 0 && tabelaDe(r.comercialFaltou),
        ),
      el(
        'div',
        { class: 'grade-duas' },
        bloco({ titulo: `Ausentes (${formatarNumero(r.ausentes.length)})`, icone: 'user-x', descricao: 'Convocados que não fizeram check-in.' }, tabelaDe(r.ausentes)),
        bloco({ titulo: `Não convocados que vieram (${formatarNumero(r.naoConvocados.length)})`, icone: 'user-plus' }, tabelaDe(r.naoConvocados, { comHora: true })),
      ),
      r.porMarca.size > 0 &&
        bloco(
          { titulo: 'Pessoas enviadas pelas marcas', icone: 'handshake' },
          el(
            'ul',
            { class: 'lista-simples' },
            [...r.porMarca].map(([marca, pessoas]) =>
              el('li', {}, el('strong', {}, `${marca}: `), pessoas.map((p) => `${p.nome}${p.presente ? '' : ' (não veio)'}`).join(', ')),
            ),
          ),
        ),
      bloco({ titulo: `Presentes (${formatarNumero(r.presentes.length)})`, icone: 'circle-check' }, tabelaDe(r.presentes, { comHora: true })),
    )
  }

  desenhar()
  return { atualizar: desenhar }
}
