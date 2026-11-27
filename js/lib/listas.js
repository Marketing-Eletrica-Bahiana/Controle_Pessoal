// Regras das listas de presença: tipos, presenças, contagens, resumo, planilhas e histórico.
import { LOJAS } from '../config.js'
import { formatarData, formatarHora, hojeISO, lerData, diasEntre } from './datas.js'
import { ehSetorComercial } from './colaboradores.js'
import { compararTexto, combinaBusca, limparEspacos, normalizar } from './texto.js'

export const TIPOS_DE_LISTA = ['Treinamento CAE', 'Treinamento Comercial', 'Evento', 'Ação de Endomarketing', 'Outro']
export const TIPOS_DE_ANIVERSARIO = ['Aniversariantes do mês', 'Aniversário de empresa']
export const TODOS_OS_TIPOS = [...TIPOS_DE_LISTA, ...TIPOS_DE_ANIVERSARIO]
export const TODAS_AS_LOJAS = 'Todas as lojas'
export const OUTRO_LOCAL = 'Outro local'
export const LOCAIS = [...LOJAS, TODAS_AS_LOJAS, OUTRO_LOCAL]

// Colaborador da loja escolhida em "Adicionar loja inteira"; "Todas as lojas" traz todo mundo (até quem está sem loja).
export const ehDaLoja = (colaborador, loja) => loja === TODAS_AS_LOJAS || colaborador.loja === loja

// "Adicionar colaboradores" por grupo. tipo: 'setor' (nome do setor), 'loja' (uma loja ou "Todas as lojas") ou 'pais'
// ("Pais e mães" para os dois, "Pai" ou "Mãe", como no cadastro). ativos: só os colaboradores ativos.
export const PAIS_E_MAES = 'Pais e mães'
export function colaboradoresDoGrupo(ativos, tipo, valor) {
  if (!valor) return []
  if (tipo === 'setor') return ativos.filter((c) => normalizar(c.setor) === normalizar(valor))
  if (tipo === 'pais') return ativos.filter((c) => (valor === PAIS_E_MAES ? Boolean(c.paiOuMae) : c.paiOuMae === valor))
  return ativos.filter((c) => ehDaLoja(c, valor))
}

export const ehListaDeAniversario = (lista) => TIPOS_DE_ANIVERSARIO.includes(lista?.tipo)

// Os controles de aniversariantes (do mês e de empresa) também são ações de endomarketing (pedido de 27/11/2026).
// O tipo gravado continua o de aniversário; só as contas e os filtros os tratam como ação.
export const TIPO_ACAO = 'Ação de Endomarketing'
export const ehAcaoDeEndomarketing = (lista) => lista?.tipo === TIPO_ACAO || ehListaDeAniversario(lista)

// Filtro por tipo: vazio = todos; "Ação de Endomarketing" também traz os controles de aniversariantes.
export const ehDoTipo = (lista, tipo) => !tipo || (tipo === TIPO_ACAO ? ehAcaoDeEndomarketing(lista) : lista?.tipo === tipo)

export const TIPOS_DE_PESSOA = {
  colaborador: 'Colaborador',
  eletricista: 'Eletricista',
  fornecedor: 'Fornecedor',
  outro: 'Outra pessoa',
  convidado: 'Convidado',
}

// Tipo mostrado nas telas e nas planilhas: para quem vem de Outras pessoas, o grupo (Diretoria, Prestador de serviço).
export const tipoDaPresenca = (p) => (p?.tipoPessoa === 'outro' ? p.grupo || TIPOS_DE_PESSOA.outro : TIPOS_DE_PESSOA[p?.tipoPessoa] ?? 'Pessoa')

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
  if (!LOCAIS.includes(entrada.loja)) erros.loja = 'Escolha a loja, "Todas as lojas" ou "Outro local".'
  if (entrada.loja === OUTRO_LOCAL && !local) erros.local = 'Diga onde vai ser.'
  if (local.length > 120) erros.local = 'Use até 120 letras.'
  return {
    erros,
    valido: Object.keys(erros).length === 0,
    dados: {
      nome, tipo: entrada.tipo, data, loja: entrada.loja, local, fornecedores: [...new Set(entrada.fornecedores ?? [])], temSorteio: entrada.temSorteio === true,
    },
  }
}

// Sorteio (pedido de 27/11/2026, festa de final de ano): na lista com "temSorteio", cada pessoa é marcada no check-in
// como dentro ou fora do sorteio, e as planilhas dizem quem participa. Sem marcação, colaboradores e os demais
// participam; quem vem de Outras pessoas (Diretoria, prestadores de serviço) começa fora.
export const participaDoSorteio = (p) => (typeof p?.sorteio === 'boolean' ? p.sorteio : p?.tipoPessoa !== 'outro')
export const rotuloDoSorteio = (p) => (participaDoSorteio(p) ? 'No sorteio' : 'Fora do sorteio')

