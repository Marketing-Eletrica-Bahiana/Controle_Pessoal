// Datas são guardadas como texto "AAAA-MM-DD" (sem hora e sem fuso) e exibidas como DD/MM/AAAA.
// Horas aparecem como HH:MM. "Hoje" e as horas são sempre do fuso America/Bahia.

export const FUSO = 'America/Bahia'

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const dois = (n) => String(n).padStart(2, '0')

const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
const formatoHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export const dataISO = (data) => formatoDia.format(data)
export const hojeISO = (agora = new Date()) => dataISO(agora)

export function partesDeHoje(agora = new Date()) {
  const [ano, mes, dia] = hojeISO(agora).split('-').map(Number)
  return { ano, mes, dia }
}

// Monta "AAAA-MM-DD" só se a data existir no calendário (31/02 devolve null).
export function montarISO(ano, mes, dia) {
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  return existe && ano >= 1900 && ano <= 2200 ? `${ano}-${dois(mes)}-${dois(dia)}` : null
}

export function formatarData(iso) {
  if (!iso) return ''
  const [ano, mes, dia] = String(iso).split('-')
  return `${dia}/${mes}/${ano}`
}

export const formatarDiaMes = (dia, mes) => (dia && mes ? `${dois(dia)}/${dois(mes)}` : '')

export const formatarHora = (data) => (data instanceof Date && !Number.isNaN(data.getTime()) ? formatoHora.format(data) : '')

export const formatarDataHora = (data) =>
  data instanceof Date && !Number.isNaN(data.getTime()) ? `${formatarData(dataISO(data))} ${formatarHora(data)}` : ''

export const nomeDoMes = (mes) => NOMES_MESES[mes - 1] ?? ''
export const formatarMesAno = (mes, ano) => `${nomeDoMes(mes)}/${ano}`

// Dia e mês valem sem o ano (29/02 é aceito, porque o ano do nascimento não é guardado).
export const diaMesValidos = (dia, mes) => Number.isInteger(dia) && Number.isInteger(mes) && montarISO(2000, mes, dia) !== null

// Campo de data digitado: "DD/MM/AAAA" (ou "DD/MM/AA").
export function lerData(texto) {
  const partes = String(texto ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!partes) return null
  const ano = partes[3].length === 2 ? 2000 + Number(partes[3]) : Number(partes[3])
  return montarISO(ano, Number(partes[2]), Number(partes[1]))
}

// Põe as barras enquanto a pessoa digita: "05112026" vira "05/11/2026".
export function mascararData(texto) {
  const numeros = String(texto ?? '').replace(/\D/g, '').slice(0, 8)
  return [numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4)].filter(Boolean).join('/')
}

export function mascararDiaMes(texto) {
  const numeros = String(texto ?? '').replace(/\D/g, '').slice(0, 4)
  return [numeros.slice(0, 2), numeros.slice(2)].filter(Boolean).join('/')
}

// "DD/MM" do aniversário (sem ano).
export function lerDiaMes(texto) {
  const partes = String(texto ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!partes) return null
  const dia = Number(partes[1])
  const mes = Number(partes[2])
  return diaMesValidos(dia, mes) ? { dia, mes } : null
}

// Número de série de data do Excel (1 = 01/01/1900), contando o 29/02/1900 que o Excel inventa.
// Abaixo de 3654 (ano 1910) é quase sempre um número digitado por engano, não uma data.
export function serialExcelParaISO(serial) {
  if (typeof serial !== 'number' || !Number.isFinite(serial) || serial < 3654 || serial > 120000) return null
  const data = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000)
  return montarISO(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate())
}

const MESES_ESCRITOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Data vinda de planilha: número de série, Date, "DD/MM/AAAA", "DD/MM", "AAAA-MM-DD" ou "15 de março de 1990".
// Devolve { dia, mes, ano } (ano null quando a planilha não informa) ou null.
export function lerDataDaPlanilha(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null
    return { dia: valor.getUTCDate(), mes: valor.getUTCMonth() + 1, ano: valor.getUTCFullYear() }
  }
  if (typeof valor === 'number') {
    const iso = serialExcelParaISO(valor)
    if (!iso) return null
    const [ano, mes, dia] = iso.split('-').map(Number)
    return { dia, mes, ano }
  }
  const texto = String(valor).trim().toLowerCase()
  // Número de série escrito como texto (planilha .csv). Abaixo de 10000 (ano de 1927) é um ano solto, não uma data.
  if (/^\d+(\.\d+)?$/.test(texto)) return Number(texto) >= 10000 ? lerDataDaPlanilha(Number(texto)) : null

  let partes = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (partes) return conferir(Number(partes[3]), Number(partes[2]), Number(partes[1]))

  partes = texto.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/)
  if (partes) {
    const ano = partes[3] ? (partes[3].length === 2 ? seculo(Number(partes[3])) : Number(partes[3])) : null
    return conferir(Number(partes[1]), Number(partes[2]), ano)
  }

  partes = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .match(/^(\d{1,2})(?:\s*de\s*|\s+|[/.-])([a-z]{3})[a-z]*\.?(?:(?:\s*de\s*|\s+|[/.-])(\d{2}|\d{4}))?$/)
  if (partes && MESES_ESCRITOS.includes(partes[2])) {
    const ano = partes[3] ? (partes[3].length === 2 ? seculo(Number(partes[3])) : Number(partes[3])) : null
    return conferir(Number(partes[1]), MESES_ESCRITOS.indexOf(partes[2]) + 1, ano)
  }
  return null
}

// "90" vira 1990 e "15" vira 2015: datas de planilha com dois dígitos raramente estão no futuro.
function seculo(doisDigitos) {
  const anoAtual = partesDeHoje().ano % 100
  return doisDigitos > anoAtual ? 1900 + doisDigitos : 2000 + doisDigitos
}

function conferir(dia, mes, ano) {
  if (ano === null) return diaMesValidos(dia, mes) ? { dia, mes, ano: null } : null
  return montarISO(ano, mes, dia) ? { dia, mes, ano } : null
}

export const somarDias = (iso, dias) => {
  const [a, m, d] = iso.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d + dias))
  return montarISO(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate())
}

export function diasEntre(isoInicio, isoFim) {
  const utc = (iso) => {
    const [a, m, d] = iso.split('-').map(Number)
    return Date.UTC(a, m - 1, d)
  }
  return Math.round((utc(isoFim) - utc(isoInicio)) / 86400000)
}
