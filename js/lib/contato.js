// Telefone, WhatsApp e e-mail, usados nos cadastros de colaboradores, eletricistas e fornecedores.

export const FORMATO_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const normalizarEmail = (texto) => String(texto ?? '').replace(/\s+/g, '').toLowerCase()

// Aceita com ou sem máscara, com +55 ou 0 na frente. Devolve só os números com DDD (10 ou 11), ou null.
export function normalizarWhatsapp(texto) {
  let numeros = String(texto ?? '').replace(/\D/g, '')
  if (!numeros) return ''
  if ((numeros.length === 12 || numeros.length === 13) && numeros.startsWith('55')) numeros = numeros.slice(2)
  if ((numeros.length === 11 || numeros.length === 12) && numeros.startsWith('0')) numeros = numeros.slice(1)
  if (numeros.length !== 10 && numeros.length !== 11) return null
  if (numeros[0] === '0' || numeros[1] === '0') return null
  if (numeros.length === 11 && numeros[2] !== '9') return null
  return numeros
}

export function formatarWhatsapp(numeros) {
  const n = String(numeros ?? '')
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return n
}

export const linkDoWhatsapp = (numeros) => (numeros ? `https://wa.me/55${numeros}` : '')

// Máscara enquanto a pessoa digita: "71999998888" vira "(71) 99999-8888".
export function mascararTelefone(texto) {
  const n = String(texto ?? '').replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2) return n.length ? `(${n}` : ''
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}
