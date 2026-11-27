import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CABECALHO_COMPLETA, CABECALHO_PRESENTES, CABECALHO_SORTEIO, cabecalhoCompleta, cabecalhoPresentes, linhasDoSorteio, participaDoSorteio,
  rotuloDoSorteio, LOCAIS, PAIS_E_MAES, TODAS_AS_LOJAS, colaboradoresDoGrupo, contarPresencas, ehAcaoDeEndomarketing,
  ehDaLoja, ehDoTipo, SITUACOES_DO_CHECKIN, contaComoFalta, limparObservacao, mudancaDeSituacao, situacaoDaPresenca, situacaoNoCheckin, ehListaDeAniversario, filtrarListas, fornecedorJaNaLista, funcaoDaPresenca,
  historicoDaPessoa, idDaPresenca, linhasCompleta, linhasPresentes, listasDaMarca, marcaDaPresenca, nomeComFuncao, nomeDoArquivoDaLista, ondeE,
  pessoasNaLista, presencaDeColaborador,
  presencaDeConvidado, presencaDeEletricista, presencaDeFornecedor, presencaDeOutraPessoa, presencasParaCheckin, quandoE, resultadoNaLista,
  resumoDaLista, tipoDaPresenca, validarLista,
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
    assert.equal(validarLista({ nome: 'Treino', tipo: 'Evento', data: '05/11/2026', loja: 'Loja inventada', local: '' }).erros.loja, 'Escolha a loja, "Todas as lojas" ou "Outro local".')
  })

  it('"Todas as lojas": vale na lista e traz todo mundo na loja inteira', () => {
    const r = validarLista({ nome: 'Café', tipo: 'Ação de Endomarketing', data: '05/11/2026', loja: TODAS_AS_LOJAS, local: '' })
    assert.ok(r.valido)
    assert.equal(r.dados.loja, 'Todas as lojas')
    assert.equal(ondeE({ loja: TODAS_AS_LOJAS, local: 'Matriz e lojas' }), 'Todas as lojas · Matriz e lojas')
    assert.ok(LOCAIS.indexOf(TODAS_AS_LOJAS) < LOCAIS.indexOf('Outro local'))
    assert.ok(ehDaLoja({ loja: 'Aracaju' }, TODAS_AS_LOJAS))
    assert.ok(ehDaLoja({ loja: '' }, TODAS_AS_LOJAS))
    assert.ok(ehDaLoja({ loja: 'Aracaju' }, 'Aracaju'))
    assert.ok(!ehDaLoja({ loja: 'Aracaju' }, 'Lauro de Freitas'))
  })

  it('grupos de "Adicionar colaboradores": setor, loja e pais e mães', () => {
    const ativos = [
      { id: 'a', setor: 'Comercial', loja: 'Aracaju', paiOuMae: 'Mãe' },
      { id: 'b', setor: 'comercial', loja: 'Lauro de Freitas', paiOuMae: 'Pai' },
      { id: 'c', setor: 'RH', loja: 'Aracaju', paiOuMae: '' },
      { id: 'd', setor: 'RH', loja: '' },
    ]
    const ids = (tipo, valor) => colaboradoresDoGrupo(ativos, tipo, valor).map((c) => c.id)
    assert.deepEqual(ids('setor', 'Comercial'), ['a', 'b'])
    assert.deepEqual(ids('loja', 'Aracaju'), ['a', 'c'])
    assert.deepEqual(ids('loja', TODAS_AS_LOJAS), ['a', 'b', 'c', 'd'])
    assert.deepEqual(ids('pais', PAIS_E_MAES), ['a', 'b'])
    assert.deepEqual(ids('pais', 'Pai'), ['b'])
    assert.deepEqual(ids('pais', 'Mãe'), ['a'])
    assert.deepEqual(ids('pais', ''), [])
  })

  it('filtra por tipo, situação, ano e busca, mais recentes primeiro', () => {
    const listas = [lista, { id: 'l2', nome: 'Encontro CAE', tipo: 'Treinamento CAE', data: '2026-12-01', status: 'aberta' }, { id: 'l3', nome: 'Antiga', tipo: 'Evento', data: '2025-01-01', status: 'encerrada' }]
    assert.deepEqual(filtrarListas(listas).map((l) => l.id), ['l2', 'l1', 'l3'])
    assert.deepEqual(filtrarListas(listas, { situacao: 'encerrada', ano: '2026' }).map((l) => l.id), ['l1'])
    assert.deepEqual(filtrarListas(listas, { tipo: 'Treinamento CAE' }).map((l) => l.id), ['l2'])
    assert.deepEqual(filtrarListas(listas, { busca: 'legrand' }).map((l) => l.id), ['l1'])
    // Os controles de aniversariantes também são ações de endomarketing.
    const comAcoes = [...listas, { id: 'a1', nome: 'Café', tipo: 'Ação de Endomarketing', data: '2026-11-20' }, { id: 'aniv', nome: 'Aniversariantes', tipo: 'Aniversariantes do mês', data: '2026-11-01' }]
    assert.deepEqual(filtrarListas(comAcoes, { tipo: 'Ação de Endomarketing' }).map((l) => l.id), ['a1', 'aniv'])
    assert.deepEqual(filtrarListas(comAcoes, { tipo: 'Aniversariantes do mês' }).map((l) => l.id), ['aniv'])
    assert.ok(ehAcaoDeEndomarketing({ tipo: 'Aniversário de empresa' }))
    assert.ok(!ehAcaoDeEndomarketing({ tipo: 'Evento' }))
    assert.ok(ehDoTipo({ tipo: 'Evento' }, ''))
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
    assert.equal(idDaPresenca('outro', 'o1'), 'outro_o1')
    // Outras pessoas: o grupo vira o tipo mostrado; o detalhe é a empresa ou função.
    const diretor = presencaDeOutraPessoa({ id: 'o1', nome: 'Diretor Exemplo', grupo: 'Diretoria', empresa: 'Comercial' })
    assert.deepEqual(diretor, {
      fornecedorId: '', presente: false, horaCheckin: null, checkinPor: null, tipoPessoa: 'outro', pessoaId: 'o1', nome: 'Diretor Exemplo', grupo: 'Diretoria', detalhe: 'Comercial', convocado: true,
    })
    assert.equal(tipoDaPresenca(diretor), 'Diretoria')
    assert.equal(tipoDaPresenca({ tipoPessoa: 'outro' }), 'Outra pessoa')
    assert.equal(tipoDaPresenca({ tipoPessoa: 'eletricista' }), 'Eletricista')
    assert.equal(linhasPresentes([{ ...diretor, presente: true }])[0][1], 'Diretoria')
    assert.ok(pessoasNaLista([diretor]).has('outro_o1'))
  })

  it('sorteio: quem participa, colunas das planilhas e lista do sorteio', () => {
    const colaborador = { ...presencaDeColaborador({ id: 'c1', nome: 'Bia', setor: 'RH', loja: 'Aracaju' }), presente: true }
    const diretor = { ...presencaDeOutraPessoa({ id: 'o1', nome: 'Ana Diretora', grupo: 'Diretoria' }), presente: true }
    const prestadorNoSorteio = { ...presencaDeOutraPessoa({ id: 'o2', nome: 'Caio', grupo: 'Prestador de serviço' }), presente: true, sorteio: true }
    const colaboradorFora = { ...presencaDeColaborador({ id: 'c2', nome: 'Davi', setor: 'RH', loja: 'Aracaju' }), presente: true, sorteio: false }
    const ausente = presencaDeColaborador({ id: 'c3', nome: 'Eva', setor: 'RH', loja: 'Aracaju' })
    // Sem marcação: colaborador participa; Diretoria e prestadores começam fora.
    assert.deepEqual([colaborador, diretor, prestadorNoSorteio, colaboradorFora].map(participaDoSorteio), [true, false, true, false])
    assert.equal(rotuloDoSorteio(diretor), 'Fora do sorteio')
    const presencas = [colaborador, diretor, prestadorNoSorteio, colaboradorFora, ausente]
    assert.deepEqual(cabecalhoPresentes(), CABECALHO_PRESENTES)
    assert.equal(cabecalhoPresentes({ sorteio: true }).at(-1), 'Participa do sorteio')
    assert.deepEqual(linhasPresentes(presencas, { sorteio: true }).map((l) => [l[0], l.at(-1)]), [['Ana Diretora', 'Não'], ['Bia', 'Sim'], ['Caio', 'Sim'], ['Davi', 'Não']])
    assert.equal(linhasPresentes(presencas)[0].length, CABECALHO_PRESENTES.length)
    assert.equal(cabecalhoCompleta({ sorteio: true }).length, CABECALHO_COMPLETA.length + 1)
    assert.equal(linhasCompleta(presencas, { sorteio: true }).find((l) => l[0] === 'Eva').at(-1), 'Sim')
    assert.deepEqual(CABECALHO_SORTEIO[0], 'Nome')
    assert.deepEqual(linhasDoSorteio(presencas), [['Bia', 'Colaborador', 'RH · Aracaju'], ['Caio', 'Prestador de serviço', '']])
  })
})

