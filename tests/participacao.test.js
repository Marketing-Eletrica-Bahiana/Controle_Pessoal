import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { TIPO_EMPRESA, TIPO_MES, historicoDosAniversarios } from '../js/lib/aniversariantes.js'
import { TIPOS_DE_LISTA } from '../js/lib/listas.js'
import {
  CABECALHO_DA_PARTICIPACAO, CABECALHO_DOS_ANIVERSARIOS, TIPOS_DA_PARTICIPACAO, TIPO_PADRAO, anosDasListas, aniversariosDosAtivos,
  controlesDaParticipacao, linhasDaParticipacao, linhasDosAniversarios, listasDaParticipacao, rankingDeParticipacao, tipoDaParticipacao,
} from '../js/lib/participacao.js'

const colaboradores = [
  { id: 'a', nome: 'Ana', setor: 'Comercial', loja: 'Aracaju', ativo: true },
  { id: 'b', nome: 'Bia', setor: 'RH', loja: 'Salvador (Matriz)', ativo: true },
  { id: 'c', nome: 'Caio', setor: 'Logística', loja: 'Aracaju', ativo: false },
  { id: 'd', nome: 'Davi', setor: 'Compras', loja: 'Aracaju' },
  { id: 'e', nome: 'Eva', setor: 'Marketing', loja: 'Lauro de Freitas', ativo: true },
]

const listas = [
  { id: 'acao1', tipo: 'Ação de Endomarketing', data: '2026-10-10' },
  { id: 'acao2', tipo: 'Ação de Endomarketing', data: '2026-11-20' },
  { id: 'futura', tipo: 'Ação de Endomarketing', data: '2026-12-15' },
  { id: 'antiga', tipo: 'Ação de Endomarketing', data: '2025-12-01' },
  { id: 'evento', tipo: 'Evento', data: '2026-11-01' },
  { id: 'aniv', tipo: TIPO_MES, data: '2026-11-01' },
  { id: 'emp', tipo: TIPO_EMPRESA, data: '2025-10-01' },
]

const colaborador = (pessoaId, convocado, presente) => ({ tipoPessoa: 'colaborador', pessoaId, convocado, presente })

describe('participação: listas do ranking', () => {
  it('tem um rótulo para cada tipo de lista e começa nas ações de endomarketing', () => {
    assert.deepEqual(TIPOS_DA_PARTICIPACAO.map((t) => t.valor).filter(Boolean).sort(), [...TIPOS_DE_LISTA].sort())
    assert.equal(TIPO_PADRAO, 'Ação de Endomarketing')
    assert.equal(tipoDaParticipacao('Evento').varios, 'eventos')
    assert.equal(tipoDaParticipacao('não existe').valor, TIPO_PADRAO)
  })

  it('escolhe as listas do tipo e do ano que já aconteceram, sem os aniversários', () => {
    const hoje = '2026-11-27'
    assert.deepEqual(listasDaParticipacao(listas, {}, hoje).map((l) => l.id), ['acao2', 'acao1', 'antiga'])
    assert.deepEqual(listasDaParticipacao(listas, { ano: '2026' }, hoje).map((l) => l.id), ['acao2', 'acao1'])
    assert.deepEqual(listasDaParticipacao(listas, { tipo: '', ano: '2026' }, hoje).map((l) => l.id), ['acao2', 'evento', 'acao1'])
    assert.deepEqual(listasDaParticipacao(listas, { tipo: 'Evento' }, hoje).map((l) => l.id), ['evento'])
    assert.deepEqual(controlesDaParticipacao(listas).map((l) => l.id), ['aniv', 'emp'])
    assert.deepEqual(controlesDaParticipacao(listas, { ano: '2026' }).map((l) => l.id), ['aniv'])
    assert.deepEqual(anosDasListas([...listas, { id: 'x', data: '' }]), ['2026', '2025'])
  })
})

describe('participação: rankings', () => {
  it('conta participou, convocado e faltou só dos ativos, quem mais participou primeiro', () => {
    const lidas = [
      { lista: listas[0], presencas: [colaborador('a', true, true), colaborador('b', true, false), colaborador('c', true, true), colaborador('e', false, true)] },
      { lista: listas[1], presencas: [colaborador('a', true, true), colaborador('b', true, true), colaborador('e', true, true), { tipoPessoa: 'eletricista', pessoaId: 'a', presente: true }] },
      { lista: listas[4], presencas: [colaborador('sumiu', true, true), colaborador('d', true, false)] },
    ]
    const { ranking, participacoes, semParticipar } = rankingDeParticipacao(lidas, colaboradores)
    // Ana e Eva participaram de 2, mas Ana não faltou; Bia faltou 1; Caio está desligado; Davi só faltou.
    assert.deepEqual(
      ranking.map((r) => [r.colaborador.nome, r.participou, r.convocado, r.faltou, r.ultima]),
      [['Ana', 2, 2, 0, '2026-11-20'], ['Eva', 2, 1, 0, '2026-11-20'], ['Bia', 1, 2, 1, '2026-11-20']],
    )
    assert.equal(participacoes, 5)
    assert.equal(semParticipar, 1)
    assert.deepEqual(rankingDeParticipacao([], colaboradores), { ranking: [], participacoes: 0, semParticipar: 4 })
    assert.equal(CABECALHO_DA_PARTICIPACAO[0], 'Posição')
    assert.deepEqual(linhasDaParticipacao(ranking)[2], [3, 'Bia', 'RH', 'Salvador (Matriz)', 1, 2, 1, '20/11/2026'])
  })

  it('aniversariantes: só os ativos, com as observações na planilha', () => {
    const { participaram } = historicoDosAniversarios([
      { lista: { id: 'm10', tipo: TIPO_MES, data: '2026-10-01' }, presencas: [{ pessoaId: 'c', nome: 'Caio', status: 'participou' }, { pessoaId: 'b', nome: 'Bia', status: 'participou', observacao: 'Postou foto' }] },
      { lista: { id: 'e11', tipo: TIPO_EMPRESA, data: '2026-11-01' }, presencas: [{ pessoaId: 'b', nome: 'Bia', status: 'participou', observacao: 'Mandou vídeo' }, { pessoaId: 'a', nome: 'Ana', status: 'participou' }] },
    ])
    const ativos = aniversariosDosAtivos(participaram, colaboradores)
    assert.deepEqual(ativos.map((p) => [p.colaborador.nome, p.conta.participou]), [['Bia', 2], ['Ana', 1]])
    assert.equal(CABECALHO_DOS_ANIVERSARIOS.at(-1), 'Observações')
    assert.deepEqual(linhasDosAniversarios(ativos), [
      [1, 'Bia', 'RH', 'Salvador (Matriz)', 2, 0, 0, 'Nov/2026 (empresa): Mandou vídeo | Out/2026: Postou foto'],
      [2, 'Ana', 'Comercial', 'Aracaju', 1, 0, 0, ''],
    ])
  })
})
