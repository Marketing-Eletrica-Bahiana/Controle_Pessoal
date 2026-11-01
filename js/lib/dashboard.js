// Cálculos do Dashboard. As contagens de presença de cada lista chegam prontas (consultas de
// contagem no banco), aqui só se junta e se ordena.
import { LOJAS } from '../config.js'
import { nomeDoMes } from './datas.js'
import { ehListaDeAniversario } from './listas.js'
import { compararTexto } from './texto.js'

export function numerosGerais({ colaboradores, fornecedores, listas, eletricistasAtivos, hoje }) {
  const ativos = colaboradores.filter((c) => c.ativo !== false)
  const porLoja = Object.fromEntries(LOJAS.map((l) => [l, ativos.filter((c) => c.loja === l).length]))
  const ano = hoje.slice(0, 4)
  const realizadas = listas.filter((l) => !ehListaDeAniversario(l) && String(l.data).startsWith(ano) && l.data <= hoje)
  return {
    colaboradores: ativos.length,
    porLoja,
    eletricistas: eletricistasAtivos,
    fornecedores: fornecedores.filter((f) => f.ativo !== false).length,
    listasNoAno: realizadas.length,
    ano: Number(ano),
  }
}

// Período: { ano, mes } com mes 0 = ano inteiro. Só listas que já aconteceram (até hoje).
export function listasDoPeriodo(listas, { ano, mes }, hoje) {
  const prefixo = mes ? `${ano}-${String(mes).padStart(2, '0')}` : String(ano)
  return listas
    .filter((l) => !ehListaDeAniversario(l) && String(l.data).startsWith(prefixo) && l.data <= hoje)
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))
}

export const descricaoDoPeriodo = ({ ano, mes }) => (mes ? `${nomeDoMes(mes)} de ${ano}` : `ano de ${ano}`)

export function rankingDeFornecedores(fornecedores, listas) {
  const vezes = new Map()
  for (const l of listas) for (const id of new Set(l.fornecedores ?? [])) vezes.set(id, (vezes.get(id) ?? 0) + 1)
  const ranking = fornecedores
    .map((f) => ({ fornecedor: f, vezes: vezes.get(f.id) ?? 0 }))
    .filter((r) => r.vezes > 0)
    .sort((a, b) => b.vezes - a.vezes || compararTexto(a.fornecedor.nome, b.fornecedor.nome))
  return { ranking, participaram: ranking.length }
}

// contagens: Map listaId -> { convocados, presentesConvocados, presentes, naoConvocadosPresentes }
export function resumoDosTreinamentos(listas, contagens) {
  const treinamentos = listas
    .map((lista) => {
      const c = contagens.get(lista.id) ?? { convocados: 0, presentesConvocados: 0, presentes: 0 }
      return { lista, ...c, taxa: c.convocados ? Math.round((c.presentesConvocados / c.convocados) * 100) : null }
    })
    .sort((a, b) => String(b.lista.data).localeCompare(String(a.lista.data)))
  const comTaxa = treinamentos.filter((t) => t.taxa !== null)
  return {
    treinamentos,
    mediaDaTaxa: comTaxa.length ? Math.round(comTaxa.reduce((s, t) => s + t.taxa, 0) / comTaxa.length) : null,
    mediaDePresentes: treinamentos.length ? Math.round(treinamentos.reduce((s, t) => s + t.presentes, 0) / treinamentos.length) : null,
  }
}

// Listas abertas (fora os controles de aniversário), das mais próximas para as mais distantes.
export function listasAbertas(listas, hoje) {
  return listas
    .filter((l) => !ehListaDeAniversario(l) && l.status === 'aberta')
    .sort((a, b) => {
      const futuraA = a.data >= hoje
      const futuraB = b.data >= hoje
      if (futuraA !== futuraB) return futuraA ? -1 : 1
      return futuraA ? String(a.data).localeCompare(String(b.data)) : String(b.data).localeCompare(String(a.data))
    })
}

export function anosDisponiveis(listas, anoAtual) {
  return [...new Set([anoAtual, ...listas.filter((l) => !ehListaDeAniversario(l)).map((l) => Number(String(l.data).slice(0, 4))).filter(Boolean)])].sort((a, b) => b - a)
}
