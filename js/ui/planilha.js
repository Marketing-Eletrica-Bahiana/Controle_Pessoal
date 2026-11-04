// Leitura e geração de planilhas com SheetJS, carregado do CDN só quando alguém precisa.
import { erroDoApp } from '../lib/erros.js'
import { lerTextoDoCsv } from '../lib/importacao.js'

let xlsx = null
async function carregarSheetJS() {
  if (!xlsx) {
    try {
      xlsx = await import('xlsx')
    } catch {
      throw erroDoApp('Não deu para carregar o leitor de planilhas. Confira a internet e tente de novo.')
    }
  }
  return xlsx
}

// Devolve [{ nome, linhas }], uma por aba. Datas do Excel chegam como número de série.
export async function lerPlanilha(arquivo) {
  const nome = arquivo.name.toLowerCase()
  if (!/\.(xlsx|xlsm|xls|csv|ods)$/.test(nome)) throw erroDoApp('Escolha um arquivo .xlsx (também servem .xls, .csv e .ods).')
  const XLSX = await carregarSheetJS()
  let livro
  try {
    const conteudo = await arquivo.arrayBuffer()
    livro = nome.endsWith('.csv')
      ? XLSX.read(lerTextoDoCsv(new Uint8Array(conteudo)), { type: 'string', raw: true })
      : XLSX.read(conteudo, { type: 'array' })
  } catch {
    throw erroDoApp('Não deu para abrir esse arquivo. Confira se é uma planilha e se não está protegida por senha.')
  }
  const abas = livro.SheetNames.map((nomeDaAba) => ({
    nome: nomeDaAba,
    linhas: XLSX.utils.sheet_to_json(livro.Sheets[nomeDaAba], { header: 1, raw: true, defval: '', blankrows: true }),
  })).filter((aba) => aba.linhas.some((linha) => linha.some((v) => String(v ?? '').trim() !== '')))
  if (!abas.length) throw erroDoApp('A planilha está vazia.')
  return abas
}

// abas: [{ nome, cabecalho: [...], linhas: [[...]] }]. O download começa na hora.
export async function baixarPlanilha(nomeDoArquivo, abas) {
  const XLSX = await carregarSheetJS()
  const livro = XLSX.utils.book_new()
  for (const { nome, cabecalho, linhas } of abas) {
    const folha = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas])
    folha['!cols'] = cabecalho.map((titulo, i) => ({
      wch: Math.min(50, Math.max(String(titulo).length, ...linhas.map((l) => String(l[i] ?? '').length)) + 2),
    }))
    if (linhas.length) folha['!autofilter'] = { ref: folha['!ref'] }
    XLSX.utils.book_append_sheet(livro, folha, nome.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))
  }
  XLSX.writeFile(livro, nomeDoArquivo.endsWith('.xlsx') ? nomeDoArquivo : `${nomeDoArquivo}.xlsx`, { compression: true })
}