describe('listas: presenças (tipos)', () => {
  it('monta colaborador, eletricista, fornecedor e convidado', () => {
    assert.deepEqual(presencaDeColaborador({ id: 'c1', nome: 'Vítor', setor: 'Comercial', loja: 'Aracaju' }), {
      fornecedorId: '', presente: false, horaCheckin: null, checkinPor: null, tipoPessoa: 'colaborador', pessoaId: 'c1', nome: 'Vítor', detalhe: 'Comercial · Aracaju', convocado: true,
    })
    assert.equal(presencaDeEletricista({ id: 'e1', nome: 'Eli', vendedorNome: '' }, false).detalhe, 'Sem vendedor')
    assert.equal(presencaDeEletricista({ id: 'e1', nome: 'Eli', vendedorNome: 'Bia' }, false).convocado, false)
    const f = presencaDeFornecedor(' Pat ', { id: 'legrand', nome: 'Legrand' })
    assert.deepEqual([f.nome, f.detalhe, f.fornecedorId, f.pessoaId], ['Pat', 'Legrand', 'legrand', ''])
    const comFuncao = presencaDeFornecedor('Pat', { id: 'legrand', nome: 'Legrand' }, 'Palestrante')
    assert.equal(comFuncao.detalhe, 'Legrand · Palestrante')
    assert.equal(marcaDaPresenca(comFuncao), 'Legrand')
    assert.equal(funcaoDaPresenca(comFuncao), 'Palestrante')
    assert.equal(nomeComFuncao(comFuncao), 'Pat (Palestrante)')
    // Presença antiga, só com a marca, e colaborador (o detalhe dele não tem função).
    assert.equal(nomeComFuncao(f), 'Pat')
    assert.equal(nomeComFuncao(presencas[0]), 'Vítor Vendas')
    assert.equal(presencaDeConvidado('Visita').convocado, false)
    assert.deepEqual([...pessoasNaLista(presencas)].sort(), ['colaborador_c1', 'colaborador_c2', 'colaborador_c3', 'eletricista_e1'])
  })

  it('conta presentes sobre convocados e separa quem veio sem convite', () => {
    assert.deepEqual(contarPresencas(presencas), { convocados: 4, presentesConvocados: 2, naoConvocadosPresentes: 1, presentes: 3, ausentes: 2, taxa: 50 })
    assert.equal(contarPresencas([]).taxa, null)
  })

  it('situação marcada ao abrir o nome no check-in: participou, não participou, outros ou sem marcação', () => {
    assert.deepEqual(SITUACOES_DO_CHECKIN.map((s) => s.rotulo), ['Participou', 'Não participou', 'Outros', 'Sem marcação'])
    assert.equal(situacaoNoCheckin({ presente: true, status: 'nao_participou' }), 'participou')
    assert.equal(situacaoNoCheckin({ presente: false, status: 'outros' }), 'outros')
    assert.equal(situacaoNoCheckin({ presente: false, status: 'participou' }), '')
    assert.equal(situacaoNoCheckin({ presente: false }), '')
    const agora = new Date('2026-11-27T13:00:00Z')
    const antes = new Date('2026-11-27T11:00:00Z')
    assert.deepEqual(mudancaDeSituacao('participou', { presente: false }, 'Ana', agora), { presente: true, status: 'participou', horaCheckin: agora, checkinPor: 'Ana' })
    assert.deepEqual(mudancaDeSituacao('participou', { presente: true, horaCheckin: antes, checkinPor: 'Bruno' }, 'Ana', agora), { presente: true, status: 'participou', horaCheckin: antes, checkinPor: 'Bruno' })
    assert.deepEqual(mudancaDeSituacao('nao_participou', { presente: true }, 'Ana', agora), { presente: false, status: 'nao_participou', horaCheckin: null, checkinPor: null })
    assert.deepEqual(mudancaDeSituacao('outros', {}, 'Ana', agora).status, 'outros')
    assert.deepEqual(mudancaDeSituacao('', { presente: false, status: 'outros' }, 'Ana', agora).status, '')
    assert.equal(limparObservacao(`  De   férias ${'x'.repeat(400)}`).length, 300)
    // Resultado na ficha e falta no ranking.
    const passada = { status: 'encerrada', data: '2026-11-05' }
    assert.equal(resultadoNaLista(passada, { convocado: true, presente: false, status: 'nao_participou' }), 'Não participou')
    assert.equal(resultadoNaLista(passada, { convocado: true, presente: false, status: 'outros' }), 'Outros')
    assert.equal(resultadoNaLista(passada, { convocado: true, presente: false }), 'Faltou')
    assert.ok(contaComoFalta(passada, { convocado: true, presente: false }))
    assert.ok(contaComoFalta(passada, { convocado: true, presente: false, status: 'nao_participou' }))
    assert.ok(!contaComoFalta(passada, { convocado: true, presente: false, status: 'outros' }))
    assert.ok(!contaComoFalta({ tipo: 'Aniversariantes do mês' }, { convocado: true, status: 'pendente' }))
    assert.ok(contaComoFalta({ tipo: 'Aniversariantes do mês' }, { convocado: true, status: 'nao_participou' }))
    assert.equal(situacaoDaPresenca(passada, { presente: true }), 'participou')
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
    // Marcado como "Outros" no check-in (por exemplo, atestado): continua ausente, mas não é falta do comercial.
    const comOutros = presencas.map((p) => (p.id === 'colaborador_c1' ? { ...p, status: 'outros', observacao: 'Atestado' } : p))
    const r2 = resumoDaLista(lista, comOutros, [{ id: 'c1', setor: 'Comercial' }, { id: 'c3', setor: 'Recursos Humanos' }])
    assert.deepEqual(r2.comercialFaltou, [])
    assert.equal(r2.ausentes.length, 2)
    assert.deepEqual([...r.porMarca.keys()], ['Legrand'])
    assert.deepEqual(resumoDaLista({ ...lista, tipo: 'Evento' }, presencas).comercialFaltou, [])
  })

  it('agrupa por marca as pessoas com e sem função, e não repete a mesma pessoa da marca', () => {
    const comFuncao = { ...presencaDeFornecedor('Lia Legrand', { id: 'legrand', nome: 'Legrand' }, 'Representante'), id: 'f2' }
    const todas = [...presencas, comFuncao]
    assert.deepEqual([...resumoDaLista(lista, todas).porMarca].map(([marca, pessoas]) => [marca, pessoas.length]), [['Legrand', 2]])
    assert.ok(fornecedorJaNaLista(todas, 'legrand', 'pat PALESTRANTE'))
    assert.ok(!fornecedorJaNaLista(todas, 'soprano', 'Pat Palestrante'))
    assert.ok(!fornecedorJaNaLista(todas, 'legrand', 'Vítor Vendas'))
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
    assert.deepEqual(linhasCompleta(presencas)[3], ['Rui RH', 'Colaborador', 'Recursos Humanos · Aracaju', 'Sim', 'Não', '', '', 'Sem marcação', ''])
    assert.deepEqual(CABECALHO_COMPLETA.slice(-2), ['Situação', 'Observação'])
    assert.deepEqual(linhasCompleta([{ ...presencas[0], status: 'outros', observacao: 'Atestado' }])[0].slice(-2), ['Outros', 'Atestado'])
    assert.equal(linhasCompleta(presencas)[0][7], 'Participou')
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
