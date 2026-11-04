import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CABECALHO_DA_LISTA, CAMPOS_DA_PLANILHA, LIDERANCAS, SEM_SETOR, ajustesDeLideranca, contarPorLoja, ehSetorComercial, filtrarColaboradores,
  filtrarPaisEMaes, liderancasAoDefinirResponsaveis, linhaDaLista, normalizarLideranca, normalizarLoja, normalizarPaiOuMae, normalizarTemFilhos,
  operacoesDaImportacao, paiOuMaeDoGenero, prepararImportacao, resumoDosSetores, validarColaborador,
} from '../js/lib/colaboradores.js'
import { acharCabecalho, exemplosDaColuna, extrairRegistros, lerTextoDoCsv, nomeDaColuna, sugerirMapeamento } from '../js/lib/importacao.js'

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

  it('aceita os três níveis de liderança, ou nenhum', () => {
    assert.deepEqual(LIDERANCAS, ['Gerente', 'Coordenador', 'Supervisor'])
    for (const lideranca of ['Gerente', 'Coordenador', 'Supervisor', '']) {
      assert.equal(validarColaborador({ ...base, lideranca }, { colaboradores, setores }).dados.lideranca, lideranca)
    }
    assert.equal(validarColaborador({ ...base, lideranca: 'Diretor' }, { colaboradores, setores }).erros.lideranca, 'Escolha a liderança.')
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
    assert.equal(normalizarLideranca('Coordenador'), 'Coordenador')
    assert.equal(normalizarLideranca('COORDENADORA de Vendas'), 'Coordenador')
    assert.equal(normalizarLideranca('Diretor'), null)
    assert.ok(ehSetorComercial('Comercial Varejo'))
    assert.ok(ehSetorComercial('Vendas'))
    assert.ok(!ehSetorComercial('Logística'))
  })

  it('guarda pai ou mãe, telefone só com números e e-mail em minúsculas', () => {
    const r = validarColaborador({ ...base, paiOuMae: 'Mãe', telefone: '(71) 99999-8888', email: ' Nova.Pessoa@Exemplo.com ' }, { colaboradores, setores })
    assert.ok(r.valido)
    assert.equal(r.dados.paiOuMae, 'Mãe')
    assert.equal(r.dados.telefone, '71999998888')
    assert.equal(r.dados.email, 'nova.pessoa@exemplo.com')
  })

  it('cadastro sem contato continua valendo, e contato errado é recusado', () => {
    const vazio = validarColaborador(base, { colaboradores, setores })
    assert.ok(vazio.valido)
    assert.equal(vazio.dados.paiOuMae, '')
    assert.equal(vazio.dados.telefone, '')
    assert.equal(vazio.dados.email, '')
    const r = validarColaborador({ ...base, paiOuMae: 'Avó', telefone: '9999', email: 'sem-arroba' }, { colaboradores, setores })
    assert.match(r.erros.paiOuMae, /Pai, Mãe/)
    assert.match(r.erros.telefone, /DDD/)
    assert.match(r.erros.email, /não parece válido/)
  })

  it('reconhece pai ou mãe escrito de vários jeitos', () => {
    assert.equal(normalizarPaiOuMae('MAE'), 'Mãe')
    assert.equal(normalizarPaiOuMae(' mãe '), 'Mãe')
    assert.equal(normalizarPaiOuMae('Pai'), 'Pai')
    assert.equal(normalizarPaiOuMae('não'), '')
    assert.equal(normalizarPaiOuMae(''), '')
    assert.equal(normalizarPaiOuMae('Sim'), null)
    assert.equal(normalizarPaiOuMae('Pai e mãe'), null)
  })
})

