import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ehEmailDaEmpresa } from '../js/config.js'
import {
  formatarData, formatarDiaMes, formatarHora, formatarMesAno, hojeISO, lerData, lerDataDaPlanilha, lerDiaMes, mascararData,
  montarISO, serialExcelParaISO,
} from '../js/lib/datas.js'
import { mensagemDeErro, erroDoApp } from '../js/lib/erros.js'
import { abasDoPapel, papelValido, pode, rotuloDoPapel } from '../js/lib/papeis.js'
import { lerEndereco } from '../js/lib/rotas.js'
import { combinaBusca, nomeDeArquivo, normalizar, paraId, primeiroNome, textoPorcentagem } from '../js/lib/texto.js'
import { normalizarEmail, podeMudarAcesso, validarUsuario } from '../js/lib/usuarios.js'

describe('texto', () => {
  it('normaliza sem acentos, maiúsculas e pontuação', () => {
    assert.equal(normalizar('  Joãozinho  da  SILVA-Júnior '), 'joaozinho da silva junior')
    assert.equal(paraId('Recursos Humanos (RH)'), 'recursos-humanos-rh')
    assert.equal(primeiroNome('  Ana Maria Souza'), 'Ana')
  })

  it('busca cada palavra em qualquer ordem', () => {
    assert.ok(combinaBusca('Maria José Conceição', 'conceicao maria'))
    assert.ok(!combinaBusca('Maria José', 'pedro'))
    assert.ok(combinaBusca('Qualquer', ''))
  })

  it('monta nome de arquivo aceito pelo Windows', () => {
    assert.equal(nomeDeArquivo('Treino: Legrand / Soprano?'), 'Treino Legrand Soprano')
    assert.equal(textoPorcentagem(3, 4), '75%')
    assert.equal(textoPorcentagem(0, 0), 'Sem convocados')
  })
})

describe('datas', () => {
  it('formata DD/MM/AAAA e HH:MM no fuso da Bahia', () => {
    assert.equal(formatarData('2026-11-05'), '05/11/2026')
    assert.equal(formatarDiaMes(5, 3), '05/03')
    // 15:30 UTC são 12:30 na Bahia (UTC-3).
    assert.equal(formatarHora(new Date(Date.UTC(2026, 10, 5, 15, 30))), '12:30')
    assert.equal(hojeISO(new Date(Date.UTC(2026, 10, 1, 2, 0))), '2026-10-31')
    assert.equal(formatarMesAno(11, 2026), 'Novembro/2026')
  })

  it('lê datas digitadas e recusa as que não existem', () => {
    assert.equal(lerData('05/11/2026'), '2026-11-05')
    assert.equal(lerData('5/1/26'), '2026-01-05')
    assert.equal(lerData('31/02/2026'), null)
    assert.equal(lerData('2026-11-05'), null)
    assert.equal(montarISO(2026, 2, 29), null)
    assert.deepEqual(lerDiaMes('29/02'), { dia: 29, mes: 2 })
    assert.equal(lerDiaMes('31/04'), null)
    assert.equal(mascararData('05112026'), '05/11/2026')
    assert.equal(mascararData('0511'), '05/11')
  })

  it('lê datas de planilha em vários formatos', () => {
    assert.equal(serialExcelParaISO(45000), '2023-03-15')
    assert.deepEqual(lerDataDaPlanilha(45000), { dia: 15, mes: 3, ano: 2023 })
    assert.deepEqual(lerDataDaPlanilha('15/03/1990'), { dia: 15, mes: 3, ano: 1990 })
    assert.deepEqual(lerDataDaPlanilha('15/03'), { dia: 15, mes: 3, ano: null })
    assert.deepEqual(lerDataDaPlanilha('1990-03-15'), { dia: 15, mes: 3, ano: 1990 })
    assert.deepEqual(lerDataDaPlanilha('15 de março de 1990'), { dia: 15, mes: 3, ano: 1990 })
    assert.deepEqual(lerDataDaPlanilha('15/mar'), { dia: 15, mes: 3, ano: null })
    assert.deepEqual(lerDataDaPlanilha(new Date(Date.UTC(1990, 2, 15))), { dia: 15, mes: 3, ano: 1990 })
    assert.equal(lerDataDaPlanilha('32/01/2020'), null)
    assert.equal(lerDataDaPlanilha(''), null)
    assert.equal(lerDataDaPlanilha('sem data'), null)
  })
})

