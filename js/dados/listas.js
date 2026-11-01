// Gravação de listas/{id} e da subcoleção presencas/{id}.
// listas: nome, tipo, data ("AAAA-MM-DD"), loja (uma das lojas ou "Outro local"), local, fornecedores
//   (IDs das marcas), status ("aberta" | "encerrada"), criadoPor (nome), criadoEm.
// presencas: tipoPessoa, pessoaId, nome, detalhe, fornecedorId, convocado, presente, horaCheckin,
//   checkinPor (nome de quem fez o check-in). Colaborador e eletricista usam o ID "tipo_pessoaId".
import { idDaPresenca } from '../lib/listas.js'
import {
  agora, apagar, atualizar, definir, gravarLote, incluirNaLista, lerColecao, lerDocumento, lerGrupo, novoId, ouvirColecao,
} from './banco.js'

const caminhoDaPresenca = (listaId, presencaId) => `listas/${listaId}/presencas/${presencaId}`

export async function criarLista(dados, pessoa) {
  const id = novoId('listas')
  await definir(`listas/${id}`, { ...dados, status: 'aberta', criadoPor: pessoa.nome, criadoEm: agora() })
  return id
}

export const editarLista = (id, dados) => atualizar(`listas/${id}`, dados)

export const definirStatusDaLista = (id, status) => atualizar(`listas/${id}`, { status })

export async function excluirLista(id, presencas) {
  await gravarLote([...presencas.map((p) => ({ tipo: 'apagar', caminho: caminhoDaPresenca(id, p.id) })), { tipo: 'apagar', caminho: `listas/${id}` }])
}

// aoMudar(presencas, { pendente }): pendente = há check-ins deste aparelho esperando a internet.
export const ouvirPresencas = (listaId, aoMudar, aoErrar) =>
  ouvirColecao(`listas/${listaId}/presencas`, aoMudar, aoErrar, [], { comPendencias: true })

// Convocados escolhidos pelo admin. Pessoas de fornecedor também entram na lista de marcas da lista.
export async function adicionarConvocados(listaId, novas) {
  const operacoes = novas.map((p) => ({
    tipo: 'definir',
    caminho: caminhoDaPresenca(listaId, idDaPresenca(p.tipoPessoa, p.pessoaId) ?? novoId(`listas/${listaId}/presencas`)),
    dados: p,
  }))
  const marcas = [...new Set(novas.map((p) => p.fornecedorId).filter(Boolean))]
  if (marcas.length) operacoes.push({ tipo: 'atualizar', caminho: `listas/${listaId}`, dados: { fornecedores: incluirNaLista(...marcas) } })
  await gravarLote(operacoes)
}

export const removerPresenca = (listaId, presencaId) => apagar(caminhoDaPresenca(listaId, presencaId))

// Check-in e desfazer. Não espera o servidor: com internet fraca, fica no aparelho e sobe depois.
export function marcarPresenca(listaId, presencaId, presente, pessoa) {
  return atualizar(caminhoDaPresenca(listaId, presencaId), {
    presente,
    horaCheckin: presente ? agora() : null,
    checkinPor: presente ? pessoa.nome : null,
  })
}

// Participante não convocado que chegou: entra já presente.
export function adicionarNaoConvocado(listaId, presenca, pessoa) {
  const id = idDaPresenca(presenca.tipoPessoa, presenca.pessoaId) ?? novoId(`listas/${listaId}/presencas`)
  const enviado = definir(caminhoDaPresenca(listaId, id), {
    ...presenca,
    convocado: false,
    presente: true,
    horaCheckin: agora(),
    checkinPor: pessoa.nome,
  })
  return { id, enviado }
}

export const lerPresencas = (listaId, filtros = []) => lerColecao(`listas/${listaId}/presencas`, filtros)

// Histórico de uma pessoa em todas as listas. Usa a consulta em grupo (precisa do índice de
// "pessoaId" para grupos de coleção); se o banco ainda não tiver o índice, lê lista por lista
// pelo ID previsível da presença.
export async function historicoDaPessoa(tipoPessoa, pessoaId, listas) {
  try {
    const encontradas = await lerGrupo('presencas', [['pessoaId', '==', pessoaId]])
    return encontradas.filter((p) => p.tipoPessoa === tipoPessoa)
  } catch (erro) {
    if (!['failed-precondition', 'permission-denied', 'invalid-argument'].includes(erro?.code)) throw erro
    console.warn('Histórico lido lista por lista (falta o índice de pessoaId para grupos de coleção).', erro)
    const id = idDaPresenca(tipoPessoa, pessoaId)
    const lidas = await Promise.all(listas.map((l) => lerDocumento(caminhoDaPresenca(l.id, id)).then((p) => (p ? { ...p, paiId: l.id } : null))))
    return lidas.filter(Boolean)
  }
}

// Pessoas que uma marca enviou em cada lista. Devolve { listaId: [presenças] }.
export async function pessoasDaMarca(fornecedorId, listas) {
  const resultado = await Promise.all(listas.map((l) => lerPresencas(l.id, [['fornecedorId', '==', fornecedorId]]).then((p) => [l.id, p])))
  return Object.fromEntries(resultado)
}
