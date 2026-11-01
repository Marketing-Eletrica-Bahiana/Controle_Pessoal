// Regras das listas de presença: tipos, presenças, contagens, resumo, planilhas e histórico.
import { LOJAS } from '../config.js'
import { formatarData, formatarHora, hojeISO, lerData, diasEntre } from './datas.js'
import { ehSetorComercial } from './colaboradores.js'
import { compararTexto, combinaBusca, limparEspacos, normalizar } from './texto.js'

export const TIPOS_DE_LISTA = ['Treinamento CAE', 'Treinamento Comercial', 'Evento', 'Ação de Endomarketing', 'Outro']
export const TIPOS_DE_ANIVERSARIO = ['Aniversariantes do mês', 'Aniversário de empresa']
export const TODOS_OS_TIPOS = [...TIPOS_DE_LISTA, ...TIPOS_DE_ANIVERSARIO]
export const OUTRO_LOCAL = 'Outro local'
export const LOCAIS = [...LOJAS, OUTRO_LOCAL]

export const ehListaDeAniversario = (lista) => TIPOS_DE_ANIVERSARIO.includes(lista?.tipo)

export const TIPOS_DE_PESSOA = {
  colaborador: 'Colaborador',
  eletricista: 'Eletricista',
  fornecedor: 'Fornecedor',
  convidado: 'Convidado',
}

// Lista

export function validarLista(entrada) {
  const erros = {}
  const nome = limparEspacos(entrada.nome)
  const local = limparEspacos(entrada.local)
  if (!nome) erros.nome = 'Informe o nome da lista.'
  else if (nome.length > 120) erros.nome = 'Use até 120 letras.'
  if (!TIPOS_DE_LISTA.includes(entrada.tipo)) erros.tipo = 'Escolha o tipo.'
  const data = lerData(entrada.data)
  if (!data) erros.data = 'Use DD/MM/AAAA, por exemplo 05/11/2026.'
  if (!LOCAIS.includes(entrada.loja)) erros.loja = 'Escolha a loja ou "Outro local".'
  if (entrada.loja === OUTRO_LOCAL && !local) erros.local = 'Diga onde vai ser.'
  if (local.length > 120) erros.local = 'Use até 120 letras.'
  return {
    erros,
    valido: Object.keys(erros).length === 0,
    dados: { nome, tipo: entrada.tipo, data, loja: entrada.loja, local, fornecedores: [...new Set(entrada.fornecedores ?? [])] },
  }
}

export function filtrarListas(listas, { busca = '', tipo = '', situacao = '', ano = '' } = {}) {
  return listas
    .filter((l) => !tipo || l.tipo === tipo)
    .filter((l) => !situacao || l.status === situacao)
    .filter((l) => !ano || String(l.data ?? '').startsWith(String(ano)))
    .filter((l) => combinaBusca(`${l.nome} ${l.local ?? ''}`, busca))
    .sort((a, b) => String(b.data ?? '').localeCompare(String(a.data ?? '')) || compararTexto(a.nome, b.nome))
}

export const anosDasListas = (listas) => [...new Set(listas.map((l) => String(l.data ?? '').slice(0, 4)).filter(Boolean))].sort().reverse()

export const ondeE = (lista) =>
  lista.loja === OUTRO_LOCAL ? lista.local || OUTRO_LOCAL : [lista.loja, lista.local].filter(Boolean).join(' · ')

// "Hoje", "Amanhã", "Em 3 dias", "Foi há 2 dias".
export function quandoE(data, hoje = hojeISO()) {
  if (!data) return ''
  const dias = diasEntre(hoje, data)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Amanhã'
  if (dias === -1) return 'Ontem'
  return dias > 0 ? `Em ${dias} dias` : `Há ${-dias} dias`
}

// Presenças

// Colaborador e eletricista têm ID previsível: a mesma pessoa nunca entra duas vezes na lista.
export const idDaPresenca = (tipoPessoa, pessoaId) => (pessoaId && (tipoPessoa === 'colaborador' || tipoPessoa === 'eletricista') ? `${tipoPessoa}_${pessoaId}` : null)

const base = { fornecedorId: '', presente: false, horaCheckin: null, checkinPor: null }

export const detalheDoColaborador = (c) => [c.setor || 'Sem setor', c.loja].filter(Boolean).join(' · ')
export const detalheDoEletricista = (e) => (e.vendedorNome ? `Vendedor: ${e.vendedorNome}` : 'Sem vendedor')

export const presencaDeColaborador = (c, convocado = true) => ({
  ...base,
  tipoPessoa: 'colaborador',
  pessoaId: c.id,
  nome: c.nome,
  detalhe: detalheDoColaborador(c),
  convocado,
})

export const presencaDeEletricista = (e, convocado = true) => ({
  ...base,
  tipoPessoa: 'eletricista',
  pessoaId: e.id,
  nome: e.nome,
  detalhe: detalheDoEletricista(e),
  convocado,
})

export const presencaDeFornecedor = (nome, fornecedor) => ({
  ...base,
  tipoPessoa: 'fornecedor',
  pessoaId: '',
  nome: limparEspacos(nome),
  detalhe: fornecedor.nome,
  fornecedorId: fornecedor.id,
  convocado: true,
})

export const presencaDeConvidado = (nome) => ({
  ...base,
  tipoPessoa: 'convidado',
  pessoaId: '',
  nome: limparEspacos(nome),
  detalhe: 'Convidado',
  convocado: false,
})

