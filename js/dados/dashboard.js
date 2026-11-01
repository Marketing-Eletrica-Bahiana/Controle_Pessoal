// Consultas do Dashboard. Usa contagens do próprio banco (cada uma custa uma leitura a cada mil
// documentos), em vez de baixar todas as presenças. Listas encerradas não mudam: as contagens delas
// ficam guardadas enquanto o app estiver aberto.
import { ehSetorComercial } from '../lib/colaboradores.js'
import { contar, lerColecao } from './banco.js'

const guardadas = new Map()

export async function contagensDaLista(lista) {
  const chave = `${lista.id}|contagens`
  if (lista.status === 'encerrada' && guardadas.has(chave)) return guardadas.get(chave)
  const caminho = `listas/${lista.id}/presencas`
  const [convocados, presentesConvocados, presentes] = await Promise.all([
    contar(caminho, [['convocado', '==', true]]),
    contar(caminho, [['convocado', '==', true], ['presente', '==', true]]),
    contar(caminho, [['presente', '==', true]]),
  ])
  const resultado = { convocados, presentesConvocados, presentes, naoConvocadosPresentes: presentes - presentesConvocados }
  if (lista.status === 'encerrada') guardadas.set(chave, resultado)
  return resultado
}

// Quem do setor comercial foi convocado e faltou (lê só os ausentes).
export async function comercialQueFaltou(lista, colaboradores) {
  const chave = `${lista.id}|comercial`
  let ausentes = lista.status === 'encerrada' ? guardadas.get(chave) : null
  if (!ausentes) {
    ausentes = await lerColecao(`listas/${lista.id}/presencas`, [['convocado', '==', true], ['presente', '==', false]])
    if (lista.status === 'encerrada') guardadas.set(chave, ausentes)
  }
  const porId = new Map(colaboradores.map((c) => [c.id, c]))
  return ausentes.filter((p) => p.tipoPessoa === 'colaborador' && ehSetorComercial(porId.get(p.pessoaId)?.setor ?? String(p.detalhe ?? '').split(' · ')[0]))
}

export const contarEletricistasAtivos = () => contar('eletricistas', [['ativo', '==', true]])

export const contarPendentes = (listaId) => contar(`listas/${listaId}/presencas`, [['status', '==', 'pendente']])