describe('papéis e permissões', () => {
  it('só admin e organizador são válidos', () => {
    assert.ok(papelValido('admin'))
    assert.ok(papelValido('organizador'))
    assert.ok(!papelValido('gestor'))
    assert.equal(rotuloDoPapel('admin'), 'Administração')
    assert.equal(rotuloDoPapel('x'), 'Papel inválido')
  })

  it('Usuários só aparece para admin', () => {
    assert.ok(abasDoPapel('admin').some((a) => a.id === 'usuarios'))
    assert.ok(!abasDoPapel('organizador').some((a) => a.id === 'usuarios'))
    assert.equal(abasDoPapel('organizador').length, 7)
  })

  it('Ramal aparece para todos os papéis', () => {
    assert.ok(abasDoPapel('admin').some((a) => a.id === 'ramal'))
    assert.ok(abasDoPapel('organizador').some((a) => a.id === 'ramal'))
  })

  it('organizador faz check-in, cadastra eletricista e baixa listas, mas não edita cadastros', () => {
    const org = { papel: 'organizador' }
    assert.ok(pode(org, 'fazerCheckin'))
    assert.ok(pode(org, 'cadastrarEletricista'))
    assert.ok(pode(org, 'baixarListas'))
    assert.ok(!pode(org, 'editarCadastros'))
    assert.ok(!pode(org, 'gerenciarUsuarios'))
    assert.ok(!pode(org, 'gerenciarListas'))
    assert.ok(pode({ papel: 'admin' }, 'gerenciarUsuarios'))
    assert.ok(!pode(null, 'fazerCheckin'))
  })
})

describe('usuários', () => {
  it('guarda o e-mail em minúsculas e sem espaços', () => {
    assert.equal(normalizarEmail('  Fulano.Tal@EletricaBahiana.com.br '), 'fulano.tal@eletricabahiana.com.br')
  })

  it('aceita só e-mail da empresa', () => {
    const base = { nome: 'Fulano', cargo: 'Analista', papel: 'organizador' }
    assert.equal(validarUsuario({ ...base, email: 'fulano@gmail.com' }).erros.email, 'Use um e-mail @eletricabahiana.com.br.')
    assert.equal(validarUsuario({ ...base, email: '' }).erros.email, 'Informe o e-mail.')
    const ok = validarUsuario({ ...base, email: ' Fulano@EletricaBahiana.com.br' })
    assert.ok(ok.valido)
    assert.equal(ok.email, 'fulano@eletricabahiana.com.br')
    assert.ok(ehEmailDaEmpresa('a@eletricabahiana.com.br'))
    assert.ok(!ehEmailDaEmpresa('a@eletricabahiana.com.br.outro.com'))
  })

  it('pede nome e papel válidos', () => {
    const r = validarUsuario({ email: 'a@eletricabahiana.com.br', nome: ' ', cargo: '', papel: 'gestor' })
    assert.equal(r.erros.nome, 'Informe o nome.')
    assert.equal(r.erros.papel, 'Escolha o papel.')
    assert.ok(validarUsuario({ nome: 'Ana', cargo: '', papel: 'admin' }, { novo: false }).valido)
  })

  it('o admin não muda o próprio acesso', () => {
    const eu = { email: 'eu@eletricabahiana.com.br' }
    assert.ok(!podeMudarAcesso(eu, { id: 'eu@eletricabahiana.com.br' }))
    assert.ok(podeMudarAcesso(eu, { id: 'outra@eletricabahiana.com.br' }))
  })
})

describe('endereços e erros', () => {
  it('lê a tela e os parâmetros do endereço', () => {
    assert.deepEqual(lerEndereco('#/colaboradores/setores/comercial'), { tela: 'colaboradores', params: ['setores', 'comercial'] })
    assert.deepEqual(lerEndereco(''), { tela: '', params: [] })
    assert.deepEqual(lerEndereco('#/listas/abc%20d?x=1'), { tela: 'listas', params: ['abc d'] })
  })

  it('traduz os erros do Firebase', () => {
    assert.equal(mensagemDeErro({ code: 'permission-denied' }), 'Você não tem permissão para fazer isso.')
    assert.equal(mensagemDeErro(erroDoApp('Essa pessoa já está cadastrada.')), 'Essa pessoa já está cadastrada.')
    assert.match(mensagemDeErro({ code: 'xyz' }), /Algo deu errado \(xyz\)/)
    assert.equal(mensagemDeErro(new Error('Failed to fetch')), 'Algo deu errado. Tente de novo em instantes.')
  })
})
