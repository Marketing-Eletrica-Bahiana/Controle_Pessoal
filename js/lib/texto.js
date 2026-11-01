// Funções de texto usadas em buscas, comparações e exibição.

export const limparEspacos = (texto) => String(texto ?? '').replace(/\s+/g, ' ').trim()

export const primeiroNome = (nome) => limparEspacos(nome).split(' ')[0] ?? ''

// Sem diferenciar maiúsculas, acentos e pontuação.
export const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Pedaço de texto seguro para usar como ID de documento.
export const paraId = (texto) => normalizar(texto).replace(/\s+/g, '-')

const colador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
export const compararTexto = (a, b) => colador.compare(String(a ?? ''), String(b ?? ''))

export const ordenarPor = (lista, campo = 'nome') => [...lista].sort((a, b) => compararTexto(a[campo], b[campo]))

// Cada palavra da busca precisa aparecer no texto, em qualquer ordem.
export function combinaBusca(texto, busca) {
  const palavras = normalizar(busca).split(' ').filter(Boolean)
  if (!palavras.length) return true
  const alvo = normalizar(texto)
  return palavras.every((p) => alvo.includes(p))
}

const numero = new Intl.NumberFormat('pt-BR')
export const formatarNumero = (n) => numero.format(n ?? 0)

export const plural = (n, um, varios) => `${formatarNumero(n)} ${n === 1 ? um : varios}`

export function porcentagem(parte, total) {
  if (!total) return null
  return Math.round((parte / total) * 100)
}

export const textoPorcentagem = (parte, total) => {
  const p = porcentagem(parte, total)
  return p === null ? 'Sem convocados' : `${p}%`
}

// Nome de arquivo sem os caracteres que o Windows não aceita.
export const nomeDeArquivo = (texto) =>
  limparEspacos(String(texto ?? '').replace(/[\\/:*?"<>|]+/g, ' ')).replace(/[. ]+$/, '') || 'arquivo'
