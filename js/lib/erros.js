// Mensagens de erro em português para o que vem do Firebase e do navegador.
const MENSAGENS = {
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar. Tente de novo.',
  'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de terminar. Tente de novo.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere as janelas deste site e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet. Confira a rede e tente de novo.',
  'auth/unauthorized-domain': 'Este endereço não está autorizado no Firebase. Avise a equipe de Marketing.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
  'auth/user-disabled': 'Esta conta foi desativada no Google.',
  'auth/internal-error': 'O login do Google não respondeu. Tente de novo em instantes.',
  'permission-denied': 'Você não tem permissão para fazer isso.',
  unauthenticated: 'Sua sessão expirou. Saia e entre de novo.',
  unavailable: 'O servidor não respondeu. Confira a internet e tente de novo.',
  'deadline-exceeded': 'O servidor demorou demais para responder. Tente de novo.',
  'resource-exhausted': 'O limite de uso do banco de dados foi atingido. Tente de novo mais tarde.',
  'not-found': 'Esse registro não existe mais. Ele pode ter sido apagado por outra pessoa.',
  'already-exists': 'Esse registro já existe.',
  aborted: 'Outra pessoa mexeu nesse registro ao mesmo tempo. Tente de novo.',
  'failed-precondition': 'O banco de dados ainda não está preparado para essa consulta. Avise a equipe de Marketing.',
  'invalid-argument': 'Algum dado não foi aceito pelo banco de dados. Confira e tente de novo.',
  cancelled: 'A operação foi cancelada.',
}

// Erro com mensagem pronta para mostrar na tela.
export function erroDoApp(mensagem) {
  const erro = new Error(mensagem)
  erro.doApp = true
  return erro
}

export function mensagemDeErro(erro) {
  if (erro?.doApp || erro?.code === 'app/pendente') return erro.message
  if (MENSAGENS[erro?.code]) return MENSAGENS[erro.code]
  if (erro?.code) return `Algo deu errado (${erro.code}). Tente de novo em instantes.`
  if (erro?.message && /[áéíóúãõç]/i.test(erro.message)) return erro.message
  return 'Algo deu errado. Tente de novo em instantes.'
}
