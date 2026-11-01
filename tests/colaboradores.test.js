import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CABECALHO_DA_LISTA, CAMPOS_DA_PLANILHA, SEM_SETOR, ajustesDeLideranca, contarPorLoja, ehSetorComercial, filtrarColaboradores,
  liderancasAoDefinirResponsaveis, linhaDaLista, normalizarLideranca, normalizarLoja, operacoesDaImportacao, prepararImportacao,
  resumoDosSetores, validarColaborador,
} from '../js/lib/colaboradores.js'
import { acharCabecalho, exemplosDaColuna, extrairRegistros, nomeDaColuna, sugerirMapeamento } from '../js/lib/importacao.js'

const setores = [
  { id: 'comercial', nome: 'Comercial', gerentes: ['g1'], supervisores: ['s1'] },
  { id: 'logistica', nome: 'Logística', gerentes: [], supervisores: [] },
]
const colaboradores = [
  { id: 'g1', nome: 'Gabriel Gerente', setor: 'Comercial', loja: 'Salvador (Matriz)', lideranca: 'Gerente', ativo: true },
  { id: 's1', nome: 'Sara Supervisora', setor: 'Comercial', loja: 'Aracaju', lideranca: 'Supervisor', ativo: true },
  { id: 'v1', nome: 'Vítor Vendedor', setor: 'comercial', loja: 'Lauro de Freitas', lideranca: '', ativo: true },
  { id: 'l1', nome: 'Lia Logística', setor: 'Logística', loja: 'Salvador (Matriz)', lideranca: '', ativo: false },
  { id: 'x1', nome: 'Xavier Sem Setor', setor: '', loja: 'Salvador (Matriz)', lideranca: '', ativo: true },
]

describe('colaboradores: cadastro', () => {
  const base = { nome: 'Nova Pessoa', setor: 'comercial', loja: 'Aracaju', cargo: 'Vendedora', lideranca: '', aniversario: '', admissao: '' }

  it('usa o nome do setor que já existe e guarda só dia e mês do aniversário', () => {
    const r = validarColaborador({ ...base, aniversario: '25/12', admissao: '01/03/2020' }, { colaboradores, setores })
    assert.ok(r.valido)
    assert.equal(r.dados.setor, 'Comercial')
    assert.equal(r.dados.nascimentoDia, 25)
    assert.equal(r.dados.nascimentoMes, 12)
    assert.equal(r.dados.admissao, '2020-03-01')
    assert.ok(!('nascimentoAno' in r.dados))
  })

  it('recusa nome repetido, loja fora da lista e datas erradas', () => {
    const r = validarColaborador({ ...base, nome: 'vitor  VENDEDOR', loja: 'Feira', aniversario: '31/02', admissao: '01/01/2099' }, { colaboradores, setores })
    assert.match(r.erros.nome, /Já existe/)
    assert.equal(r.erros.loja, 'Escolha a loja.')
    assert.match(r.erros.aniversario, /dia e mês/)
    assert.match(r.erros.admissao, /futuro/)
    assert.ok(validarColaborador({ ...base, nome: 'Vítor Vendedor' }, { colaboradores, setores, idAtual: 'v1' }).valido)
  })

  it('reconhece lojas e lideranças escritas de vários jeitos', () => {
    assert.equal(normalizarLoja('MATRIZ'), 'Salvador (Matriz)')
    assert.equal(normalizarLoja('Loja Lauro'), 'Lauro de Freitas')
    assert.equal(normalizarLoja('aracaju - SE'), 'Aracaju')
    assert.equal(normalizarLoja('Feira de Santana'), null)
    assert.equal(normalizarLoja(''), '')
    assert.equal(normalizarLideranca('gerente comercial'), 'Gerente')
    assert.equal(normalizarLideranca('Supervisora'), 'Supervisor')
    assert.equal(normalizarLideranca('não'), '')
    assert.equal(normalizarLideranca('Coordenador'), null)
    assert.ok(ehSetorComercial('Comercial Varejo'))
    assert.ok(ehSetorComercial('Vendas'))
    assert.ok(!ehSetorComercial('Logística'))
  })
})

