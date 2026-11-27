// Coleções usadas por várias telas (colaboradores, setores, listas...). Cada uma tem um só ouvinte no
// Firestore enquanto a pessoa usa o app, e todas as telas recebem a mesma lista: trocar de aba é
// instantâneo e não lê tudo de novo. Os ouvintes param ao sair.
import { ouvirColecao } from './banco.js'

const fontes = new Map()

function criarFonte(caminho) {
  let lista = null
  let erro = null
  let parar = null
  const assinantes = new Set()
  const avisarTodos = () => assinantes.forEach((aoMudar) => aoMudar(lista, erro))

  return {
    ouvir(aoMudar) {
      assinantes.add(aoMudar)
      if (!parar) {
        parar = ouvirColecao(
          caminho,
          (dados) => {
            lista = dados
            erro = null
            avisarTodos()
          },
          (e) => {
            erro = e
            avisarTodos()
          },
        )
      }
      if (lista || erro) aoMudar(lista, erro)
      return () => assinantes.delete(aoMudar)
    },
    atual: () => lista,
    parar() {
      parar?.()
      parar = null
      lista = null
      erro = null
      assinantes.clear()
    },
  }
}

export function fonte(caminho) {
  if (!fontes.has(caminho)) fontes.set(caminho, criarFonte(caminho))
  return fontes.get(caminho)
}

// Ouve várias coleções juntas. aoMudar(dados, erro): dados só chega quando todas carregaram,
// como { colaboradores: [...], setores: [...] }. opcionais: coleções que podem falhar sem derrubar a tela (por exemplo
// outrasPessoas antes de publicar as regras novas); se falharem, chegam como [] e o nome vai em dados.indisponiveis.
export function ouvirFontes(caminhos, aoMudar, { opcionais = [] } = {}) {
  const dados = {}
  const erros = {}
  const cancelar = [...caminhos, ...opcionais].map((caminho) =>
    fonte(caminho).ouvir((lista, e) => {
      dados[caminho] = lista
      erros[caminho] = e
      const erro = caminhos.map((c) => erros[c]).find(Boolean) ?? null
      const prontos = caminhos.every((c) => dados[c]) && opcionais.every((c) => dados[c] || erros[c])
      if (erro || !prontos) return aoMudar(null, erro)
      const extras = Object.fromEntries(opcionais.map((c) => [c, dados[c] ?? []]))
      aoMudar(opcionais.length ? { ...dados, ...extras, indisponiveis: opcionais.filter((c) => erros[c]) } : { ...dados }, null)
    }),
  )
  return () => cancelar.forEach((parar) => parar())
}

export function pararFontes() {
  for (const f of fontes.values()) f.parar()
  fontes.clear()
}
