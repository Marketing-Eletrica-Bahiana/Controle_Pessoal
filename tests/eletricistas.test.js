import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CABECALHO_DA_LISTA, CAMPOS_DA_PLANILHA, SEM_VENDEDOR, acharVendedor, filtrarEletricistas, formatarWhatsapp, linhaDaLista,
  linkDoWhatsapp, mascararTelefone, normalizarWhatsapp, operacoesDaImportacao, prepararImportacao, validarEletricista,
  vendedoresDosEletricistas, vendedoresPossiveis,
} from '../js/lib/eletricistas.js'
import { filtrarFornecedores, validarFornecedor } from '../js/lib/fornecedores.js'
import { sugerirMapeamento } from '../js/lib/importacao.js'

const colaboradores = [
  { id: 'v1', nome: 'João Carlos Silva', setor: 'Comercial', ativo: true },
  { id: 'v2', nome: 'Maria Souza', setor: 'Vendas Externas', ativo: true },
  { id: 'm1', nome: 'Ana Marketing', setor: 'Marketing', ativo: true },
  { id: 'x1', nome: 'Pedro Desligado', setor: 'Comercial', ativo: false },
]
const eletricistas = [
  { id: 'e1', nome: 'Carlos Eletricista', whatsapp: '71999998888', vendedorNome: 'João Carlos Silva', consentimentoLgpd: true, ativo: true },
  { id: 'e2', nome: 'Davi Sem Whats', whatsapp: '', vendedorNome: '', consentimentoLgpd: false, ativo: true },
  { id: 'e3', nome: 'Elias Antigo', whatsapp: '', vendedorNome: 'Maria Souza', consentimentoLgpd: false, ativo: false },
]

describe('WhatsApp', () => {
  it('aceita com ou sem máscara e guarda só os números com DDD', () => {
    assert.equal(normalizarWhatsapp('(71) 99999-8888'), '71999998888')
    assert.equal(normalizarWhatsapp('+55 71 99999 8888'), '71999998888')
    assert.equal(normalizarWhatsapp('071999998888'), '71999998888')
    assert.equal(normalizarWhatsapp('7133334444'), '7133334444')
    assert.equal(normalizarWhatsapp('99999-8888'), null)
    assert.equal(normalizarWhatsapp('71 89999 8888'), null)
    assert.equal(normalizarWhatsapp(''), '')
  })

  it('exibe formatado e abre a conversa com 55 na frente', () => {
    assert.equal(formatarWhatsapp('71999998888'), '(71) 99999-8888')
    assert.equal(formatarWhatsapp('7133334444'), '(71) 3333-4444')
    assert.equal(linkDoWhatsapp('71999998888'), 'https://wa.me/5571999998888')
    assert.equal(mascararTelefone('7199999'), '(71) 9999-9')
    assert.equal(mascararTelefone('71999998888'), '(71) 99999-8888')
  })
})

describe('eletricistas: cadastro', () => {
  it('sem a autorização LGPD o WhatsApp não é salvo', () => {
    const r = validarEletricista({ nome: 'Novo', whatsapp: '71988887777', consentimento: false })
    assert.match(r.erros.whatsapp, /LGPD/)
    const semNumero = validarEletricista({ nome: 'Novo', whatsapp: '', consentimento: false })
    assert.ok(semNumero.valido)
    assert.equal(semNumero.dados.whatsapp, '')
    assert.equal(semNumero.dados.consentimentoLgpd, false)
  })

  it('com autorização guarda os números e o vendedor escolhido', () => {
    const r = validarEletricista({ nome: ' Novo  Nome ', whatsapp: '(71) 98888-7777', consentimento: true, vendedor: { id: 'v1', nome: 'João Carlos Silva' } }, { eletricistas })
    assert.ok(r.valido)
    assert.deepEqual(r.dados, { nome: 'Novo Nome', whatsapp: '71988887777', vendedorId: 'v1', vendedorNome: 'João Carlos Silva', consentimentoLgpd: true })
  })

  it('não aceita WhatsApp de outro eletricista e avisa nome igual', () => {
    const r = validarEletricista({ nome: 'carlos eletricista', whatsapp: '71999998888', consentimento: true }, { eletricistas })
    assert.match(r.erros.whatsapp, /Carlos Eletricista/)
    assert.equal(r.homonimo.id, 'e1')
    assert.ok(validarEletricista({ nome: 'Carlos Eletricista', whatsapp: '71999998888', consentimento: true }, { eletricistas, idAtual: 'e1' }).valido)
  })

  it('sugere vendedores do comercial primeiro e acha vendedor pelo nome', () => {
    assert.deepEqual(vendedoresPossiveis(colaboradores).map((c) => c.id), ['v1', 'v2', 'm1'])
    assert.equal(acharVendedor(colaboradores, 'joao silva').id, 'v1')
    assert.equal(acharVendedor(colaboradores, 'Maria Souza').id, 'v2')
    assert.equal(acharVendedor(colaboradores, 'Fulano'), null)
    assert.equal(acharVendedor(colaboradores, 'pedro desligado').id, 'x1')
  })

  it('filtra por vendedor e situação', () => {
    assert.deepEqual(filtrarEletricistas(eletricistas, { vendedor: 'joão carlos silva' }).map((e) => e.id), ['e1'])
    assert.deepEqual(filtrarEletricistas(eletricistas, { vendedor: SEM_VENDEDOR }).map((e) => e.id), ['e2'])
    assert.deepEqual(filtrarEletricistas(eletricistas, { situacao: 'todos' }).length, 3)
    assert.deepEqual(vendedoresDosEletricistas(eletricistas), ['João Carlos Silva', 'Maria Souza'])
  })
})