describe('colaboradores: lista e setores', () => {
  it('filtra por setor, loja, liderança, situação e busca', () => {
    assert.deepEqual(filtrarColaboradores(colaboradores, { setor: 'COMERCIAL' }).map((c) => c.id), ['g1', 's1', 'v1'])
    assert.deepEqual(filtrarColaboradores(colaboradores, { loja: 'Aracaju' }).map((c) => c.id), ['s1'])
    assert.deepEqual(filtrarColaboradores(colaboradores, { lideranca: 'sem' }).map((c) => c.id), ['v1', 'x1'])
    assert.deepEqual(filtrarColaboradores(colaboradores, { situacao: 'inativos' }).map((c) => c.id), ['l1'])
    assert.deepEqual(filtrarColaboradores(colaboradores, { setor: SEM_SETOR }).map((c) => c.id), ['x1'])
    assert.deepEqual(filtrarColaboradores(colaboradores, { busca: 'vitor' }).map((c) => c.id), ['v1'])
  })

  it('conta por loja e monta os cartões dos setores só com ativos', () => {
    const { porLoja, total } = contarPorLoja(colaboradores.slice(0, 3))
    assert.deepEqual(porLoja, { 'Salvador (Matriz)': 1, 'Lauro de Freitas': 1, Aracaju: 1 })
    assert.equal(total, 3)
    const resumo = resumoDosSetores(setores, colaboradores)
    const comercial = resumo.setores.find((s) => s.setor.id === 'comercial')
    assert.equal(comercial.total, 3)
    assert.deepEqual(comercial.gerentes.map((c) => c.id), ['g1'])
    assert.equal(resumo.setores.find((s) => s.setor.id === 'logistica').total, 0)
    assert.deepEqual(resumo.semSetor.map((c) => c.id), ['x1'])
  })

  it('exporta a lista com aniversário sem ano', () => {
    assert.equal(CABECALHO_DA_LISTA[0], 'Nome')
    assert.deepEqual(linhaDaLista({ nome: 'A', setor: 'B', loja: 'Aracaju', cargo: '', lideranca: '', nascimentoDia: 5, nascimentoMes: 3, admissao: '2020-03-01', ativo: true }), ['A', 'B', 'Aracaju', '', '', '05/03', '01/03/2020', 'Ativo'])
  })
})

describe('colaboradores: lideranças', () => {
  it('marcar gerente no cadastro entra na lista do setor', () => {
    const ajustes = ajustesDeLideranca({ setores, id: 'v1', antes: { setor: 'Comercial', lideranca: '' }, depois: { setor: 'Comercial', lideranca: 'Gerente' } })
    assert.deepEqual(ajustes, [{ setorId: 'comercial', campo: 'gerentes', acao: 'incluir' }])
  })

  it('trocar de setor sai das listas do setor antigo', () => {
    const ajustes = ajustesDeLideranca({ setores, id: 's1', antes: { setor: 'Comercial', lideranca: 'Supervisor' }, depois: { setor: 'Logística', lideranca: 'Supervisor' } })
    assert.deepEqual(ajustes, [
      { setorId: 'comercial', campo: 'supervisores', acao: 'tirar' },
      { setorId: 'logistica', campo: 'supervisores', acao: 'incluir' },
    ])
  })

  it('tirar a liderança tira de todas as listas; sem mudança, nada muda', () => {
    assert.deepEqual(ajustesDeLideranca({ setores, id: 'g1', antes: { setor: 'Comercial', lideranca: 'Gerente' }, depois: { setor: 'Comercial', lideranca: '' } }), [
      { setorId: 'comercial', campo: 'gerentes', acao: 'tirar' },
    ])
    assert.deepEqual(ajustesDeLideranca({ setores, id: 'g1', antes: { setor: 'Comercial', lideranca: 'Gerente' }, depois: { setor: 'comercial', lideranca: 'Gerente' } }), [])
  })

  it('definir responsáveis do setor acerta a liderança das pessoas', () => {
    const mudancas = liderancasAoDefinirResponsaveis({ setores, colaboradores, setorId: 'comercial', gerentes: ['v1'], supervisores: ['g1'] })
    assert.deepEqual(mudancas.sort((a, b) => a.id.localeCompare(b.id)), [
      { id: 'g1', lideranca: 'Supervisor' },
      { id: 's1', lideranca: '' },
      { id: 'v1', lideranca: 'Gerente' },
    ])
  })
})

