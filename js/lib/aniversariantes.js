// Aniversariantes do mês (pelo dia e mês do nascimento) e de empresa (tempo de casa pela admissão),
// e o controle mensal de quem participou da ação da mensagem de Feliz Aniversário.
import { formatarWhatsapp } from './contato.js'
import { formatarDiaMes, formatarMesAno, nomeDoMes } from './datas.js'
import { STATUS_ANIVERSARIO, detalheDoColaborador } from './listas.js'
import { compararTexto } from './texto.js'

export const TIPO_MES = 'Aniversariantes do mês'
export const TIPO_EMPRESA = 'Aniversário de empresa'
export const STATUS = ['pendente', 'participou', 'nao_participou']
export { STATUS_ANIVERSARIO }

const dois = (n) => String(n).padStart(2, '0')
const porDia = (a, b) => a.dia - b.dia || compararTexto(a.colaborador.nome, b.colaborador.nome)

export function aniversariantesDoMes(colaboradores, mes) {
  return colaboradores
    .filter((c) => c.ativo !== false && c.nascimentoMes === mes && c.nascimentoDia)
    .map((c) => ({ colaborador: c, dia: c.nascimentoDia }))
    .sort(porDia)
}

// Só quem completa pelo menos um ano de casa no ano escolhido.
export function aniversariosDeEmpresa(colaboradores, mes, ano) {
  return colaboradores
    .filter((c) => c.ativo !== false && c.admissao && Number(c.admissao.slice(5, 7)) === mes && Number(c.admissao.slice(0, 4)) < ano)
    .map((c) => ({ colaborador: c, dia: Number(c.admissao.slice(8, 10)), anos: ano - Number(c.admissao.slice(0, 4)) }))
    .sort(porDia)
}

export const ehHoje = (dia, mes, hoje) => dia === hoje.dia && mes === hoje.mes

// Controle do mês: uma lista em "listas" com ID previsível, para nunca gerar duas vezes.
export const idDoControle = (tipo, mes, ano) => `${tipo === TIPO_EMPRESA ? 'aniversario-empresa' : 'aniversariantes'}-${ano}-${dois(mes)}`

export const nomeDoControle = (tipo, mes, ano) =>
  tipo === TIPO_EMPRESA ? `Aniversário de empresa de ${formatarMesAno(mes, ano)}` : `Aniversariantes de ${formatarMesAno(mes, ano)}`

export const listaDoControle = (tipo, mes, ano) => ({
  nome: nomeDoControle(tipo, mes, ano),
  tipo,
  data: `${ano}-${dois(mes)}-01`,
  loja: '',
  local: '',
  fornecedores: [],
  status: 'aberta',
})

export const presencaDoAniversariante = (c) => ({
  tipoPessoa: 'colaborador',
  pessoaId: c.id,
  nome: c.nome,
  detalhe: detalheDoColaborador(c),
  fornecedorId: '',
  convocado: true,
  presente: false,
  horaCheckin: null,
  checkinPor: null,
  status: 'pendente',
  observacao: '',
})

// Mês e ano do controle, tirados da data ("AAAA-MM-01").
export const mesDoControle = (lista) => ({ ano: Number(String(lista.data).slice(0, 4)), mes: Number(String(lista.data).slice(5, 7)) })

export function contarStatus(presencas) {
  const conta = { pendente: 0, participou: 0, nao_participou: 0 }
  for (const p of presencas) conta[STATUS.includes(p.status) ? p.status : 'pendente']++
  return conta
}

// Quem é aniversariante mas ainda não está no controle (cadastrado depois de gerar).
export const faltandoNoControle = (aniversariantes, presencas) => {
  const ja = new Set(presencas.map((p) => p.pessoaId))
  return aniversariantes.filter((a) => !ja.has(a.colaborador.id))
}

// Dados gravados ao marcar o status (presente acompanha "Participou").
export const mudancaDeStatus = (status, quem, agora) =>
  status === 'pendente'
    ? { status, presente: false, horaCheckin: null, checkinPor: null }
    : { status, presente: status === 'participou', horaCheckin: agora, checkinPor: quem }

// Histórico: listas de aniversário com as presenças de cada uma.
// controles: [{ lista, presencas }]. Devolve { pessoas, ranking }.
export function historicoDosAniversarios(controles) {
  const pessoas = new Map()
  for (const { lista, presencas } of controles) {
    const { mes, ano } = mesDoControle(lista)
    for (const p of presencas) {
      if (!pessoas.has(p.pessoaId)) pessoas.set(p.pessoaId, { pessoaId: p.pessoaId, nome: p.nome, registros: [], conta: { pendente: 0, participou: 0, nao_participou: 0 } })
      const pessoa = pessoas.get(p.pessoaId)
      const status = STATUS.includes(p.status) ? p.status : 'pendente'
      pessoa.registros.push({ listaId: lista.id, tipo: lista.tipo, mes, ano, status, observacao: p.observacao ?? '' })
      pessoa.conta[status]++
    }
  }
  const lista = [...pessoas.values()]
  for (const p of lista) p.registros.sort((a, b) => b.ano - a.ano || b.mes - a.mes)
  lista.sort((a, b) => compararTexto(a.nome, b.nome))
  const ranking = lista
    .filter((p) => p.conta.nao_participou > 0)
    .sort((a, b) => b.conta.nao_participou - a.conta.nao_participou || a.conta.participou - b.conta.participou || compararTexto(a.nome, b.nome))
  return { pessoas: lista, ranking }
}

export const rotuloCurtoDoMes = (mes, ano) => `${nomeDoMes(mes).slice(0, 3)}/${ano}`

// Planilha do mês: uma aba para cada tipo, com o status do controle (quando existe).
export function abasDoMes({ mes, ano, doMes, deEmpresa, statusMes, statusEmpresa }) {
  const status = (mapa, id) => {
    if (!mapa) return ['Controle não gerado', '']
    const p = mapa.get(id)
    return p ? [STATUS_ANIVERSARIO[p.status] ?? 'Pendente', p.observacao ?? ''] : ['Fora do controle', '']
  }
  const contato = (c) => [formatarWhatsapp(c.telefone), c.email ?? '']
  return [
    {
      nome: 'Aniversariantes',
      cabecalho: ['Dia', 'Nome', 'Setor', 'Loja', 'Telefone', 'E-mail', 'Status', 'Observação'],
      linhas: doMes.map(({ colaborador: c, dia }) => [formatarDiaMes(dia, mes), c.nome, c.setor ?? '', c.loja ?? '', ...contato(c), ...status(statusMes, c.id)]),
    },
    {
      nome: 'Aniversário de empresa',
      cabecalho: ['Dia', 'Nome', 'Setor', 'Loja', 'Telefone', 'E-mail', 'Anos de casa', 'Status', 'Observação'],
      linhas: deEmpresa.map(({ colaborador: c, dia, anos }) => [formatarDiaMes(dia, mes), c.nome, c.setor ?? '', c.loja ?? '', ...contato(c), anos, ...status(statusEmpresa, c.id)]),
    },
  ]
}

export const nomeDoArquivoDoMes = (mes, ano) => `Aniversariantes ${nomeDoMes(mes)}-${ano}`
