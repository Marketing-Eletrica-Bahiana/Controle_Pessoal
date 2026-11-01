import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CABECALHO_COMPLETA, CABECALHO_PRESENTES, contarPresencas, ehListaDeAniversario, filtrarListas, historicoDaPessoa, idDaPresenca,
  linhasCompleta, linhasPresentes, listasDaMarca, nomeDoArquivoDaLista, ondeE, pessoasNaLista, presencaDeColaborador,
  presencaDeConvidado, presencaDeEletricista, presencaDeFornecedor, presencasParaCheckin, quandoE, resultadoNaLista,
  resumoDaLista, validarLista,
} from '../js/lib/listas.js'

const hora = (h, m) => new Date(Date.UTC(2026, 10, 5, h + 3, m))
const presencas = [
  { id: 'colaborador_c1', tipoPessoa: 'colaborador', pessoaId: 'c1', nome: 'Vítor Vendas', detalhe: 'Comercial · Aracaju', convocado: true, presente: false },
  { id: 'colaborador_c2', tipoPessoa: 'colaborador', pessoaId: 'c2', nome: 'Bia Comercial', detalhe: 'Comercial · Salvador (Matriz)', convocado: true, presente: true, horaCheckin: hora(8, 5), checkinPor: 'Ana' },
  { id: 'colaborador_c3', tipoPessoa: 'colaborador', pessoaId: 'c3', nome: 'Rui RH', detalhe: 'Recursos Humanos · Aracaju', convocado: true, presente: false },
  { id: 'eletricista_e1', tipoPessoa: 'eletricista', pessoaId: 'e1', nome: 'Eli Eletricista', detalhe: 'Vendedor: Bia', convocado: false, presente: true, horaCheckin: hora(9, 30), checkinPor: 'Bruno' },
  { id: 'f1', tipoPessoa: 'fornecedor', pessoaId: '', nome: 'Pat Palestrante', detalhe: 'Legrand', fornecedorId: 'legrand', convocado: true, presente: true, horaCheckin: hora(7, 50), checkinPor: 'Ana' },
]
const lista = { id: 'l1', nome: 'Treino: Legrand', tipo: 'Treinamento Comercial', data: '2026-11-05', status: 'encerrada', fornecedores: ['legrand'] }

describe('listas: cadastro e filtros', () => {
  it('valida nome, tipo, data e local', () => {
    const r = validarLista({ nome: ' Treino ', tipo: 'Evento', data: '05/11/2026', loja: 'Aracaju', local: '', fornecedores: ['a', 'a'] })
    assert.ok(r.valido)
    assert.deepEqual(r.dados, { nome: 'Treino', tipo: 'Evento', data: '2026-11-05', loja: 'Aracaju', local: '', fornecedores: ['a'] })
    const ruim = validarLista({ nome: '', tipo: 'Aniversariantes do mês', data: '31/02/2026', loja: 'Outro local', local: '' })
    assert.deepEqual(Object.keys(ruim.erros).sort(), ['data', 'local', 'nome', 'tipo'])
  })

  it('filtra por tipo, situação, ano e busca, mais recentes primeiro', () => {
    const listas = [lista, { id: 'l2', nome: 'Encontro CAE', tipo: 'Treinamento CAE', data: '2026-12-01', status: 'aberta' }, { id: 'l3', nome: 'Antiga', tipo: 'Evento', data: '2025-01-01', status: 'encerrada' }]
    assert.deepEqual(filtrarListas(listas).map((l) => l.id), ['l2', 'l1', 'l3'])
    assert.deepEqual(filtrarListas(listas, { situacao: 'encerrada', ano: '2026' }).map((l) => l.id), ['l1'])
    assert.deepEqual(filtrarListas(listas, { tipo: 'Treinamento CAE' }).map((l) => l.id), ['l2'])
    assert.deepEqual(filtrarListas(listas, { busca: 'legrand' }).map((l) => l.id), ['l1'])
    assert.ok(ehListaDeAniversario({ tipo: 'Aniversário de empresa' }))
    assert.equal(ondeE({ loja: 'Outro local', local: 'Hotel' }), 'Hotel')
    assert.equal(ondeE({ loja: 'Aracaju', local: 'Auditório' }), 'Aracaju · Auditório')
    assert.equal(quandoE('2026-11-02', '2026-11-01'), 'Amanhã')
    assert.equal(quandoE('2026-10-29', '2026-11-01'), 'Há 3 dias')
  })
})

