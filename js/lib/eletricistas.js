// Regras dos eletricistas do CAE: WhatsApp, autorização LGPD, vendedor, validação e importação.
import { formatarData, dataISO, lerDataDaPlanilha, montarISO } from './datas.js'
import { ehSetorComercial } from './colaboradores.js'
import { formatarWhatsapp, normalizarWhatsapp } from './contato.js'
import { compararTexto, combinaBusca, limparEspacos, normalizar } from './texto.js'

export { formatarWhatsapp, linkDoWhatsapp, mascararTelefone, normalizarWhatsapp } from './contato.js'

export const TEXTO_LGPD = 'O eletricista autorizou o uso dos dados para contato da Elétrica Bahiana (LGPD)'

// Vendedor

// Colaboradores ativos para escolher como vendedor: os do setor comercial primeiro.
export function vendedoresPossiveis(colaboradores, busca = '') {
  return colaboradores
    .filter((c) => c.ativo !== false && combinaBusca(c.nome, busca))
    .sort((a, b) => Number(ehSetorComercial(b.setor)) - Number(ehSetorComercial(a.setor)) || compararTexto(a.nome, b.nome))
}

// Acha o vendedor pelo nome escrito na planilha: nome igual ou, se só um colaborador tiver
// todas as palavras, esse.
export function acharVendedor(colaboradores, nome) {
  const alvo = normalizar(nome)
  if (!alvo) return null
  const ativos = colaboradores.filter((c) => c.ativo !== false)
  const igual = ativos.find((c) => normalizar(c.nome) === alvo) ?? colaboradores.find((c) => normalizar(c.nome) === alvo)
  if (igual) return igual
  const parecidos = ativos.filter((c) => combinaBusca(c.nome, nome))
  return parecidos.length === 1 ? parecidos[0] : null
}

// Cadastro

// entrada: { nome, whatsapp, consentimento, vendedor: { id, nome } | null }
export function validarEletricista(entrada, { eletricistas = [], idAtual = null } = {}) {
  const erros = {}
  const nome = limparEspacos(entrada.nome)
  const consentimento = entrada.consentimento === true
  let whatsapp = ''

  if (!nome) erros.nome = 'Informe o nome.'
  else if (nome.length > 120) erros.nome = 'Use até 120 letras.'

  if (limparEspacos(entrada.whatsapp)) {
    if (!consentimento) erros.whatsapp = 'Sem a autorização (LGPD) marcada, o WhatsApp não pode ser salvo.'
    else {
      const numeros = normalizarWhatsapp(entrada.whatsapp)
      if (!numeros) erros.whatsapp = 'Use o número com DDD, por exemplo (71) 99999-9999.'
      else {
        const dono = eletricistas.find((e) => e.id !== idAtual && e.whatsapp === numeros)
        if (dono) erros.whatsapp = `Esse WhatsApp já está no cadastro de ${dono.nome}.`
        else whatsapp = numeros
      }
    }
  }

  const homonimo = nome ? eletricistas.find((e) => e.id !== idAtual && normalizar(e.nome) === normalizar(nome)) ?? null : null
  return {
    erros,
    valido: Object.keys(erros).length === 0,
    homonimo,
    dados: {
      nome,
      whatsapp: consentimento ? whatsapp : '',
      vendedorId: entrada.vendedor?.id ?? '',
      vendedorNome: entrada.vendedor?.nome ?? '',
      consentimentoLgpd: consentimento,
    },
  }
}

// Filtros da lista. vendedor: '' (todos), '__sem' (sem vendedor) ou o nome do vendedor.
export const SEM_VENDEDOR = '__sem'

export function filtrarEletricistas(lista, { busca = '', vendedor = '', situacao = 'ativos' } = {}) {
  return lista
    .filter((e) => (situacao === 'ativos' ? e.ativo !== false : situacao === 'inativos' ? e.ativo === false : true))
    .filter((e) => !vendedor || (vendedor === SEM_VENDEDOR ? !e.vendedorNome : normalizar(e.vendedorNome) === normalizar(vendedor)))
    .filter((e) => combinaBusca(e.nome, busca))
    .sort((a, b) => compararTexto(a.nome, b.nome))
}

export function vendedoresDosEletricistas(eletricistas) {
  const nomes = new Map()
  for (const e of eletricistas) if (e.vendedorNome) nomes.set(normalizar(e.vendedorNome), e.vendedorNome)
  return [...nomes.values()].sort(compararTexto)
}

// Importação

export const CAMPOS_DA_PLANILHA = [
  { chave: 'nome', rotulo: 'Nome', obrigatorio: true, sinonimos: ['nome', 'nome completo', 'eletricista', 'nome do eletricista'] },
  { chave: 'whatsapp', rotulo: 'WhatsApp', sinonimos: ['whatsapp', 'whats', 'zap', 'celular', 'telefone', 'fone', 'contato'] },
  { chave: 'vendedor', rotulo: 'Vendedor', sinonimos: ['vendedor', 'vendedora', 'consultor', 'nome do vendedor'] },
  { chave: 'lgpd', rotulo: 'Autorizou LGPD (Sim ou Não)', sinonimos: ['autorizou lgpd', 'lgpd', 'autorizou', 'consentimento lgpd', 'autorizacao', 'aceite'] },
  { chave: 'dataCadastro', rotulo: 'Data de cadastro', tipo: 'data', sinonimos: ['data de cadastro', 'data cadastro', 'cadastro', 'data de inscricao', 'inscricao'] },
]

const SIM = ['sim', 's', 'x', 'yes', 'ok', 'autorizou', 'autorizado', 'true', '1', 'verdadeiro']

