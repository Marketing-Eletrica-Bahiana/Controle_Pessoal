import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CAMPOS_DA_PLANILHA_DA_LISTA, acharPessoaDaPlanilha, contarGravacoesDaPlanilha, lerParticipou, marcacaoDoItem, noCadastro,
  operacoesDaPlanilhaDaLista, prepararPlanilhaDaLista,
} from '../js/lib/planilhaDaLista.js'
import { sugerirMapeamento } from '../js/lib/importacao.js'

const colaboradores = [
  { id: 'c1', nome: 'Ana Exemplo Santos', setor: 'Comercial', loja: 'Aracaju', ativo: true },
  { id: 'c2', nome: 'Bruno Lima', setor: 'RH', loja: 'Aracaju', ativo: true },
  { id: 'c3', nome: 'Carla Desligada', setor: 'RH', loja: 'Aracaju', ativo: false },
  { id: 'c4', nome: 'Bruno Lima Souza', setor: 'TI', loja: 'Aracaju', ativo: true },
]
const eletricistas = [{ id: 'e1', nome: 'Eli Eletricista', vendedorNome: 'Ana', ativo: true }]
const registro = (linha, nome, participou = '', observacao = '') => ({ linha, valores: { nome, participou, observacao } })

describe('lista: importar planilha', () => {
  it('reconhece as colunas e o "Participou?"', () => {
    assert.deepEqual(sugerirMapeamento(['Nome completo', 'Presença', 'Obs.'], CAMPOS_DA_PLANILHA_DA_LISTA), { nome: 0, participou: 1, observacao: 2 })
    assert.deepEqual(['Sim', 'x', 1, true, 'Presente', 'NÃO', 'n', 'Faltou', 'Outros', '', 'talvez'].map(lerParticipou), [
      'participou', 'participou', 'participou', 'participou', 'participou', 'nao_participou', 'nao_participou', 'nao_participou', 'outros', '', null,
    ])
  })

  it('acha a pessoa pelo nome: igual, desligado, eletricista ou um só parecido', () => {
    const dados = { colaboradores, eletricistas }
    assert.equal(acharPessoaDaPlanilha('ANA exemplo santos', dados).pessoa.id, 'c1')
    assert.equal(acharPessoaDaPlanilha('Carla Desligada', dados).pessoa.id, 'c3')
    assert.equal(acharPessoaDaPlanilha('Eli Eletricista', dados).tipo, 'eletricista')
    assert.deepEqual([acharPessoaDaPlanilha('Ana Santos', dados).pessoa.id, acharPessoaDaPlanilha('Ana Santos', dados).parecido], ['c1', true])
    // "Bruno Lima" é igual a um e parecido com outro: vale o igual. "Lima" sozinho é ambíguo.
    assert.equal(acharPessoaDaPlanilha('Bruno Lima', dados).pessoa.id, 'c2')
    assert.equal(acharPessoaDaPlanilha('Lima', dados), null)
    assert.equal(acharPessoaDaPlanilha('Fulano de Tal', dados), null)
  })

  it('prévia: entra, já está, não encontrado, repetido e sem nome', () => {
    const presencas = [{ id: 'colaborador_c2', tipoPessoa: 'colaborador', pessoaId: 'c2', nome: 'Bruno Lima', convocado: true, presente: false }]
    const registros = [
      registro(2, 'Ana Santos', 'Sim', 'Chegou cedo'),
      registro(3, 'Bruno Lima', 'Não', 'Atestado'),
      registro(4, 'Fulano de Tal'),
      registro(5, 'ana exemplo santos'),
      registro(6, ''),
      registro(7, 'Eli Eletricista', 'talvez'),
      registro(8, 'Carla Desligada', 'Outros'),
    ]
    const base = { registros, colaboradores, eletricistas, presencas }
    const p = prepararPlanilhaDaLista(base)
    assert.deepEqual(p.itens.map((i) => i.situacao), ['novo', 'existente', 'naoEncontrado', 'repetido', 'ignorado', 'novo', 'novo'])
    assert.deepEqual(p.contagem, { novos: 3, existentes: 1, naoEncontrados: 1, repetidos: 1, ignorados: 1 })
    assert.match(p.itens[0].avisos.join(' '), /Nome parecido: entra como Ana Exemplo Santos/)
    assert.match(p.itens[5].avisos.join(' '), /não entendido/)
    assert.match(p.itens[6].avisos.join(' '), /Desligados/)
    assert.deepEqual([noCadastro(p.itens[0]), marcacaoDoItem(p.itens[0]), noCadastro(p.itens[5]), marcacaoDoItem(p.itens[5])], ['Ana Exemplo Santos', 'Participou', 'Eli Eletricista (eletricista)', ''])
    assert.equal(contarGravacoesDaPlanilha(p), 4)

    // Opções: sem "Participou?" conta como participou; quem não está no cadastro entra como convidado.
    const comOpcoes = prepararPlanilhaDaLista(base, { participaram: true, convidados: true })
    assert.deepEqual(comOpcoes.itens.map((i) => i.marcar ?? null), ['participou', 'nao_participou', 'participou', null, null, 'participou', 'outros'])
    assert.equal(comOpcoes.itens[2].situacao, 'novo')
    assert.equal(comOpcoes.itens[2].tipo, 'convidado')
  })

  it('grava quem entra como convocado e só muda o que a planilha diz em quem já está', () => {
    const presencas = [
      { id: 'colaborador_c2', tipoPessoa: 'colaborador', pessoaId: 'c2', nome: 'Bruno Lima', convocado: true, presente: true, horaCheckin: 'ANTES', checkinPor: 'Ana', status: 'participou', observacao: '' },
    ]
    const registros = [registro(2, 'Ana Exemplo Santos', 'Sim', 'Chegou cedo'), registro(3, 'Bruno Lima', 'Sim', ''), registro(4, 'Fulano de Tal', 'Não')]
    const previa = prepararPlanilhaDaLista({ registros, colaboradores, eletricistas, presencas }, { convidados: true })
    // Bruno já tem check-in e a planilha não muda nada nele: não grava.
    assert.equal(contarGravacoesDaPlanilha(previa, 'Pessoa'), 2)
    const ops = operacoesDaPlanilhaDaLista(previa, { listaId: 'l1', quem: 'Pessoa', novoId: () => 'novo1' })
    assert.deepEqual(ops.map((o) => [o.tipo, o.caminho]), [['definir', 'listas/l1/presencas/colaborador_c1'], ['definir', 'listas/l1/presencas/novo1']])
    assert.deepEqual(
      [ops[0].dados.convocado, ops[0].dados.presente, ops[0].dados.status, ops[0].dados.horaCheckin, ops[0].dados.checkinPor, ops[0].dados.observacao, ops[0].dados.detalhe],
      [true, true, 'participou', null, 'Pessoa', 'Chegou cedo', 'Comercial · Aracaju'],
    )
    assert.deepEqual([ops[1].dados.tipoPessoa, ops[1].dados.convocado, ops[1].dados.presente, ops[1].dados.status], ['convidado', true, false, 'nao_participou'])

    // Bruno marcado como "Não" na planilha: perde o check-in; observação nova entra; vazia não apaga.
    const mudou = prepararPlanilhaDaLista({ registros: [registro(2, 'Bruno Lima', 'Não', 'Atestado')], colaboradores, eletricistas, presencas })
    assert.deepEqual(operacoesDaPlanilhaDaLista(mudou, { listaId: 'l1', quem: 'Pessoa', novoId: () => 'x' })[0], {
      tipo: 'atualizar',
      caminho: 'listas/l1/presencas/colaborador_c2',
      dados: { presente: false, status: 'nao_participou', horaCheckin: null, checkinPor: null, observacao: 'Atestado' },
    })
  })
})
