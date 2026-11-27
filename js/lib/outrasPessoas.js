// Outras pessoas: quem não é colaborador mas entra nas listas, como a Diretoria e os prestadores de serviço na festa de
// final de ano (pedido de 27/11/2026). Cadastro em outrasPessoas/{id}: nome, grupo, empresa (empresa ou função), ativo.
import { compararTexto, combinaBusca, limparEspacos, normalizar } from './texto.js'

export const GRUPOS_DE_OUTRAS_PESSOAS = ['Diretoria', 'Prestador de serviço', 'Outro']

// "Diretoria · Empresa X" (o que aparece embaixo do nome nas listas).
export const detalheDaOutraPessoa = (o) => [o.grupo || 'Outro', o.empresa].filter(Boolean).join(' · ')

// entrada: { nome, grupo, empresa }. Avisa (sem impedir) quando o nome já existe aqui ou nos colaboradores ativos.
export function validarOutraPessoa(entrada, { outrasPessoas = [], colaboradores = [], idAtual = null } = {}) {
  const erros = {}
  const nome = limparEspacos(entrada.nome)
  const empresa = limparEspacos(entrada.empresa)
  if (!nome) erros.nome = 'Informe o nome.'
  else if (nome.length > 120) erros.nome = 'Use até 120 letras.'
  if (!GRUPOS_DE_OUTRAS_PESSOAS.includes(entrada.grupo)) erros.grupo = 'Escolha o grupo.'
  if (empresa.length > 120) erros.empresa = 'Use até 120 letras.'
  const alvo = normalizar(nome)
  const homonimo = alvo ? outrasPessoas.find((o) => o.id !== idAtual && normalizar(o.nome) === alvo) ?? null : null
  const colaborador = alvo ? colaboradores.find((c) => c.ativo !== false && normalizar(c.nome) === alvo) ?? null : null
  return {
    erros,
    valido: Object.keys(erros).length === 0,
    homonimo,
    colaborador,
    dados: { nome, grupo: entrada.grupo, empresa },
  }
}

// Filtros da aba. grupo: '' (todos) ou um dos grupos; situacao: 'ativos' | 'inativos' | 'todos'.
export function filtrarOutrasPessoas(lista, { busca = '', grupo = '', situacao = 'ativos' } = {}) {
  return lista
    .filter((o) => (situacao === 'ativos' ? o.ativo !== false : situacao === 'inativos' ? o.ativo === false : true))
    .filter((o) => !grupo || (o.grupo || 'Outro') === grupo)
    .filter((o) => combinaBusca(`${o.nome} ${o.empresa ?? ''}`, busca))
    .sort((a, b) => compararTexto(a.nome, b.nome))
}

// Grupo escrito na planilha: "Diretor", "Diretoria", "Sócio" viram Diretoria; "Prestador", "Terceirizado", "Serviço"
// viram Prestador de serviço; "Outro" fica Outro. Vazio: ''. Não entendido: null.
export function lerGrupo(valor) {
  const texto = normalizar(valor)
  if (!texto) return ''
  if (/diretor|diretoria|socio|presidente/.test(texto)) return 'Diretoria'
  if (/prestador|terceir|servico|fornecedor de servico/.test(texto)) return 'Prestador de serviço'
  if (/^outros?$/.test(texto)) return 'Outro'
  return null
}

// Importação

export const CAMPOS_DA_PLANILHA = [
  { chave: 'nome', rotulo: 'Nome', obrigatorio: true, sinonimos: ['nome', 'nome completo', 'pessoa', 'participante'] },
  { chave: 'grupo', rotulo: 'Grupo (Diretoria, Prestador de serviço ou Outro)', sinonimos: ['grupo', 'tipo', 'categoria', 'vinculo'] },
  { chave: 'empresa', rotulo: 'Empresa ou função', sinonimos: ['empresa', 'funcao', 'empresa ou funcao', 'cargo', 'servico'] },
]

export function prepararImportacao({ registros, outrasPessoas }) {
  const existentes = new Map(outrasPessoas.map((o) => [normalizar(o.nome), o]))
  const vistos = new Set()
  const itens = registros.map(({ linha, valores }) => {
    const nome = limparEspacos(valores.nome).slice(0, 120)
    if (!nome) return { linha, nome: '', situacao: 'ignorado', dados: null, avisos: ['Linha sem nome.'] }
    const chave = normalizar(nome)
    if (vistos.has(chave)) return { linha, nome, situacao: 'repetido', dados: null, avisos: ['Nome repetido na planilha; vale a primeira linha.'] }
    vistos.add(chave)
    const atual = existentes.get(chave)
    const avisos = []
    const dados = { nome }
    const grupo = lerGrupo(valores.grupo)
    if (grupo) dados.grupo = grupo
    else if (grupo === null) avisos.push(`Grupo "${limparEspacos(valores.grupo)}" não entendido; use Diretoria, Prestador de serviço ou Outro.`)
    if (!dados.grupo && !atual) {
      dados.grupo = 'Outro'
      avisos.push('Sem grupo: entra como Outro.')
    }
    const empresa = limparEspacos(valores.empresa).slice(0, 120)
    if (empresa) dados.empresa = empresa
    return { linha, nome, situacao: atual ? 'existente' : 'novo', id: atual?.id ?? null, dados, avisos }
  })
  const conta = (s) => itens.filter((i) => i.situacao === s).length
  return { itens, contagem: { novos: conta('novo'), existentes: conta('existente'), repetidos: conta('repetido'), ignorados: conta('ignorado') } }
}

export function operacoesDaImportacao(previa, { atualizarExistentes = true, novoId, agora }) {
  const operacoes = []
  for (const item of previa.itens) {
    if (item.situacao === 'novo') {
      const { nome, grupo = 'Outro', empresa = '' } = item.dados
      operacoes.push({ tipo: 'definir', caminho: `outrasPessoas/${novoId('outrasPessoas')}`, dados: { nome, grupo, empresa, ativo: true, criadoEm: agora() } })
    } else if (item.situacao === 'existente' && atualizarExistentes) {
      // Só mudam os campos preenchidos na planilha.
      const { nome: _nome, ...campos } = item.dados
      if (Object.keys(campos).length) operacoes.push({ tipo: 'atualizar', caminho: `outrasPessoas/${item.id}`, dados: campos })
    }
  }
  return operacoes
}

// Planilha "Baixar lista" (as colunas voltam na importação).
export const CABECALHO_DA_LISTA = ['Nome', 'Grupo', 'Empresa ou função', 'Situação']
export const linhaDaLista = (o) => [o.nome ?? '', o.grupo || 'Outro', o.empresa ?? '', o.ativo === false ? 'Desativado' : 'Ativo']
