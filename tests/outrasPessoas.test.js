import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  detalheDaOutraPessoa, filtrarOutrasPessoas, lerGrupo, linhaDaLista, operacoesDaImportacao, prepararImportacao, validarOutraPessoa,
} from '../js/lib/outrasPessoas.js'

const outras = [
  { id: 'o1', nome: 'Diretor Exemplo', grupo: 'Diretoria', empresa: 'Diretor comercial', ativo: true },
  { id: 'o2', nome: 'Prestadora Exemplo', grupo: 'Prestador de serviço', empresa: 'Limpeza', ativo: true },
  { id: 'o3', nome: 'Antigo Exemplo', grupo: 'Outro', empresa: '', ativo: false },
]

describe('outras pessoas', () => {
  it('valida o cadastro e avisa sobre nomes iguais', () => {
    const ok = validarOutraPessoa({ nome: '  Nova   Pessoa ', grupo: 'Diretoria', empresa: ' Sócia ' }, { outrasPessoas: outras })
    assert.equal(ok.valido, true)
    assert.deepEqual(ok.dados, { nome: 'Nova Pessoa', grupo: 'Diretoria', empresa: 'Sócia' })
    const ruim = validarOutraPessoa({ nome: '', grupo: 'Qualquer', empresa: '' })
    assert.deepEqual(Object.keys(ruim.erros).sort(), ['grupo', 'nome'])
    assert.equal(validarOutraPessoa({ nome: 'diretor exemplo', grupo: 'Diretoria' }, { outrasPessoas: outras }).homonimo.id, 'o1')
    assert.equal(validarOutraPessoa({ nome: 'Diretor Exemplo', grupo: 'Diretoria' }, { outrasPessoas: outras, idAtual: 'o1' }).homonimo, null)
    const colaborador = validarOutraPessoa({ nome: 'Ana Santos', grupo: 'Outro' }, { colaboradores: [{ id: 'c1', nome: 'Ana Santos' }] }).colaborador
    assert.equal(colaborador.id, 'c1')
  })

  it('filtra por grupo, situação e busca (nome ou empresa)', () => {
    assert.deepEqual(filtrarOutrasPessoas(outras).map((o) => o.id), ['o1', 'o2'])
    assert.deepEqual(filtrarOutrasPessoas(outras, { grupo: 'Diretoria' }).map((o) => o.id), ['o1'])
    assert.deepEqual(filtrarOutrasPessoas(outras, { situacao: 'inativos' }).map((o) => o.id), ['o3'])
    assert.deepEqual(filtrarOutrasPessoas(outras, { busca: 'limpeza' }).map((o) => o.id), ['o2'])
  })

  it('entende o grupo escrito na planilha', () => {
    assert.equal(lerGrupo('Diretor'), 'Diretoria')
    assert.equal(lerGrupo('SÓCIO'), 'Diretoria')
    assert.equal(lerGrupo('Prestador de Serviço'), 'Prestador de serviço')
    assert.equal(lerGrupo('terceirizado'), 'Prestador de serviço')
    assert.equal(lerGrupo('Outros'), 'Outro')
    assert.equal(lerGrupo(''), '')
    assert.equal(lerGrupo('Cliente'), null)
  })

  it('importa: novos, existentes, repetidos e grupo padrão', () => {
    const registros = [
      { linha: 2, valores: { nome: 'Nova Diretora', grupo: 'Diretora', empresa: '' } },
      { linha: 3, valores: { nome: 'prestadora exemplo', grupo: '', empresa: 'Copa' } },
      { linha: 4, valores: { nome: 'Sem Grupo', grupo: 'Cliente', empresa: '' } },
      { linha: 5, valores: { nome: 'Nova Diretora', grupo: '', empresa: '' } },
      { linha: 6, valores: { nome: '', grupo: '', empresa: '' } },
    ]
    const previa = prepararImportacao({ registros, outrasPessoas: outras })
    assert.deepEqual(previa.contagem, { novos: 2, existentes: 1, repetidos: 1, ignorados: 1 })
    assert.equal(previa.itens[0].dados.grupo, 'Diretoria')
    assert.deepEqual(previa.itens[1].dados, { nome: 'prestadora exemplo', empresa: 'Copa' })
    assert.equal(previa.itens[2].dados.grupo, 'Outro')
    assert.equal(previa.itens[2].avisos.length, 2)
    let n = 0
    const operacoes = operacoesDaImportacao(previa, { novoId: () => `n${++n}`, agora: () => 'AGORA' })
    assert.deepEqual(operacoes[0], { tipo: 'definir', caminho: 'outrasPessoas/n1', dados: { nome: 'Nova Diretora', grupo: 'Diretoria', empresa: '', ativo: true, criadoEm: 'AGORA' } })
    assert.deepEqual(operacoes[1], { tipo: 'atualizar', caminho: 'outrasPessoas/o2', dados: { empresa: 'Copa' } })
    assert.equal(operacoesDaImportacao(previa, { atualizarExistentes: false, novoId: () => 'x', agora: () => 'A' }).length, 2)
  })

  it('detalhe e planilha', () => {
    assert.equal(detalheDaOutraPessoa(outras[0]), 'Diretoria · Diretor comercial')
    assert.equal(detalheDaOutraPessoa({ nome: 'X' }), 'Outro')
    assert.deepEqual(linhaDaLista(outras[2]), ['Antigo Exemplo', 'Outro', '', 'Desativado'])
  })
})
