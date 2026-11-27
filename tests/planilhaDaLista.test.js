import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CAMPOS_DA_PLANILHA_DA_LISTA, acharPessoaDaPlanilha, contarGravacoesDaPlanilha, contarNaoAchados, lerParticipou, marcacaoDoItem, noCadastro,
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

  it('acha também em Outras pessoas (Diretoria, prestadores) e grava com o grupo', () => {
    const outrasPessoas = [
      { id: 'o1', nome: 'Diretor Exemplo', grupo: 'Diretoria', empresa: '', ativo: true },
      { id: 'o2', nome: 'Prestador Antigo', grupo: 'Prestador de serviço', empresa: 'Segurança', ativo: false },
    ]
    const dados = { colaboradores, eletricistas, outrasPessoas }
    assert.deepEqual([acharPessoaDaPlanilha('diretor exemplo', dados).tipo, acharPessoaDaPlanilha('diretor exemplo', dados).pessoa.id], ['outro', 'o1'])
    assert.equal(acharPessoaDaPlanilha('Prestador Antigo', dados).pessoa.id, 'o2')
    assert.equal(acharPessoaDaPlanilha('Diretor', dados).parecido, true)
    const previa = prepararPlanilhaDaLista({ registros: [registro(2, 'Diretor Exemplo', 'Sim'), registro(3, 'Prestador Antigo')], ...dados, presencas: [] })
    assert.equal(noCadastro(previa.itens[0]), 'Diretor Exemplo (Diretoria)')
    assert.ok(previa.itens[1].avisos.includes('Está desativada em Outras pessoas.'))
    const [operacao] = operacoesDaPlanilhaDaLista(previa, { listaId: 'l1', quem: 'Ivie', novoId: () => 'x' })
    assert.equal(operacao.caminho, 'listas/l1/presencas/outro_o1')
    assert.deepEqual([operacao.dados.tipoPessoa, operacao.dados.grupo, operacao.dados.presente, operacao.dados.convocado], ['outro', 'Diretoria', true, true])
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

    // Sem poder cadastrar, quem não foi achado fica de fora.
    assert.equal(p.itens[2].adicionar, false)
    assert.deepEqual(contarNaoAchados(p), { cadastrar: 0, deFora: 1 })

    // Opções: sem "Participou?" conta como participou; quem não foi achado vem marcado para Outras pessoas (grupo Outro).
    const comOpcoes = prepararPlanilhaDaLista(base, { participaram: true, cadastrarNaoAchados: true })
    assert.deepEqual(comOpcoes.itens.map((i) => i.marcar ?? null), ['participou', 'nao_participou', 'participou', null, null, 'participou', 'outros'])
    assert.deepEqual([comOpcoes.itens[2].situacao, comOpcoes.itens[2].adicionar, comOpcoes.itens[2].grupo], ['naoEncontrado', true, 'Outro'])
    assert.equal(contarGravacoesDaPlanilha(comOpcoes), 5)
    assert.equal(marcacaoDoItem(comOpcoes.itens[2]), 'Participou')
    // A escolha da linha (desmarcar, trocar o grupo) vale quando a prévia é refeita.
    const desmarcado = prepararPlanilhaDaLista(base, { cadastrarNaoAchados: true, escolhas: new Map([[4, { adicionar: false, grupo: 'Diretoria' }]]) })
    assert.deepEqual([desmarcado.itens[2].adicionar, desmarcado.itens[2].grupo], [false, 'Diretoria'])
    assert.deepEqual(contarNaoAchados(desmarcado), { cadastrar: 0, deFora: 1 })
  })

  it('não achado marcado: cadastra em Outras pessoas e entra na lista', () => {
    const registros = [registro(2, 'Breno Alves Dantas', 'Sim', 'Chegou com a família'), registro(3, 'Camila Oliveira')]
    const escolhas = new Map([[2, { adicionar: true, grupo: 'Prestador de serviço' }], [3, { adicionar: false, grupo: 'Outro' }]])
    const previa = prepararPlanilhaDaLista({ registros, colaboradores, eletricistas, presencas: [] }, { cadastrarNaoAchados: true, escolhas })
    let n = 0
    const ops = operacoesDaPlanilhaDaLista(previa, { listaId: 'l1', quem: 'Ivie', novoId: () => `o${++n}`, agora: () => 'AGORA' })
    assert.deepEqual(ops.map((o) => [o.tipo, o.caminho]), [['definir', 'outrasPessoas/o1'], ['definir', 'listas/l1/presencas/outro_o1']])
    assert.deepEqual(ops[0].dados, { nome: 'Breno Alves Dantas', grupo: 'Prestador de serviço', empresa: '', ativo: true, criadoEm: 'AGORA' })
    assert.deepEqual(
      [ops[1].dados.tipoPessoa, ops[1].dados.pessoaId, ops[1].dados.grupo, ops[1].dados.convocado, ops[1].dados.presente, ops[1].dados.observacao],
      ['outro', 'o1', 'Prestador de serviço', true, true, 'Chegou com a família'],
    )
    assert.equal(contarGravacoesDaPlanilha(previa), 1)
  })

  it('grava quem entra como convocado e só muda o que a planilha diz em quem já está', () => {
    const presencas = [
      { id: 'colaborador_c2', tipoPessoa: 'colaborador', pessoaId: 'c2', nome: 'Bruno Lima', convocado: true, presente: true, horaCheckin: 'ANTES', checkinPor: 'Ana', status: 'participou', observacao: '' },
    ]
    const registros = [registro(2, 'Ana Exemplo Santos', 'Sim', 'Chegou cedo'), registro(3, 'Bruno Lima', 'Sim', ''), registro(4, 'Fulano de Tal', 'Não')]
    const previa = prepararPlanilhaDaLista({ registros, colaboradores, eletricistas, presencas })
    // Bruno já tem check-in e a planilha não muda nada nele: não grava. Fulano não foi achado e fica de fora.
    assert.equal(contarGravacoesDaPlanilha(previa, 'Pessoa'), 1)
    const ops = operacoesDaPlanilhaDaLista(previa, { listaId: 'l1', quem: 'Pessoa', novoId: () => 'novo1', agora: () => 'AGORA' })
    assert.deepEqual(ops.map((o) => [o.tipo, o.caminho]), [['definir', 'listas/l1/presencas/colaborador_c1']])
    assert.deepEqual(
      [ops[0].dados.convocado, ops[0].dados.presente, ops[0].dados.status, ops[0].dados.horaCheckin, ops[0].dados.checkinPor, ops[0].dados.observacao, ops[0].dados.detalhe],
      [true, true, 'participou', null, 'Pessoa', 'Chegou cedo', 'Comercial · Aracaju'],
    )
    // Convidado que já está na lista (achado pelo nome) recebe o que a planilha diz.
    const comConvidado = prepararPlanilhaDaLista({ registros: [registro(2, 'Visita Exemplo', 'Não')], colaboradores, eletricistas, presencas: [{ id: 'v1', tipoPessoa: 'convidado', pessoaId: '', nome: 'Visita Exemplo', convocado: false, presente: false }] })
    assert.deepEqual(operacoesDaPlanilhaDaLista(comConvidado, { listaId: 'l1', quem: 'Pessoa', novoId: () => 'x', agora: () => 'A' })[0].caminho, 'listas/l1/presencas/v1')

    // Bruno marcado como "Não" na planilha: perde o check-in; observação nova entra; vazia não apaga.
    const mudou = prepararPlanilhaDaLista({ registros: [registro(2, 'Bruno Lima', 'Não', 'Atestado')], colaboradores, eletricistas, presencas })
    assert.deepEqual(operacoesDaPlanilhaDaLista(mudou, { listaId: 'l1', quem: 'Pessoa', novoId: () => 'x' })[0], {
      tipo: 'atualizar',
      caminho: 'listas/l1/presencas/colaborador_c2',
      dados: { presente: false, status: 'nao_participou', horaCheckin: null, checkinPor: null, observacao: 'Atestado' },
    })
  })
})
