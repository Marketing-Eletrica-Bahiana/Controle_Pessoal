// Regras dos fornecedores (marcas parceiras) e das pessoas de cada marca.
import { compararTexto, combinaBusca, limparEspacos, normalizar } from './texto.js'
import { FORMATO_EMAIL, mascararTelefone, normalizarEmail, normalizarWhatsapp } from './contato.js'

// Pessoas que a marca manda para treinamentos e eventos, guardadas no próprio documento da marca
// (campo "pessoas": lista de { id, nome, funcao, telefone, email }). A ordem aqui é a da tela.
export const FUNCOES_DO_FORNECEDOR = ['Palestrante', 'Representante', 'Convidado']

// entrada: { nome, contatoNome, contatoEmail, contatoTelefone }. Só o nome é obrigatório.
export function validarFornecedor(entrada, { fornecedores = [], idAtual = null } = {}) {
  const erros = {}
  const nome = limparEspacos(entrada.nome)
  const contatoNome = limparEspacos(entrada.contatoNome)
  const contatoEmail = String(entrada.contatoEmail ?? '').replace(/\s+/g, '').toLowerCase()
  const numeros = String(entrada.contatoTelefone ?? '').replace(/\D/g, '')

  if (!nome) erros.nome = 'Informe o nome da marca.'
  else if (nome.length > 80) erros.nome = 'Use até 80 letras.'
  else if (fornecedores.some((f) => f.id !== idAtual && normalizar(f.nome) === normalizar(nome))) erros.nome = 'Essa marca já está cadastrada.'
  if (contatoNome.length > 120) erros.contatoNome = 'Use até 120 letras.'
  if (contatoEmail && !FORMATO_EMAIL.test(contatoEmail)) erros.contatoEmail = 'Esse e-mail não parece válido.'
  if (numeros && (numeros.length < 10 || numeros.length > 11)) erros.contatoTelefone = 'Use o número com DDD, por exemplo (71) 3333-4444.'

  return {
    erros,
    valido: Object.keys(erros).length === 0,
    dados: { nome, contatoNome, contatoEmail, contatoTelefone: numeros ? mascararTelefone(numeros) : '' },
  }
}

export function filtrarFornecedores(lista, { busca = '', situacao = 'ativos' } = {}) {
  return lista
    .filter((f) => (situacao === 'ativos' ? f.ativo !== false : situacao === 'inativos' ? f.ativo === false : true))
    .filter((f) => combinaBusca(f.nome, busca))
    .sort((a, b) => compararTexto(a.nome, b.nome))
}

// Pessoas da marca na ordem da tela: palestrantes, representantes e convidados, cada grupo por nome.
// Marca antiga não tem o campo: lista vazia.
const ordemDaFuncao = (funcao) => {
  const i = FUNCOES_DO_FORNECEDOR.indexOf(funcao)
  return i === -1 ? FUNCOES_DO_FORNECEDOR.length : i
}
export const pessoasDoFornecedor = (f) =>
  [...(f?.pessoas ?? [])].sort((a, b) => ordemDaFuncao(a.funcao) - ordemDaFuncao(b.funcao) || compararTexto(a.nome, b.nome))

// entrada: { nome, funcao, telefone, email }. Nome e função são obrigatórios; nome repetido na mesma marca não.
export function validarPessoaDoFornecedor(entrada, { pessoas = [], idAtual = null } = {}) {
  const erros = {}
  const nome = limparEspacos(entrada.nome)
  const funcao = entrada.funcao ?? ''
  const telefone = normalizarWhatsapp(entrada.telefone)
  const email = normalizarEmail(entrada.email)

  if (!nome) erros.nome = 'Informe o nome.'
  else if (nome.length > 120) erros.nome = 'Use até 120 letras.'
  else if (pessoas.some((p) => p.id !== idAtual && normalizar(p.nome) === normalizar(nome))) erros.nome = 'Essa pessoa já está cadastrada nesta marca.'
  if (!FUNCOES_DO_FORNECEDOR.includes(funcao)) erros.funcao = 'Escolha Palestrante, Representante ou Convidado.'
  if (telefone === null) erros.telefone = 'Use o número com DDD, por exemplo (71) 99999-9999.'
  if (email && !FORMATO_EMAIL.test(email)) erros.email = 'Esse e-mail não parece válido.'

  return { erros, valido: Object.keys(erros).length === 0, dados: { nome, funcao, telefone: telefone ?? '', email } }
}

// Nova lista de pessoas da marca com a pessoa incluída (id novo) ou trocada (mesmo id).
export function pessoasComAlteracao(pessoas = [], pessoa) {
  const existe = pessoas.some((p) => p.id === pessoa.id)
  return existe ? pessoas.map((p) => (p.id === pessoa.id ? pessoa : p)) : [...pessoas, pessoa]
}

export const pessoasSem = (pessoas = [], id) => pessoas.filter((p) => p.id !== id)

// ID curto para cada pessoa dentro da marca (não precisa ser único fora dela).
export const novoIdDePessoa = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