export function prepararImportacao({ registros, eletricistas, colaboradores, todosAutorizaram = false }) {
  const existentes = new Map(eletricistas.map((e) => [normalizar(e.nome), e]))
  const donosDoWhatsapp = new Map(eletricistas.filter((e) => e.whatsapp).map((e) => [e.whatsapp, e]))
  const vistos = new Set()
  const whatsappsDaPlanilha = new Set()
  const itens = registros.map(({ linha, valores }) => {
    const nome = limparEspacos(valores.nome).slice(0, 120)
    const avisos = []
    if (!nome) return { linha, nome: '', situacao: 'ignorado', dados: null, avisos: ['Linha sem nome.'] }
    const chave = normalizar(nome)
    if (vistos.has(chave)) return { linha, nome, situacao: 'repetido', dados: null, avisos: ['Nome repetido na planilha; vale a primeira linha.'] }
    vistos.add(chave)
    const atual = existentes.get(chave)
    const dados = { nome }

    const autorizou = todosAutorizaram || SIM.includes(normalizar(valores.lgpd))
    if (autorizou) dados.consentimentoLgpd = true

    const textoWhats = limparEspacos(valores.whatsapp)
    if (textoWhats) {
      const numeros = normalizarWhatsapp(textoWhats)
      const dono = numeros ? donosDoWhatsapp.get(numeros) : null
      if (!autorizou) avisos.push('Sem autorização LGPD: o WhatsApp não é salvo.')
      else if (!numeros) avisos.push(`WhatsApp "${textoWhats}" não entendido; fica em branco.`)
      else if (dono && dono.id !== atual?.id) avisos.push(`WhatsApp já é de ${dono.nome}; fica em branco.`)
      else if (whatsappsDaPlanilha.has(numeros)) avisos.push('WhatsApp repetido na planilha; fica em branco.')
      else {
        dados.whatsapp = numeros
        whatsappsDaPlanilha.add(numeros)
      }
    }

    const textoVendedor = limparEspacos(valores.vendedor)
    if (textoVendedor) {
      const vendedor = acharVendedor(colaboradores, textoVendedor)
      if (vendedor) {
        dados.vendedorId = vendedor.id
        dados.vendedorNome = vendedor.nome
      } else {
        dados.vendedorId = ''
        dados.vendedorNome = textoVendedor
        avisos.push(`Vendedor "${textoVendedor}" não encontrado nos colaboradores; o nome fica só como texto.`)
      }
    }

    if (String(valores.dataCadastro ?? '').trim() !== '') {
      const data = lerDataDaPlanilha(valores.dataCadastro)
      const iso = data?.ano ? montarISO(data.ano, data.mes, data.dia) : null
      if (iso) dados.dataCadastro = iso
      else avisos.push('Data de cadastro não entendida; fica a data de hoje.')
    }

    return { linha, nome, situacao: atual ? 'existente' : 'novo', id: atual?.id ?? null, dados, avisos }
  })
  const conta = (s) => itens.filter((i) => i.situacao === s).length
  return {
    itens,
    contagem: { novos: conta('novo'), existentes: conta('existente'), repetidos: conta('repetido'), ignorados: conta('ignorado') },
  }
}

// Meio-dia na Bahia do dia informado (para não virar o dia anterior em nenhum fuso do Brasil).
export const dataDoDia = (iso) => new Date(`${iso}T12:00:00-03:00`)

export function operacoesDaImportacao(previa, { atualizarExistentes = true, novoId, agora }) {
  const operacoes = []
  for (const item of previa.itens) {
    if (item.situacao === 'novo') {
      const { nome, whatsapp = '', vendedorId = '', vendedorNome = '', consentimentoLgpd = false, dataCadastro } = item.dados
      operacoes.push({
        tipo: 'definir',
        caminho: `eletricistas/${novoId('eletricistas')}`,
        dados: {
          nome,
          whatsapp: consentimentoLgpd ? whatsapp : '',
          vendedorId,
          vendedorNome,
          consentimentoLgpd,
          dataConsentimento: consentimentoLgpd ? agora() : null,
          dataCadastro: dataCadastro ? dataDoDia(dataCadastro) : agora(),
          ativo: true,
        },
      })
    } else if (item.situacao === 'existente' && atualizarExistentes) {
      const { nome: _nome, dataCadastro, consentimentoLgpd, ...campos } = item.dados
      const dados = { ...campos }
      // A autorização só é acrescentada pela planilha, nunca retirada.
      if (consentimentoLgpd) {
        dados.consentimentoLgpd = true
        dados.dataConsentimento = agora()
      }
      if (dataCadastro) dados.dataCadastro = dataDoDia(dataCadastro)
      if (Object.keys(dados).length) operacoes.push({ tipo: 'atualizar', caminho: `eletricistas/${item.id}`, dados })
    }
  }
  return operacoes
}

// Planilha "Baixar lista" (as colunas voltam na importação).
export const CABECALHO_DA_LISTA = ['Nome', 'WhatsApp', 'Vendedor', 'Autorizou LGPD', 'Data do consentimento', 'Data de cadastro', 'Situação']

const dataDe = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? formatarData(dataISO(d)) : '')

export const linhaDaLista = (e) => [
  e.nome ?? '',
  formatarWhatsapp(e.whatsapp),
  e.vendedorNome ?? '',
  e.consentimentoLgpd ? 'Sim' : 'Não',
  dataDe(e.dataConsentimento),
  dataDe(e.dataCadastro),
  e.ativo === false ? 'Desativado' : 'Ativo',
]

export const dataDoCadastro = dataDe