export function filtrarListas(listas, { busca = '', tipo = '', situacao = '', ano = '' } = {}) {
  return listas
    .filter((l) => ehDoTipo(l, tipo))
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

// Colaborador, eletricista e outra pessoa têm ID previsível: a mesma pessoa nunca entra duas vezes na lista.
const COM_CADASTRO = ['colaborador', 'eletricista', 'outro']
export const idDaPresenca = (tipoPessoa, pessoaId) => (pessoaId && COM_CADASTRO.includes(tipoPessoa) ? `${tipoPessoa}_${pessoaId}` : null)

const base = { fornecedorId: '', presente: false, horaCheckin: null, checkinPor: null }

// Situação da pessoa numa lista comum, marcada ao abrir o nome no check-in (pedido de 27/11/2026). "Participou" é o
// próprio check-in (presente); quem não fez check-in pode ficar com "Não participou", "Outros" ou sem marcação. A
// observação (até 300 letras) vale para qualquer situação. Gravado em "status" e "observacao", os mesmos campos do
// controle de aniversariantes (as regras do Firestore já deixam o organizador mexer neles na lista aberta).
export const SITUACOES_DO_CHECKIN = [
  { valor: 'participou', rotulo: 'Participou', icone: 'circle-check' },
  { valor: 'nao_participou', rotulo: 'Não participou', icone: 'circle-x' },
  { valor: 'outros', rotulo: 'Outros', icone: 'info' },
  { valor: '', rotulo: 'Sem marcação', icone: 'circle-dashed' },
]
export const LIMITE_DA_OBSERVACAO = 300

// Situação no check-in: o check-in vale mais que o status; sem nada marcado, ''.
export const situacaoNoCheckin = (p) => (p.presente ? 'participou' : p.status === 'nao_participou' || p.status === 'outros' ? p.status : '')
export const rotuloDaSituacao = (situacao) => SITUACOES_DO_CHECKIN.find((s) => s.valor === situacao)?.rotulo ?? ''

// Dados gravados ao escolher a situação. Quem já tinha check-in e continua "Participou" mantém a hora e quem fez.
export function mudancaDeSituacao(situacao, atual, quem, agora) {
  if (situacao === 'participou') {
    const ja = Boolean(atual?.presente)
    return { presente: true, status: 'participou', horaCheckin: ja ? atual.horaCheckin ?? agora : agora, checkinPor: ja ? atual.checkinPor ?? quem : quem }
  }
  return { presente: false, status: situacao === 'nao_participou' || situacao === 'outros' ? situacao : '', horaCheckin: null, checkinPor: null }
}

export const limparObservacao = (texto) => limparEspacos(texto).slice(0, LIMITE_DA_OBSERVACAO)

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

// Pessoa da aba Outras pessoas (Diretoria, prestador de serviço...): o grupo fica em "grupo" e aparece como o tipo; o
// detalhe é a empresa ou função.
export const presencaDeOutraPessoa = (o, convocado = true) => ({
  ...base,
  tipoPessoa: 'outro',
  pessoaId: o.id,
  nome: o.nome,
  grupo: o.grupo || 'Outro',
  detalhe: o.empresa ?? '',
  convocado,
})

// Pessoa de fornecedor: detalhe "Marca · Função" (Palestrante, Representante ou Convidado). Presenças antigas só
// têm a marca no detalhe.
export const presencaDeFornecedor = (nome, fornecedor, funcao = '') => ({
  ...base,
  tipoPessoa: 'fornecedor',
  pessoaId: '',
  nome: limparEspacos(nome),
  detalhe: [fornecedor.nome, funcao].filter(Boolean).join(' · '),
  fornecedorId: fornecedor.id,
  convocado: true,
})

const partesDoDetalhe = (p) => String(p?.detalhe ?? '').split(' · ')
export const marcaDaPresenca = (p) => partesDoDetalhe(p)[0]
export const funcaoDaPresenca = (p) => (p?.tipoPessoa === 'fornecedor' ? partesDoDetalhe(p)[1] ?? '' : '')
// "Nome (Palestrante)" para pessoa de fornecedor com função; só o nome nos outros casos.
export const nomeComFuncao = (p) => (funcaoDaPresenca(p) ? `${p.nome} (${funcaoDaPresenca(p)})` : p.nome)

// A mesma pessoa da mesma marca já está na lista (pelo nome, sem diferenciar maiúsculas e acentos)?
export const fornecedorJaNaLista = (presencas, fornecedorId, nome) =>
  presencas.some((p) => p.tipoPessoa === 'fornecedor' && p.fornecedorId === fornecedorId && normalizar(p.nome) === normalizar(nome))

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
    // "Outros" (marcado no check-in, por exemplo atestado) não conta como falta.
    comercialFaltou = ausentes.filter((p) => p.tipoPessoa === 'colaborador' && situacaoNoCheckin(p) !== 'outros' && ehSetorComercial(setorDaPresenca(p, porId)))
  }
  const porMarca = new Map()
  for (const p of presencas.filter((x) => x.tipoPessoa === 'fornecedor')) {
    const marca = marcaDaPresenca(p)
    if (!porMarca.has(marca)) porMarca.set(marca, [])
    porMarca.get(marca).push(p)
  }
  return { conta: contarPresencas(presencas), presentes, ausentes, naoConvocados, comercialFaltou, porMarca }
}

