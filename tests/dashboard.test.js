import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  anosDisponiveis, descricaoDoPeriodo, listasAbertas, listasDoPeriodo, numerosGerais, rankingDeFornecedores, resumoDosTreinamentos,
} from '../js/lib/dashboard.js'

const listas = [
  { id: 'a', nome: 'CAE Ago', tipo: 'Treinamento CAE', data: '2026-08-10', status: 'encerrada', fornecedores: ['leg', 'sop'] },
  { id: 'b', nome: 'Com Out', tipo: 'Treinamento Comercial', data: '2026-10-22', status: 'encerrada', fornecedores: ['leg'] },
  { id: 'c', nome: 'CAE Nov', tipo: 'Treinamento CAE', data: '2026-11-06', status: 'aberta', fornecedores: ['tra'] },
  { id: 'd', nome: 'Aniversariantes', tipo: 'Aniversariantes do mês', data: '2026-10-01', status: 'aberta', fornecedores: [] },
  { id: 'e', nome: 'Evento antigo', tipo: 'Evento', data: '2025-12-01', status: 'aberta', fornecedores: ['leg'] },
]
const hoje = '2026-10-31'

describe('dashboard', () => {
  it('números gerais: ativos por loja e listas realizadas no ano', () => {
    const n = numerosGerais({
      colaboradores: [{ loja: 'Aracaju', ativo: true }, { loja: 'Aracaju', ativo: false }, { loja: 'Lauro de Freitas', ativo: true }],
      fornecedores: [{ ativo: true }, { ativo: false }],
      listas,
      eletricistasAtivos: 42,
      hoje,
    })
    assert.deepEqual(n, { colaboradores: 2, porLoja: { 'Salvador (Matriz)': 0, 'Lauro de Freitas': 1, Aracaju: 1 }, eletricistas: 42, fornecedores: 1, listasNoAno: 2, ano: 2026 })
  })

  it('período: só listas que já aconteceram, sem os controles de aniversário', () => {
    assert.deepEqual(listasDoPeriodo(listas, { ano: 2026, mes: 0 }, hoje).map((l) => l.id), ['a', 'b'])
    assert.deepEqual(listasDoPeriodo(listas, { ano: 2026, mes: 10 }, hoje).map((l) => l.id), ['b'])
    assert.equal(descricaoDoPeriodo({ ano: 2026, mes: 0 }), 'ano de 2026')
    assert.equal(descricaoDoPeriodo({ ano: 2026, mes: 3 }), 'Março de 2026')
    assert.deepEqual(anosDisponiveis(listas, 2026), [2026, 2025])
  })

  it('ranking de participações por marca', () => {
    const fornecedores = [{ id: 'leg', nome: 'Legrand' }, { id: 'sop', nome: 'Soprano' }, { id: 'tra', nome: 'Tramontina' }]
    const { ranking, participaram } = rankingDeFornecedores(fornecedores, listasDoPeriodo(listas, { ano: 2026, mes: 0 }, hoje))
    assert.deepEqual(ranking.map((r) => [r.fornecedor.nome, r.vezes]), [['Legrand', 2], ['Soprano', 1]])
    assert.equal(participaram, 2)
  })

  it('treinamentos com presença média', () => {
    const contagens = new Map([
      ['a', { convocados: 20, presentesConvocados: 15, presentes: 17 }],
      ['b', { convocados: 10, presentesConvocados: 5, presentes: 5 }],
    ])
    const r = resumoDosTreinamentos(listas.slice(0, 2), contagens)
    assert.deepEqual(r.treinamentos.map((t) => [t.lista.id, t.taxa]), [['b', 50], ['a', 75]])
    assert.equal(r.mediaDaTaxa, 63)
    assert.equal(r.mediaDePresentes, 11)
    assert.equal(resumoDosTreinamentos([], new Map()).mediaDaTaxa, null)
  })

  it('listas abertas: as próximas primeiro', () => {
    assert.deepEqual(listasAbertas(listas, hoje).map((l) => l.id), ['c', 'e'])
  })
})