describe('listas: presenças', () => {
  it('monta cada tipo de pessoa com ID previsível para colaborador e eletricista', () => {
    assert.equal(idDaPresenca('colaborador', 'c1'), 'colaborador_c1')
    assert.equal(idDaPresenca('fornecedor', ''), null)
    assert.deepEqual(presencaDeColaborador({ id: 'c1', nome: 'Vítor', setor: 'Comercial', loja: 'Aracaju' }), {
      fornecedorId: '', presente: false, horaCheckin: null, checkinPor: null, tipoPessoa: 'colaborador', pessoaId: 'c1', nome: 'Vítor', detalhe: 'Comercial · Aracaju', convocado: true,
    })
    assert.equal(presencaDeEletricista({ id: 'e1', nome: 'Eli', vendedorNome: '' }, false).detalhe, 'Sem vendedor')
    assert.equal(presencaDeEletricista({ id: 'e1', nome: 'Eli', vendedorNome: 'Bia' }, false).convocado, false)
    const f = presencaDeFornecedor(' Pat ', { id: 'legrand', nome: 'Legrand' })
    assert.deepEqual([f.nome, f.detalhe, f.fornecedorId, f.pessoaId], ['Pat', 'Legrand', 'legrand', ''])
    assert.equal(presencaDeConvidado('Visita').convocado, false)
    assert.deepEqual([...pessoasNaLista(presencas)].sort(), ['colaborador_c1', 'colaborador_c2', 'colaborador_c3', 'eletricista_e1'])
  })

  it('conta presentes sobre convocados e separa quem veio sem convite', () => {
    assert.deepEqual(contarPresencas(presencas), { convocados: 4, presentesConvocados: 2, naoConvocadosPresentes: 1, presentes: 3, ausentes: 2, taxa: 50 })
    assert.equal(contarPresencas([]).taxa, null)
  })

  it('busca e filtra para o check-in', () => {
    assert.deepEqual(presencasParaCheckin(presencas, { filtro: 'faltam' }).map((p) => p.nome), ['Rui RH', 'Vítor Vendas'])
    assert.deepEqual(presencasParaCheckin(presencas, { busca: 'legrand' }).map((p) => p.nome), ['Pat Palestrante'])
    assert.equal(presencasParaCheckin(presencas, { filtro: 'presentes' }).length, 3)
  })

  it('resumo destaca o comercial que faltou no Treinamento Comercial', () => {
    const r = resumoDaLista(lista, presencas, [{ id: 'c1', setor: 'Comercial' }, { id: 'c3', setor: 'Recursos Humanos' }])
    assert.deepEqual(r.ausentes.map((p) => p.nome), ['Rui RH', 'Vítor Vendas'])
    assert.deepEqual(r.naoConvocados.map((p) => p.nome), ['Eli Eletricista'])
    assert.deepEqual(r.comercialFaltou.map((p) => p.nome), ['Vítor Vendas'])
    assert.deepEqual([...r.porMarca.keys()], ['Legrand'])
    assert.deepEqual(resumoDaLista({ ...lista, tipo: 'Evento' }, presencas).comercialFaltou, [])
  })
})

describe('listas: planilhas e histórico', () => {
  it('"Baixar presentes" começa pela coluna Nome', () => {
    assert.deepEqual(CABECALHO_PRESENTES, ['Nome', 'Tipo', 'Detalhe', 'Hora do check-in'])
    assert.deepEqual(linhasPresentes(presencas), [
      ['Bia Comercial', 'Colaborador', 'Comercial · Salvador (Matriz)', '08:05'],
      ['Eli Eletricista', 'Eletricista', 'Vendedor: Bia', '09:30'],
      ['Pat Palestrante', 'Fornecedor', 'Legrand', '07:50'],
    ])
    assert.equal(CABECALHO_COMPLETA[4], 'Presente')
    assert.deepEqual(linhasCompleta(presencas)[3], ['Rui RH', 'Colaborador', 'Recursos Humanos · Aracaju', 'Sim', 'Não', '', ''])
    assert.equal(nomeDoArquivoDaLista(lista, 'presentes'), 'Treino: Legrand 05-11-2026 presentes')
  })

  it('monta o histórico da pessoa e as participações da marca', () => {
    const listas = [lista, { id: 'l2', nome: 'Aberta', tipo: 'Evento', data: '2099-01-01', status: 'aberta', fornecedores: [] }, { id: 'a1', nome: 'Aniversariantes', tipo: 'Aniversariantes do mês', data: '2026-10-01', status: 'aberta' }]
    const h = historicoDaPessoa(
      [
        { paiId: 'l1', convocado: true, presente: false },
        { paiId: 'l2', convocado: true, presente: false },
        { paiId: 'a1', convocado: true, presente: true, status: 'participou' },
        { paiId: 'sumiu', convocado: true, presente: true },
      ],
      listas,
    )
    assert.deepEqual(h.map((x) => x.lista.id), ['l2', 'l1', 'a1'])
    assert.deepEqual(h.map((x) => resultadoNaLista(x.lista, x.presenca)), ['Ainda não chegou', 'Faltou', 'Participou'])
    assert.equal(resultadoNaLista(lista, { convocado: false, presente: true }), 'Veio sem convite')
    assert.deepEqual(listasDaMarca('legrand', listas).map((l) => l.id), ['l1'])
  })
})
