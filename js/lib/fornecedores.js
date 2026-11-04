// Regras dos fornecedores (marcas parceiras).
import { compararTexto, combinaBusca, limparEspacos, normalizar } from './texto.js'
import { FORMATO_EMAIL, mascararTelefone } from './contato.js'

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