describe('importação: acentos do CSV', () => {
  const texto = 'Nome;Pai ou mãe\nJoão Conceição;Mãe'

  it('lê UTF-8 sem BOM, como o CSV do Google Planilhas', () => {
    assert.equal(lerTextoDoCsv(new TextEncoder().encode(texto)), texto)
  })

  it('lê UTF-8 com BOM, como o "CSV UTF-8" do Excel, sem deixar o BOM no primeiro título', () => {
    assert.equal(lerTextoDoCsv(new TextEncoder().encode(`﻿${texto}`)), texto)
  })

  it('lê o ANSI do Windows, como o CSV comum do Excel', () => {
    const bytes = Uint8Array.from(texto, (letra) => letra.charCodeAt(0))
    assert.ok(bytes.includes(0xe3), 'o "ã" precisa estar em um byte só')
    assert.equal(lerTextoDoCsv(bytes), texto)
  })

  it('lê UTF-16 com BOM', () => {
    const letras = [...texto].flatMap((letra) => [letra.charCodeAt(0) & 0xff, letra.charCodeAt(0) >> 8])
    assert.equal(lerTextoDoCsv(Uint8Array.from([0xff, 0xfe, ...letras])), texto)
    assert.equal(lerTextoDoCsv(Uint8Array.from([0xfe, 0xff, ...letras.map((_, i) => letras[i % 2 ? i - 1 : i + 1])])), texto)
  })
})

