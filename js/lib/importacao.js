// Partes da importação de planilha que valem para qualquer cadastro: achar a linha do cabeçalho,
// sugerir qual coluna é cada campo e tirar os valores de cada linha.
import { lerDataDaPlanilha } from './datas.js'
import { normalizar } from './texto.js'

// Texto de um arquivo .csv. O Google Planilhas e o "CSV UTF-8" do Excel gravam em UTF-8; o "CSV" comum do
// Excel grava no ANSI do Windows. Bytes que não são UTF-8 válido só podem ser ANSI.
export function lerTextoDoCsv(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

// "A", "B", ..., "Z", "AA"...
export function nomeDaColuna(indice) {
  let n = indice + 1
  let nome = ''
  while (n > 0) {
    const resto = (n - 1) % 26
    nome = String.fromCharCode(65 + resto) + nome
    n = Math.floor((n - 1) / 26)
  }
  return nome
}

const vazia = (linha) => !linha || linha.every((v) => String(v ?? '').trim() === '')

const combina = (texto, campo) => {
  const t = normalizar(texto)
  return Boolean(t) && campo.sinonimos.some((s) => t === s || t.includes(s))
}

// A linha do cabeçalho é a primeira (entre as 10 primeiras) que tem nomes de campos conhecidos.
export function acharCabecalho(linhas, campos) {
  let melhor = { indice: -1, acertos: 0 }
  linhas.slice(0, 10).forEach((linha, indice) => {
    if (vazia(linha)) return
    const acertos = campos.filter((campo) => linha.some((celula) => typeof celula === 'string' && combina(celula, campo))).length
    if (acertos > melhor.acertos) melhor = { indice, acertos }
  })
  if (melhor.indice >= 0) return melhor.indice
  return Math.max(0, linhas.findIndex((linha) => !vazia(linha)))
}

// Para cada campo, a coluna cujo título combina melhor (título igual ganha de título que contém).
// Cada coluna serve a um campo só. Devolve { chave: índice da coluna, ou -1 }.
export function sugerirMapeamento(cabecalho, campos) {
  const usadas = new Set()
  const mapa = {}
  for (const exato of [true, false]) {
    for (const campo of campos) {
      if (mapa[campo.chave] >= 0) continue
      const indice = (cabecalho ?? []).findIndex((titulo, i) => {
        if (usadas.has(i)) return false
        const t = normalizar(titulo)
        return exato ? campo.sinonimos.includes(t) : combina(titulo, campo)
      })
      if (indice >= 0) {
        mapa[campo.chave] = indice
        usadas.add(indice)
      }
    }
  }
  for (const campo of campos) if (!(mapa[campo.chave] >= 0)) mapa[campo.chave] = -1
  return mapa
}

// Linhas depois do cabeçalho, com o número da linha como aparece no Excel. Linhas vazias saem.
export function extrairRegistros(linhas, indiceCabecalho, mapeamento) {
  const registros = []
  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i]
    if (vazia(linha)) continue
    const valores = {}
    for (const [chave, coluna] of Object.entries(mapeamento)) {
      const valor = coluna >= 0 ? linha[coluna] : ''
      valores[chave] = typeof valor === 'string' ? valor.trim() : (valor ?? '')
    }
    registros.push({ linha: i + 1, valores })
  }
  return registros
}

// Exemplos de valores de uma coluna, para a pessoa conferir se escolheu certo.
// Em campos de data, o número de série do Excel aparece como DD/MM/AAAA.
export function exemplosDaColuna(linhas, indiceCabecalho, coluna, quantidade = 3, tipo = '') {
  if (coluna < 0) return []
  const exemplos = []
  for (let i = indiceCabecalho + 1; i < linhas.length && exemplos.length < quantidade; i++) {
    const valor = linhas[i]?.[coluna]
    if (String(valor ?? '').trim() === '') continue
    const data = tipo === 'data' && typeof valor === 'number' ? lerDataDaPlanilha(valor) : null
    exemplos.push(data ? `${String(data.dia).padStart(2, '0')}/${String(data.mes).padStart(2, '0')}/${data.ano}` : String(valor).trim())
  }
  return exemplos
}