describe('eletricistas: importação e lista', () => {
  const registros = [
    { linha: 2, valores: { nome: 'Carlos Eletricista', whatsapp: '', vendedor: 'Maria', lgpd: '', dataCadastro: '' } },
    { linha: 3, valores: { nome: 'Novo Um', whatsapp: '71 98888-1111', vendedor: 'joao silva', lgpd: 'Sim', dataCadastro: '10/03/2026' } },
    { linha: 4, valores: { nome: 'Novo Dois', whatsapp: '71988882222', vendedor: 'Desconhecido', lgpd: 'não', dataCadastro: '' } },
    { linha: 5, valores: { nome: 'Novo Três', whatsapp: '(71) 99999-8888', vendedor: '', lgpd: 'x', dataCadastro: '' } },
  ]

  it('monta a prévia respeitando a LGPD e o dono de cada WhatsApp', () => {
    const previa = prepararImportacao({ registros, eletricistas, colaboradores })
    assert.deepEqual(previa.contagem, { novos: 3, existentes: 1, repetidos: 0, ignorados: 0 })
    assert.equal(previa.itens[0].dados.vendedorId, 'v2')
    assert.deepEqual(previa.itens[1].dados, { nome: 'Novo Um', consentimentoLgpd: true, whatsapp: '71988881111', vendedorId: 'v1', vendedorNome: 'João Carlos Silva', dataCadastro: '2026-03-10' })
    assert.ok(!('whatsapp' in previa.itens[2].dados))
    assert.equal(previa.itens[2].avisos.length, 2)
    assert.match(previa.itens[3].avisos[0], /Carlos Eletricista/)
    const todos = prepararImportacao({ registros, eletricistas, colaboradores, todosAutorizaram: true })
    assert.equal(todos.itens[2].dados.whatsapp, '71988882222')
  })

  it('grava com a autorização e as datas certas', () => {
    const previa = prepararImportacao({ registros, eletricistas, colaboradores })
    let n = 0
    const ops = operacoesDaImportacao(previa, { novoId: () => `n${++n}`, agora: () => 'AGORA' })
    const um = ops.find((o) => o.dados.nome === 'Novo Um')
    assert.equal(um.dados.whatsapp, '71988881111')
    assert.equal(um.dados.dataConsentimento, 'AGORA')
    assert.equal(um.dados.dataCadastro.toISOString(), '2026-03-10T15:00:00.000Z')
    const dois = ops.find((o) => o.dados.nome === 'Novo Dois')
    assert.equal(dois.dados.whatsapp, '')
    assert.equal(dois.dados.dataConsentimento, null)
    const carlos = ops.find((o) => o.caminho === 'eletricistas/e1')
    assert.deepEqual(carlos.dados, { vendedorId: 'v2', vendedorNome: 'Maria Souza' })
  })

  it('a lista baixada volta na importação', () => {
    assert.deepEqual(sugerirMapeamento(CABECALHO_DA_LISTA, CAMPOS_DA_PLANILHA), { nome: 0, whatsapp: 1, vendedor: 2, lgpd: 3, dataCadastro: 5 })
    const linha = linhaDaLista({ ...eletricistas[0], dataCadastro: new Date('2026-03-10T15:00:00Z'), dataConsentimento: null })
    assert.deepEqual(linha, ['Carlos Eletricista', '(71) 99999-8888', 'João Carlos Silva', 'Sim', '', '10/03/2026', 'Ativo'])
  })
})

describe('fornecedores', () => {
  const fornecedores = [{ id: 'f1', nome: 'Legrand', ativo: true }, { id: 'f2', nome: 'Soprano', ativo: false }]

  it('pede só o nome, sem repetir marca', () => {
    assert.equal(validarFornecedor({ nome: 'legrand' }, { fornecedores }).erros.nome, 'Essa marca já está cadastrada.')
    const r = validarFornecedor({ nome: ' Ledvance ', contatoEmail: ' Contato@Ledvance.com ', contatoTelefone: '71 3333-4444' }, { fornecedores })
    assert.ok(r.valido)
    assert.deepEqual(r.dados, { nome: 'Ledvance', contatoNome: '', contatoEmail: 'contato@ledvance.com', contatoTelefone: '(71) 3333-4444' })
    assert.ok(validarFornecedor({ nome: 'X', contatoEmail: 'sem-arroba' }).erros.contatoEmail)
    assert.ok(validarFornecedor({ nome: 'X', contatoTelefone: '3333' }).erros.contatoTelefone)
  })

  it('filtra por nome e situação', () => {
    assert.deepEqual(filtrarFornecedores(fornecedores).map((f) => f.id), ['f1'])
    assert.deepEqual(filtrarFornecedores(fornecedores, { situacao: 'todos', busca: 'sop' }).map((f) => f.id), ['f2'])
  })
})