describe('colaboradores: pais e mães', () => {
  const pessoas = [
    { id: 'a', nome: 'Ana', setor: 'Comercial', loja: 'Aracaju', paiOuMae: 'Mãe', ativo: true },
    { id: 'b', nome: 'Bruno', setor: 'Logística', loja: 'Aracaju', paiOuMae: 'Pai', ativo: true },
    { id: 'c', nome: 'Carla', setor: 'Comercial', loja: 'Lauro de Freitas', paiOuMae: 'Mãe', ativo: false },
    { id: 'd', nome: 'Davi', setor: 'Comercial', loja: 'Aracaju', paiOuMae: '', ativo: true },
    { id: 'e', nome: 'Elis', setor: 'Comercial', loja: 'Aracaju', ativo: true },
  ]

  it('mostra só quem está ativo e marcado (cadastro antigo fica de fora)', () => {
    assert.deepEqual(filtrarPaisEMaes(pessoas).map((c) => c.id), ['a', 'b'])
  })

  it('filtra por pai ou mãe, setor, loja e busca', () => {
    assert.deepEqual(filtrarPaisEMaes(pessoas, { tipo: 'Mãe' }).map((c) => c.id), ['a'])
    assert.deepEqual(filtrarPaisEMaes(pessoas, { tipo: 'Pai' }).map((c) => c.id), ['b'])
    assert.deepEqual(filtrarPaisEMaes(pessoas, { setor: 'logistica' }).map((c) => c.id), ['b'])
    assert.deepEqual(filtrarPaisEMaes(pessoas, { loja: 'Lauro de Freitas' }), [])
    assert.deepEqual(filtrarPaisEMaes(pessoas, { busca: 'ana' }).map((c) => c.id), ['a'])
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
    assert.deepEqual(filtrarColaboradores([...colaboradores, { id: 'c1', nome: 'Cora', lideranca: 'Coordenador' }], { lideranca: 'Coordenador' }).map((c) => c.id), ['c1'])
  })

  it('conta por loja e monta os cartões dos setores só com ativos', () => {
    const { porLoja, total } = contarPorLoja(colaboradores.slice(0, 3))
    assert.deepEqual(porLoja, { 'Salvador (Matriz)': 1, 'Lauro de Freitas': 1, Aracaju: 1 })
    assert.equal(total, 3)
    const resumo = resumoDosSetores(setores, colaboradores)
    const comercial = resumo.setores.find((s) => s.setor.id === 'comercial')
    assert.equal(comercial.total, 3)
    assert.deepEqual(comercial.lideranca.map((n) => [n.valor, n.pessoas.map((c) => c.id)]), [['Gerente', ['g1']], ['Supervisor', ['s1']]])
    assert.equal(resumo.setores.find((s) => s.setor.id === 'logistica').total, 0)
    assert.deepEqual(resumo.semSetor.map((c) => c.id), ['x1'])
  })

  it('mostra a liderança em ordem hierárquica, sem os níveis vazios', () => {
    const pessoas = [
      { id: 'g', nome: 'G', setor: 'A', ativo: true },
      { id: 'c', nome: 'C', setor: 'A', ativo: true },
      { id: 's', nome: 'S', setor: 'A', ativo: true },
      { id: 'd', nome: 'D', setor: 'A', ativo: false },
    ]
    const niveis = (setor) => resumoDosSetores([{ id: 'a', nome: 'A', ...setor }], pessoas).setores[0].lideranca.map((n) => [n.plural, n.pessoas.map((p) => p.id)])
    // A ordem vem da hierarquia, não da ordem dos campos no documento.
    assert.deepEqual(niveis({ supervisores: ['s'], coordenadores: ['c'], gerentes: ['g'] }), [['Gerentes', ['g']], ['Coordenadores', ['c']], ['Supervisores', ['s']]])
    assert.deepEqual(niveis({ gerentes: [], coordenadores: ['c'], supervisores: ['s'] }), [['Coordenadores', ['c']], ['Supervisores', ['s']]])
    assert.deepEqual(niveis({ gerentes: ['g'], coordenadores: [], supervisores: [] }), [['Gerentes', ['g']]])
    // Setor antigo, sem o campo coordenadores, e desativado que sobrou na lista.
    assert.deepEqual(niveis({ gerentes: ['g'], supervisores: ['s', 'd'] }), [['Gerentes', ['g']], ['Supervisores', ['s']]])
    assert.deepEqual(niveis({}), [])
    assert.deepEqual(niveis({ coordenadores: ['d'] }), [])
  })

  it('exporta a lista com aniversário sem ano', () => {
    assert.equal(CABECALHO_DA_LISTA[0], 'Nome')
    assert.deepEqual(linhaDaLista({ nome: 'A', setor: 'B', loja: 'Aracaju', cargo: '', lideranca: '', nascimentoDia: 5, nascimentoMes: 3, admissao: '2020-03-01', ativo: true }), ['A', 'B', 'Aracaju', '', '', '05/03', '01/03/2020', '', '', '', 'Ativo'])
  })

  it('a planilha baixada volta na importação com pai ou mãe e contatos', () => {
    const c = { id: 'v1', nome: 'Vítor Vendedor', setor: 'Comercial', loja: 'Aracaju', paiOuMae: 'Pai', telefone: '71999998888', email: 'vitor@exemplo.com', ativo: true }
    assert.equal(CABECALHO_DA_LISTA.length, linhaDaLista(c).length)
    const linhas = [CABECALHO_DA_LISTA, linhaDaLista(c)]
    const mapa = sugerirMapeamento(linhas[0], CAMPOS_DA_PLANILHA)
    const previa = prepararImportacao({ registros: extrairRegistros(linhas, 0, mapa), colaboradores, setores })
    const { paiOuMae, telefone, email } = previa.itens[0].dados
    assert.deepEqual({ paiOuMae, telefone, email }, { paiOuMae: 'Pai', telefone: '71999998888', email: 'vitor@exemplo.com' })
    assert.deepEqual(previa.itens[0].avisos, [])
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
    const responsaveis = { gerentes: ['v1'], coordenadores: [], supervisores: ['g1'] }
    const mudancas = liderancasAoDefinirResponsaveis({ setores, colaboradores, setorId: 'comercial', responsaveis })
    assert.deepEqual(mudancas.sort((a, b) => a.id.localeCompare(b.id)), [
      { id: 'g1', lideranca: 'Supervisor' },
      { id: 's1', lideranca: '' },
      { id: 'v1', lideranca: 'Gerente' },
    ])
  })

  it('marcar coordenador entra na lista do setor, mesmo em setor antigo sem o campo', () => {
    assert.deepEqual(ajustesDeLideranca({ setores, id: 'v1', antes: { setor: 'Comercial', lideranca: '' }, depois: { setor: 'Comercial', lideranca: 'Coordenador' } }), [
      { setorId: 'comercial', campo: 'coordenadores', acao: 'incluir' },
    ])
    assert.deepEqual(ajustesDeLideranca({ setores, id: 'n1', antes: null, depois: { setor: 'Logística', lideranca: 'Coordenador' } }), [
      { setorId: 'logistica', campo: 'coordenadores', acao: 'incluir' },
    ])
  })

  it('trocar ou remover a liderança tira a pessoa da lista antiga', () => {
    const comCoordenador = [{ id: 'a', nome: 'A', gerentes: ['g'], coordenadores: ['c'], supervisores: ['s'] }]
    const ajustar = (id, antes, depois) => ajustesDeLideranca({ setores: comCoordenador, id, antes: { setor: 'A', lideranca: antes }, depois: { setor: 'A', lideranca: depois } })
    assert.deepEqual(ajustar('s', 'Supervisor', 'Coordenador'), [
      { setorId: 'a', campo: 'coordenadores', acao: 'incluir' },
      { setorId: 'a', campo: 'supervisores', acao: 'tirar' },
    ])
    assert.deepEqual(ajustar('c', 'Coordenador', 'Gerente'), [
      { setorId: 'a', campo: 'gerentes', acao: 'incluir' },
      { setorId: 'a', campo: 'coordenadores', acao: 'tirar' },
    ])
    assert.deepEqual(ajustar('c', 'Coordenador', ''), [{ setorId: 'a', campo: 'coordenadores', acao: 'tirar' }])
    assert.deepEqual(ajustar('c', 'Coordenador', 'Coordenador'), [])
  })

  it('trocar de setor leva o coordenador junto', () => {
    const lista = [
      { id: 'a', nome: 'A', coordenadores: ['c'] },
      { id: 'b', nome: 'B', gerentes: [], supervisores: [] },
    ]
    assert.deepEqual(ajustesDeLideranca({ setores: lista, id: 'c', antes: { setor: 'A', lideranca: 'Coordenador' }, depois: { setor: 'B', lideranca: 'Coordenador' } }), [
      { setorId: 'a', campo: 'coordenadores', acao: 'tirar' },
      { setorId: 'b', campo: 'coordenadores', acao: 'incluir' },
    ])
  })

  it('a liderança acompanha o nível mais alto em todos os setores', () => {
    const lista = [
      { id: 'a', nome: 'A', gerentes: [], coordenadores: ['x'], supervisores: [] },
      { id: 'b', nome: 'B', gerentes: [], supervisores: ['y'] },
    ]
    const pessoas = [{ id: 'x', lideranca: 'Coordenador' }, { id: 'y', lideranca: 'Supervisor' }, { id: 'z', lideranca: '' }]
    const definir = (setorId, responsaveis) => liderancasAoDefinirResponsaveis({ setores: lista, colaboradores: pessoas, setorId, responsaveis })
    // y vira coordenador em b; x continua coordenador em a e também responde como supervisor em b.
    assert.deepEqual(definir('b', { gerentes: [], coordenadores: ['y'], supervisores: ['x'] }), [{ id: 'y', lideranca: 'Coordenador' }])
    // x sai de a, mas y (setor b) nem é envolvido; z entra como coordenador.
    assert.deepEqual(definir('a', { gerentes: [], coordenadores: ['z'], supervisores: [] }), [
      { id: 'z', lideranca: 'Coordenador' },
      { id: 'x', lideranca: '' },
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
    ['Pessoa Estranha', 'financeiro', 'Feira', '', 'Diretor', 'xx', '2020'],
  ]

  it('acha o cabeçalho e sugere as colunas', () => {
    const indice = acharCabecalho(linhas, CAMPOS_DA_PLANILHA)
    assert.equal(indice, 2)
    const mapa = sugerirMapeamento(linhas[indice], CAMPOS_DA_PLANILHA)
    assert.deepEqual(mapa, { nome: 0, setor: 1, loja: 2, cargo: 3, lideranca: 4, nascimento: 5, admissao: 6, paiOuMae: -1, temFilhos: -1, genero: -1, telefone: -1, email: -1 })
    assert.equal(nomeDaColuna(0), 'A')
    assert.equal(nomeDaColuna(27), 'AB')
    assert.deepEqual(exemplosDaColuna(linhas, indice, 1, 2), ['Comercial', 'Financeiro'])
  })

  it('não confunde "Nome da mãe" com a coluna "Pai ou mãe"', () => {
    const cabecalho = ['Nome', 'Nome da mãe', 'Nome do pai', 'Celular', 'E-mail corporativo']
    const mapa = sugerirMapeamento(cabecalho, CAMPOS_DA_PLANILHA)
    assert.equal(mapa.nome, 0)
    assert.equal(mapa.paiOuMae, -1)
    assert.equal(mapa.telefone, 3)
    assert.equal(mapa.email, 4)
  })

  it('acha as colunas da lista oficial de colaboradores', () => {
    const cabecalho = ['Nome', 'Data de Nascimento', 'Gênero', 'Data de admissão', 'Cargo', 'Departamento', 'Unidade', 'Celular', 'Telefone de Emergência', 'Outros Contatos', 'Email Pessoal', 'Email Corporativo', 'Tem Filhos']
    const mapa = sugerirMapeamento(cabecalho, CAMPOS_DA_PLANILHA)
    assert.equal(cabecalho[mapa.temFilhos], 'Tem Filhos')
    assert.equal(cabecalho[mapa.genero], 'Gênero')
    assert.equal(cabecalho[mapa.telefone], 'Celular')
    assert.equal(mapa.paiOuMae, -1)
    // "Nome dos filhos" e "Quantidade de filhos" não dizem se a pessoa tem filhos em Sim ou Não.
    assert.equal(sugerirMapeamento(['Nome', 'Nome dos filhos', 'Quantidade de filhos'], CAMPOS_DA_PLANILHA).temFilhos, -1)
  })

  it('"Tem Filhos" com "Gênero" dizem se é pai ou mãe, e o gênero não é guardado', () => {
    const importar = (temFilhos, genero, extra = {}) => prepararImportacao({ registros: [{ linha: 2, valores: { nome: 'Pessoa Nova', temFilhos, genero, ...extra } }], colaboradores, setores }).itens[0]
    assert.equal(importar('Sim', 'Masculino').dados.paiOuMae, 'Pai')
    assert.equal(importar('Sim', 'Feminino').dados.paiOuMae, 'Mãe')
    assert.equal(importar('SIM', 'f').dados.paiOuMae, 'Mãe')
    // "Não" tira a marcação de quem já existe; vazio não muda nada.
    assert.equal(importar('Não', 'Feminino').dados.paiOuMae, '')
    assert.ok(!('paiOuMae' in importar('', 'Feminino').dados))
    assert.ok(!('genero' in importar('Sim', 'Feminino').dados))
    assert.ok(!('temFilhos' in importar('Sim', 'Feminino').dados))
    // A coluna "Pai ou mãe" vale primeiro.
    assert.equal(importar('Sim', 'Feminino', { paiOuMae: 'Pai' }).dados.paiOuMae, 'Pai')
  })

  it('avisa quando não dá para saber se é pai ou mãe', () => {
    const importar = (temFilhos, genero) => prepararImportacao({ registros: [{ linha: 2, valores: { nome: 'Pessoa Nova', temFilhos, genero } }], colaboradores, setores }).itens[0]
    for (const genero of ['', 'Não informado', 'Outro']) {
      const item = importar('Sim', genero)
      assert.ok(!('paiOuMae' in item.dados))
      assert.match(item.avisos[0], /gênero não diz/)
    }
    assert.match(importar('Talvez', 'Feminino').avisos[0], /Tem filhos "Talvez"/)
    assert.equal(normalizarTemFilhos('Não'), false)
    assert.equal(normalizarTemFilhos('Sim'), true)
    assert.equal(paiOuMaeDoGenero('Outro'), null)
  })

  it('importa pai ou mãe e contatos, com aviso no que não entende', () => {
    const registros = [
      { linha: 2, valores: { nome: 'Nova Mãe', paiOuMae: 'mãe', telefone: 71999998888, email: 'NOVA@exemplo.com' } },
      { linha: 3, valores: { nome: 'Pessoa Duvidosa', paiOuMae: 'Sim', telefone: '123', email: 'sem-arroba' } },
      { linha: 4, valores: { nome: 'Vítor Vendedor', paiOuMae: '', telefone: '', email: '' } },
    ]
    const previa = prepararImportacao({ registros, colaboradores, setores })
    const [nova, duvidosa, vitor] = previa.itens
    assert.equal(nova.dados.paiOuMae, 'Mãe')
    assert.equal(nova.dados.telefone, '71999998888')
    assert.equal(nova.dados.email, 'nova@exemplo.com')
    assert.equal(duvidosa.avisos.length, 3)
    assert.ok(!('paiOuMae' in duvidosa.dados) && !('telefone' in duvidosa.dados) && !('email' in duvidosa.dados))
    // Célula vazia não muda nada em quem já existe.
    assert.deepEqual(vitor.dados, { nome: 'Vítor Vendedor' })

    let n = 0
    const ops = operacoesDaImportacao(previa, { setores, novoId: () => `novo${++n}`, agora: () => 'AGORA', incluirNaLista: () => 0, tirarDaLista: () => 0 })
    const criada = ops.find((o) => o.dados.nome === 'Nova Mãe')
    assert.equal(criada.dados.paiOuMae, 'Mãe')
    assert.equal(ops.find((o) => o.dados.nome === 'Pessoa Duvidosa').dados.paiOuMae, '')
    assert.ok(!ops.some((o) => o.caminho === 'colaboradores/v1'))
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
    assert.deepEqual(setorFinanceiro.dados, { nome: 'Financeiro', gerentes: ['novo1'], coordenadores: [], supervisores: [] })
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

  describe('liderança na planilha', () => {
    const importar = (valores, listaDeSetores = setores) => {
      const previa = prepararImportacao({ registros: [{ linha: 2, valores }], colaboradores, setores: listaDeSetores })
      const ops = operacoesDaImportacao(previa, {
        setores: listaDeSetores,
        novoId: () => 'novo',
        agora: () => 'AGORA',
        incluirNaLista: (...ids) => ({ incluir: ids }),
        tirarDaLista: (...ids) => ({ tirar: ids }),
      })
      return { previa, ops, doSetor: (id) => ops.filter((o) => o.caminho === `setores/${id}`).map((o) => o.dados) }
    }

    it('coordenadora nova entra na lista do setor, sem mexer no resto do setor antigo', () => {
      const { previa, ops, doSetor } = importar({ nome: 'Cora Nova', setor: 'Logística', lideranca: 'Coordenadora' })
      assert.equal(previa.itens[0].dados.lideranca, 'Coordenador')
      assert.deepEqual(previa.itens[0].avisos, [])
      assert.equal(ops.find((o) => o.caminho === 'colaboradores/novo').dados.lideranca, 'Coordenador')
      assert.deepEqual(doSetor('logistica'), [{ coordenadores: { incluir: ['novo'] } }])
    })

    it('coordenador em setor novo já nasce na lista', () => {
      const { doSetor } = importar({ nome: 'Cora Nova', setor: 'Jurídico', lideranca: 'coordenador' })
      assert.deepEqual(doSetor('juridico'), [{ nome: 'Jurídico', gerentes: [], coordenadores: ['novo'], supervisores: [] }])
    })

    it('supervisor que vira coordenador troca de lista', () => {
      const { doSetor } = importar({ nome: 'Sara Supervisora', lideranca: 'Coordenadora' })
      assert.deepEqual(doSetor('comercial'), [{ coordenadores: { incluir: ['s1'] } }, { supervisores: { tirar: ['s1'] } }])
    })

    it('"não" na planilha tira a liderança e a pessoa sai da lista', () => {
      const { ops, doSetor } = importar({ nome: 'Gabriel Gerente', lideranca: 'não' })
      assert.equal(ops.find((o) => o.caminho === 'colaboradores/g1').dados.lideranca, '')
      assert.deepEqual(doSetor('comercial'), [{ gerentes: { tirar: ['g1'] } }])
    })

    it('mudar de setor pela planilha leva a liderança para o setor novo', () => {
      const { doSetor } = importar({ nome: 'Sara Supervisora', setor: 'Logística' })
      assert.deepEqual(doSetor('logistica'), [{ supervisores: { incluir: ['s1'] } }])
      assert.deepEqual(doSetor('comercial'), [{ supervisores: { tirar: ['s1'] } }])
    })

    it('célula de liderança vazia não muda as listas', () => {
      const { doSetor } = importar({ nome: 'Gabriel Gerente', cargo: 'Gerente Geral', lideranca: '' })
      assert.deepEqual(doSetor('comercial'), [])
    })

    it('quem já é gerente mas faltava na lista do setor volta para ela', () => {
      const { doSetor } = importar({ nome: 'Gabriel Gerente', lideranca: 'Gerente' }, [{ id: 'comercial', nome: 'Comercial', gerentes: [], supervisores: [] }])
      assert.deepEqual(doSetor('comercial'), [{ gerentes: { incluir: ['g1'] } }])
    })
  })

  it('mostra datas do Excel legíveis nos exemplos da coluna', () => {
    assert.deepEqual(exemplosDaColuna([['Admissão'], [45000], ['15/03/2020']], 0, 0, 3, 'data'), ['15/03/2023', '15/03/2020'])
  })
})