export function contarPresencas(presencas) {
  let convocados = 0
  let presentesConvocados = 0
  let naoConvocadosPresentes = 0
  for (const p of presencas) {
    if (p.convocado) {
      convocados++
      if (p.presente) presentesConvocados++
    } else if (p.presente) naoConvocadosPresentes++
  }
  return {
    convocados,
    presentesConvocados,
    naoConvocadosPresentes,
    presentes: presentesConvocados + naoConvocadosPresentes,
    ausentes: convocados - presentesConvocados,
    taxa: convocados ? Math.round((presentesConvocados / convocados) * 100) : null,
  }
}

// filtro: 'todos' | 'faltam' | 'presentes'
export function presencasParaCheckin(presencas, { busca = '', filtro = 'todos' } = {}) {
  return presencas
    .filter((p) => (filtro === 'faltam' ? !p.presente : filtro === 'presentes' ? p.presente : true))
    .filter((p) => combinaBusca(`${p.nome} ${p.detalhe ?? ''}`, busca))
    .sort((a, b) => compararTexto(a.nome, b.nome))
}

// Setor atual do colaborador (pelo cadastro) ou, se não achar, o que ficou gravado no detalhe.
function setorDaPresenca(p, colaboradoresPorId) {
  const c = colaboradoresPorId.get(p.pessoaId)
  return c ? c.setor : String(p.detalhe ?? '').split(' · ')[0]
}

export function resumoDaLista(lista, presencas, colaboradores = []) {
  const porNome = (a, b) => compararTexto(a.nome, b.nome)
  const presentes = presencas.filter((p) => p.presente).sort(porNome)
  const ausentes = presencas.filter((p) => p.convocado && !p.presente).sort(porNome)
  const naoConvocados = presencas.filter((p) => !p.convocado && p.presente).sort(porNome)
  let comercialFaltou = []
  if (lista?.tipo === 'Treinamento Comercial') {
    const porId = new Map(colaboradores.map((c) => [c.id, c]))
    comercialFaltou = ausentes.filter((p) => p.tipoPessoa === 'colaborador' && ehSetorComercial(setorDaPresenca(p, porId)))
  }
  const porMarca = new Map()
  for (const p of presencas.filter((x) => x.tipoPessoa === 'fornecedor')) {
    if (!porMarca.has(p.detalhe)) porMarca.set(p.detalhe, [])
    porMarca.get(p.detalhe).push(p)
  }
  return { conta: contarPresencas(presencas), presentes, ausentes, naoConvocados, comercialFaltou, porMarca }
}

// Quem do setor faltou num Treinamento Comercial (para o Dashboard).
export const comercialQueFaltou = (lista, presencas, colaboradores) => resumoDaLista(lista, presencas, colaboradores).comercialFaltou

// Planilhas

const horaDe = (p) => (p.horaCheckin instanceof Date ? formatarHora(p.horaCheckin) : '')
const tipoDe = (p) => TIPOS_DE_PESSOA[p.tipoPessoa] ?? p.tipoPessoa

// "Baixar presentes": a primeira coluna é "Nome" (o sorteador procura essa coluna).
export const CABECALHO_PRESENTES = ['Nome', 'Tipo', 'Detalhe', 'Hora do check-in']
export const linhasPresentes = (presencas) =>
  presencas
    .filter((p) => p.presente)
    .sort((a, b) => compararTexto(a.nome, b.nome))
    .map((p) => [p.nome, tipoDe(p), p.detalhe ?? '', horaDe(p)])

export const CABECALHO_COMPLETA = ['Nome', 'Tipo', 'Detalhe', 'Convocado', 'Presente', 'Hora do check-in', 'Check-in feito por']
export const linhasCompleta = (presencas) =>
  [...presencas]
    .sort((a, b) => compararTexto(a.nome, b.nome))
    .map((p) => [p.nome, tipoDe(p), p.detalhe ?? '', p.convocado ? 'Sim' : 'Não', p.presente ? 'Sim' : 'Não', horaDe(p), p.presente ? p.checkinPor ?? '' : ''])

// Nome do arquivo: nome da lista + data.
export const nomeDoArquivoDaLista = (lista, complemento = '') =>
  [lista.nome, formatarData(lista.data).replaceAll('/', '-'), complemento].filter(Boolean).join(' ')

// Histórico

// presencas: presenças de uma pessoa em várias listas, cada uma com paiId (ID da lista).
export function historicoDaPessoa(presencas, listas) {
  const porId = new Map(listas.map((l) => [l.id, l]))
  return presencas
    .map((p) => ({ presenca: p, lista: porId.get(p.paiId) }))
    .filter((h) => h.lista)
    .sort((a, b) => String(b.lista.data).localeCompare(String(a.lista.data)))
}

export const STATUS_ANIVERSARIO = {
  pendente: 'Pendente',
  participou: 'Participou',
  nao_participou: 'Não participou',
}

// Resultado da pessoa numa lista: "Compareceu", "Faltou", "Veio sem convite" ou, no controle de
// aniversariantes, o status marcado.
export function resultadoNaLista(lista, presenca) {
  if (ehListaDeAniversario(lista)) return STATUS_ANIVERSARIO[presenca.status] ?? 'Pendente'
  if (presenca.presente) return presenca.convocado ? 'Compareceu' : 'Veio sem convite'
  return lista.status === 'aberta' && lista.data >= hojeISO() ? 'Ainda não chegou' : 'Faltou'
}

export const listasDaMarca = (fornecedorId, listas) =>
  listas
    .filter((l) => (l.fornecedores ?? []).includes(fornecedorId))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))

// Quem já está na lista, para não convocar de novo.
export const pessoasNaLista = (presencas) => new Set(presencas.filter((p) => p.pessoaId).map((p) => `${p.tipoPessoa}_${p.pessoaId}`))

export const mesmaPessoa = (a, b) => normalizar(a) === normalizar(b)
