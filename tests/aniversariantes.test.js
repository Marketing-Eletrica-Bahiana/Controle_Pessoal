import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  TIPO_EMPRESA, TIPO_MES, abasDoMes, aniversariantesDoMes, aniversariosDeEmpresa, contarStatus, ehHoje, faltandoNoControle,
  historicoDosAniversarios, idDoControle, listaDoControle, mesDoControle, mudancaDeStatus, nomeDoArquivoDoMes, nomeDoControle,
  presencaDoAniversariante,
} from '../js/lib/aniversariantes.js'

const colaboradores = [
  { id: 'a', nome: 'Ana', setor: 'Comercial', loja: 'Aracaju', nascimentoDia: 20, nascimentoMes: 11, admissao: '2020-11-05', ativo: true },
  { id: 'b', nome: 'Bia', setor: 'RH', loja: 'Salvador (Matriz)', nascimentoDia: 3, nascimentoMes: 11, admissao: '2026-11-10', ativo: true },
  { id: 'c', nome: 'Caio', setor: 'Logística', loja: 'Aracaju', nascimentoDia: 3, nascimentoMes: 11, admissao: '2015-11-30', ativo: false },
  { id: 'd', nome: 'Davi', setor: 'Compras', loja: 'Aracaju', nascimentoDia: null, nascimentoMes: null, admissao: null, ativo: true },
]

describe('aniversariantes', () => {
  it('do mês: ativos com o mês do nascimento, por dia', () => {
    assert.deepEqual(aniversariantesDoMes(colaboradores, 11).map((a) => [a.colaborador.id, a.dia]), [['b', 3], ['a', 20]])
    assert.deepEqual(aniversariantesDoMes(colaboradores, 5), [])
  })

  it('de empresa: só quem completa pelo menos um ano de casa', () => {
    assert.deepEqual(aniversariosDeEmpresa(colaboradores, 11, 2026).map((a) => [a.colaborador.id, a.dia, a.anos]), [['a', 5, 6]])
    assert.deepEqual(aniversariosDeEmpresa(colaboradores, 11, 2027).map((a) => [a.colaborador.id, a.anos]), [['a', 7], ['b', 1]])
    assert.ok(ehHoje(3, 11, { dia: 3, mes: 11, ano: 2026 }))
    assert.ok(!ehHoje(3, 10, { dia: 3, mes: 11, ano: 2026 }))
  })

  it('controle do mês tem ID e nome previsíveis', () => {
    assert.equal(idDoControle(TIPO_MES, 11, 2026), 'aniversariantes-2026-11')
    assert.equal(idDoControle(TIPO_EMPRESA, 3, 2027), 'aniversario-empresa-2027-03')
    assert.equal(nomeDoControle(TIPO_MES, 11, 2026), 'Aniversariantes de Novembro/2026')
    assert.equal(nomeDoControle(TIPO_EMPRESA, 11, 2026), 'Aniversário de empresa de Novembro/2026')
    assert.deepEqual(listaDoControle(TIPO_MES, 11, 2026), { nome: 'Aniversariantes de Novembro/2026', tipo: TIPO_MES, data: '2026-11-01', loja: '', local: '', fornecedores: [], status: 'aberta' })
    assert.deepEqual(mesDoControle({ data: '2026-11-01' }), { ano: 2026, mes: 11 })
    const p = presencaDoAniversariante(colaboradores[0])
    assert.deepEqual([p.status, p.presente, p.convocado, p.detalhe], ['pendente', false, true, 'Comercial · Aracaju'])
  })

  it('status: conta, grava "presente" junto e acha quem falta no controle', () => {
    assert.deepEqual(contarStatus([{ status: 'participou' }, { status: 'nao_participou' }, {}]), { pendente: 1, participou: 1, nao_participou: 1 })
    assert.deepEqual(mudancaDeStatus('participou', 'Ana', 'AGORA'), { status: 'participou', presente: true, horaCheckin: 'AGORA', checkinPor: 'Ana' })
    assert.deepEqual(mudancaDeStatus('nao_participou', 'Ana', 'AGORA'), { status: 'nao_participou', presente: false, horaCheckin: 'AGORA', checkinPor: 'Ana' })
    assert.deepEqual(mudancaDeStatus('pendente', 'Ana', 'AGORA'), { status: 'pendente', presente: false, horaCheckin: null, checkinPor: null })
    const doMes = aniversariantesDoMes(colaboradores, 11)
    assert.deepEqual(faltandoNoControle(doMes, [{ pessoaId: 'a' }]).map((a) => a.colaborador.id), ['b'])
  })

  it('histórico por pessoa e ranking de quem mais deixou de participar', () => {
    const { pessoas, ranking } = historicoDosAniversarios([
      { lista: { id: 'm10', tipo: TIPO_MES, data: '2026-10-01' }, presencas: [{ pessoaId: 'a', nome: 'Ana', status: 'nao_participou' }, { pessoaId: 'b', nome: 'Bia', status: 'participou' }] },
      { lista: { id: 'e11', tipo: TIPO_EMPRESA, data: '2026-11-01' }, presencas: [{ pessoaId: 'a', nome: 'Ana', status: 'nao_participou' }, { pessoaId: 'b', nome: 'Bia', status: 'nao_participou' }] },
      { lista: { id: 'm11', tipo: TIPO_MES, data: '2026-11-01' }, presencas: [{ pessoaId: 'c', nome: 'Caio' }] },
    ])
    assert.deepEqual(pessoas.map((p) => p.nome), ['Ana', 'Bia', 'Caio'])
    assert.deepEqual(pessoas[0].registros.map((r) => `${r.mes}/${r.ano} ${r.status}`), ['11/2026 nao_participou', '10/2026 nao_participou'])
    assert.deepEqual(ranking.map((p) => [p.nome, p.conta.nao_participou]), [['Ana', 2], ['Bia', 1]])
    assert.equal(pessoas[2].conta.pendente, 1)
  })

  it('planilha do mês com o status do controle', () => {
    const doMes = aniversariantesDoMes(colaboradores, 11)
    const deEmpresa = aniversariosDeEmpresa(colaboradores, 11, 2026)
    const abas = abasDoMes({ mes: 11, ano: 2026, doMes, deEmpresa, statusMes: new Map([['a', { status: 'participou', observacao: 'Postou foto' }]]), statusEmpresa: null })
    assert.deepEqual(abas[0].linhas, [
      ['03/11', 'Bia', 'RH', 'Salvador (Matriz)', 'Fora do controle', ''],
      ['20/11', 'Ana', 'Comercial', 'Aracaju', 'Participou', 'Postou foto'],
    ])
    assert.deepEqual(abas[1].linhas, [['05/11', 'Ana', 'Comercial', 'Aracaju', 6, 'Controle não gerado', '']])
    assert.equal(nomeDoArquivoDoMes(11, 2026), 'Aniversariantes Novembro-2026')
  })
})