// Quem do setor faltou num Treinamento Comercial (para o Dashboard).
export const comercialQueFaltou = (lista, presencas, colaboradores) => resumoDaLista(lista, presencas, colaboradores).comercialFaltou

// Planilhas

const horaDe = (p) => (p.horaCheckin instanceof Date ? formatarHora(p.horaCheckin) : '')
const tipoDe = tipoDaPresenca

const simOuNao = (valor) => (valor ? 'Sim' : 'Não')

// "Baixar presentes": a primeira coluna é "Nome" (o sorteador procura essa coluna). Com { sorteio: true } (lista com
// sorteio), ganha a coluna "Participa do sorteio" no fim.
export const CABECALHO_PRESENTES = ['Nome', 'Tipo', 'Detalhe', 'Hora do check-in']
export const COLUNA_DO_SORTEIO = 'Participa do sorteio'
export const cabecalhoPresentes = ({ sorteio = false } = {}) => (sorteio ? [...CABECALHO_PRESENTES, COLUNA_DO_SORTEIO] : CABECALHO_PRESENTES)
export const linhasPresentes = (presencas, { sorteio = false } = {}) =>
  presencas
    .filter((p) => p.presente)
    .sort((a, b) => compararTexto(a.nome, b.nome))
    .map((p) => [p.nome, tipoDe(p), p.detalhe ?? '', horaDe(p), ...(sorteio ? [simOuNao(participaDoSorteio(p))] : [])])

export const CABECALHO_COMPLETA = ['Nome', 'Tipo', 'Detalhe', 'Convocado', 'Presente', 'Hora do check-in', 'Check-in feito por', 'Situação', 'Observação']
export const cabecalhoCompleta = ({ sorteio = false } = {}) => (sorteio ? [...CABECALHO_COMPLETA, COLUNA_DO_SORTEIO] : CABECALHO_COMPLETA)
export const linhasCompleta = (presencas, { sorteio = false } = {}) =>
  [...presencas]
    .sort((a, b) => compararTexto(a.nome, b.nome))
    .map((p) => [
      p.nome,
      tipoDe(p),
      p.detalhe ?? '',
      simOuNao(p.convocado),
      simOuNao(p.presente),
      horaDe(p),
      p.presente ? p.checkinPor ?? '' : '',
      rotuloDaSituacao(situacaoNoCheckin(p)) || 'Sem marcação',
      p.observacao ?? '',
      ...(sorteio ? [simOuNao(participaDoSorteio(p))] : []),
    ])

// "Baixar lista do sorteio": só quem está presente e participa, com "Nome" na primeira coluna (para o sorteador).
export const CABECALHO_SORTEIO = ['Nome', 'Tipo', 'Detalhe']
export const linhasDoSorteio = (presencas) =>
  presencas
    .filter((p) => p.presente && participaDoSorteio(p))
    .sort((a, b) => compararTexto(a.nome, b.nome))
    .map((p) => [p.nome, tipoDe(p), p.detalhe ?? ''])

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

// Resultado da pessoa numa lista: "Compareceu", "Veio sem convite", o que foi marcado no check-in ("Não participou" ou
// "Outros"), "Ainda não chegou", "Faltou" ou, no controle de aniversariantes, o status marcado.
export function resultadoNaLista(lista, presenca) {
  if (ehListaDeAniversario(lista)) return STATUS_ANIVERSARIO[presenca.status] ?? 'Pendente'
  if (presenca.presente) return presenca.convocado ? 'Compareceu' : 'Veio sem convite'
  const marcada = situacaoNoCheckin(presenca)
  if (marcada) return rotuloDaSituacao(marcada)
  return lista.status === 'aberta' && lista.data >= hojeISO() ? 'Ainda não chegou' : 'Faltou'
}

// Situação para as contas (ranking da Participação): 'participou', 'nao_participou', 'outros' ou 'pendente'. No controle
// de aniversariantes vale o status; nas outras listas, o check-in e o que foi marcado ao abrir o nome.
export function situacaoDaPresenca(lista, presenca) {
  if (ehListaDeAniversario(lista)) return Object.hasOwn(STATUS_ANIVERSARIO, presenca.status) ? presenca.status : 'pendente'
  return situacaoNoCheckin(presenca) || 'pendente'
}

// Conta como falta: "Não participou" marcado e, fora do controle de aniversariantes, o convocado sem check-in e sem
// marcação. "Outros" e "Pendente" do controle não são falta.
export function contaComoFalta(lista, presenca) {
  const situacao = situacaoDaPresenca(lista, presenca)
  return Boolean(presenca.convocado) && (situacao === 'nao_participou' || (situacao === 'pendente' && !ehListaDeAniversario(lista)))
}

export const listasDaMarca = (fornecedorId, listas) =>
  listas
    .filter((l) => (l.fornecedores ?? []).includes(fornecedorId))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))

// Quem já está na lista, para não convocar de novo.
export const pessoasNaLista = (presencas) => new Set(presencas.filter((p) => p.pessoaId).map((p) => `${p.tipoPessoa}_${p.pessoaId}`))

export const mesmaPessoa = (a, b) => normalizar(a) === normalizar(b)
