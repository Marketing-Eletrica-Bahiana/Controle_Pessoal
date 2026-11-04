// Validação do cadastro de usuários (quem pode entrar no app).
import { DOMINIO_EMPRESA, ehEmailDaEmpresa } from '../config.js'
import { FORMATO_EMAIL, normalizarEmail } from './contato.js'
import { papelValido } from './papeis.js'
import { limparEspacos } from './texto.js'

// O e-mail é o ID do documento: sempre em minúsculas e sem espaços.
export { normalizarEmail }

export function validarUsuario({ email, nome, cargo, papel }, { novo = true } = {}) {
  const erros = {}
  const dados = { nome: limparEspacos(nome), cargo: limparEspacos(cargo), papel }
  const emailLimpo = normalizarEmail(email)

  if (novo) {
    if (!emailLimpo) erros.email = 'Informe o e-mail.'
    else if (!FORMATO_EMAIL.test(emailLimpo)) erros.email = 'Esse e-mail não parece válido.'
    else if (!ehEmailDaEmpresa(emailLimpo)) erros.email = `Use um e-mail @${DOMINIO_EMPRESA}.`
  }
  if (!dados.nome) erros.nome = 'Informe o nome.'
  else if (dados.nome.length > 120) erros.nome = 'Use até 120 letras.'
  if (dados.cargo.length > 80) erros.cargo = 'Use até 80 letras.'
  if (!papelValido(papel)) erros.papel = 'Escolha o papel.'

  return { erros, email: emailLimpo, dados, valido: Object.keys(erros).length === 0 }
}

// O admin não pode tirar o próprio acesso nem deixar de ser admin.
export function podeMudarAcesso(pessoaLogada, usuario) {
  return normalizarEmail(pessoaLogada?.email) !== normalizarEmail(usuario?.id ?? usuario?.email)
}
