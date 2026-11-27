// Partes da aba Aniversariantes usadas pelas três telas (mês, controle e histórico) e pela parte Participação da
// aba Colaboradores (ranking dos aniversariantes).
import { STATUS_ANIVERSARIO, observacoesDaPessoa } from '../../lib/aniversariantes.js'
import { partesDeHoje } from '../../lib/datas.js'
import { endereco } from '../../lib/rotas.js'
import { formatarNumero } from '../../lib/texto.js'
import { abas, cabecalhoPagina, etiqueta, tabela } from '../../ui/componentes.js'
import { el } from '../../ui/dom.js'

// Mês escolhido fica guardado enquanto a pessoa navega.
export const periodo = { ...partesDeHoje() }

export const VARIANTE_DO_STATUS = { participou: 'forte', nao_participou: 'alerta', outros: 'marinho', pendente: '' }

export const linkDaPessoa = (p) => el('a', { class: 'tabela__nome', href: endereco('colaboradores', 'ficha', p.pessoaId) }, p.nome)

// Observações dos controles da pessoa ("Nov/2026: Postou foto"), as mais recentes primeiro.
export function listaDeObservacoes(pessoa) {
  const observacoes = observacoesDaPessoa(pessoa)
  if (!observacoes.length) return ''
  return el('ul', { class: 'observacoes' }, observacoes.map((o) => el('li', {}, el('strong', {}, `${o.rotulo}: `), o.texto)))
}

// Ranking dos controles (de historicoDosAniversarios), com as observações. destaque: 'participou' ou 'nao_participou'
// (coluna em destaque, logo depois do nome). itens: as linhas mostradas (o ranking inteiro, os 10 primeiros ou o
// resultado da busca); a posição vem sempre do ranking inteiro.
export function tabelaDoRankingDeAniversarios(ranking, { destaque, itens = ranking, limite, comSetor = false }) {
  const posicao = new Map(ranking.map((p, i) => [p.pessoaId, i + 1]))
  const ordem = destaque === 'participou' ? ['participou', 'nao_participou', 'pendente'] : ['nao_participou', 'participou', 'pendente']
  return tabela({
    itens,
    limite,
    chave: (p) => p.pessoaId,
    colunas: [
      { rotulo: 'Posição', classe: 'numero', ordem: (p) => posicao.get(p.pessoaId), celula: (p) => `${posicao.get(p.pessoaId)}º` },
      { rotulo: 'Nome', principal: true, celula: linkDaPessoa },
      comSetor && { rotulo: 'Setor', celula: (p) => p.colaborador?.setor || 'Sem setor' },
      ...ordem.map((status) => ({
        rotulo: STATUS_ANIVERSARIO[status],
        classe: 'numero',
        ordem: (p) => p.conta[status],
        celula: (p) => (status === destaque ? etiqueta(formatarNumero(p.conta[status]), VARIANTE_DO_STATUS[status]) : formatarNumero(p.conta[status])),
      })),
      { rotulo: 'Observações', ordenavel: false, celula: listaDeObservacoes },
    ].filter(Boolean),
  })
}

export function cabecalhoDaAba(ativa) {
  return [
    cabecalhoPagina({
      titulo: 'Aniversariantes',
      icone: 'cake',
      descricao: 'Aniversariantes do mês e de empresa, e o controle de quem participou da mensagem de Feliz Aniversário.',
    }),
    abas([
      { rotulo: 'Do mês', icone: 'calendar-days', href: '#/aniversariantes', ativo: ativa === 'mes' },
      { rotulo: 'Histórico', icone: 'history', href: '#/aniversariantes/historico', ativo: ativa === 'historico' },
    ]),
  ]
}