describe('importação de planilha', () => {
  const linhas = [
    ['Relatório de pessoal', '', ''],
    [],
    ['Nome do colaborador', 'Departamento', 'Loja', 'Cargo', 'Liderança', 'Data de Nascimento', 'Admissão'],
    ['Vítor Vendedor', 'Comercial', 'Matriz', 'Vendedor', '', '15/03/1990', 45000],
    ['Nova Pessoa', 'Financeiro', 'Lauro', 'Analista', 'Gerente', 32950, '01/02/2021'],
    ['', '', '', '', '', '', ''],
    ['nova pessoa', 'Financeiro', '', '', '', '', ''],
    ['', 'Sem nome', '', '', '', '', ''],
    ['Pessoa Estranha', 'financeiro', 'Feira', '', 'Coordenador', 'xx', '2020'],
  ]

  it('acha o cabeçalho e sugere as colunas', () => {
    const indice = acharCabecalho(linhas, CAMPOS_DA_PLANILHA)
    assert.equal(indice, 2)
    const mapa = sugerirMapeamento(linhas[indice], CAMPOS_DA_PLANILHA)
    assert.deepEqual(mapa, { nome: 0, setor: 1, loja: 2, cargo: 3, lideranca: 4, nascimento: 5, admissao: 6 })
    assert.equal(nomeDaColuna(0), 'A')
    assert.equal(nomeDaColuna(27), 'AB')
    assert.deepEqual(exemplosDaColuna(linhas, indice, 1, 2), ['Comercial', 'Financeiro'])
  })

  it('monta a prévia com novos, existentes, repetidos e avisos', () => {
    const mapa = sugerirMapeamento(linhas[2], CAMPOS_DA_PLANILHA)
    const registros = extrairRegistros(linhas, 2, mapa)
    assert.equal(registros[0].linha, 4)
    const previa = prepararImportacao({ registros, colaboradores, setores })
    assert.deepEqual(previa.contagem, { novos: 2, existentes: 1, repetidos: 1, ignorados: 1 })
    assert.deepEqual(previa.setoresNovos, ['Financeiro'])
    const vitor = previa.itens[0]
    assert.equal(vitor.situacao, 'existente')
    assert.equal(vitor.id, 'v1')
    assert.deepEqual(vitor.dados, { nome: 'Vítor Vendedor', setor: 'Comercial', loja: 'Salvador (Matriz)', cargo: 'Vendedor', nascimentoDia: 15, nascimentoMes: 3, admissao: '2023-03-15' })
    const nova = previa.itens[1]
    assert.equal(nova.dados.nascimentoDia, 18)
    assert.equal(nova.dados.nascimentoMes, 3)
    assert.equal(nova.dados.admissao, '2021-02-01')
    const estranha = previa.itens.at(-1)
    assert.equal(estranha.dados.setor, 'Financeiro')
    assert.equal(estranha.avisos.length, 4)
  })

  it('grava setores novos, colaboradores novos e só os campos preenchidos dos existentes', () => {
    const mapa = sugerirMapeamento(linhas[2], CAMPOS_DA_PLANILHA)
    const previa = prepararImportacao({ registros: extrairRegistros(linhas, 2, mapa), colaboradores, setores })
    let n = 0
    const ops = operacoesDaImportacao(previa, {
      setores,
      novoId: () => `novo${++n}`,
      agora: () => 'AGORA',
      incluirNaLista: (...ids) => ({ incluir: ids }),
    })
    const setorFinanceiro = ops.find((o) => o.caminho === 'setores/financeiro')
    assert.deepEqual(setorFinanceiro.dados, { nome: 'Financeiro', gerentes: ['novo1'], supervisores: [] })
    const criada = ops.find((o) => o.caminho === 'colaboradores/novo1')
    assert.equal(criada.dados.nome, 'Nova Pessoa')
    assert.equal(criada.dados.ativo, true)
    assert.equal(criada.dados.lideranca, 'Gerente')
    const atualizado = ops.find((o) => o.caminho === 'colaboradores/v1')
    assert.equal(atualizado.tipo, 'atualizar')
    assert.ok(!('nome' in atualizado.dados))
    assert.equal(atualizado.dados.atualizadoEm, 'AGORA')
    const semAtualizar = operacoesDaImportacao(previa, { setores, atualizarExistentes: false, novoId: () => 'z', agora: () => 0, incluirNaLista: () => 0 })
    assert.ok(!semAtualizar.some((o) => o.caminho === 'colaboradores/v1'))
  })

  it('supervisor que vira gerente pela planilha troca de lista no setor', () => {
    const registros = [{ linha: 2, valores: { nome: 'Sara Supervisora', setor: 'Comercial', lideranca: 'Gerente' } }]
    const previa = prepararImportacao({ registros, colaboradores, setores })
    const ops = operacoesDaImportacao(previa, {
      setores,
      novoId: () => 'x',
      agora: () => 'AGORA',
      incluirNaLista: (...ids) => ({ incluir: ids }),
      tirarDaLista: (...ids) => ({ tirar: ids }),
    })
    const doSetor = ops.filter((o) => o.caminho === 'setores/comercial').map((o) => o.dados)
    assert.deepEqual(doSetor, [{ gerentes: { incluir: ['s1'] } }, { supervisores: { tirar: ['s1'] } }])
  })

  it('mostra datas do Excel legíveis nos exemplos da coluna', () => {
    assert.deepEqual(exemplosDaColuna([['Admissão'], [45000], ['15/03/2020']], 0, 0, 3, 'data'), ['15/03/2023', '15/03/2020'])
  })
})
