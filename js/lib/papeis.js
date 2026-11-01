// Papéis, abas do menu e permissões. A interface segue as mesmas permissões das regras do Firestore
// e esconde o que a pessoa não pode usar.

export const PAPEIS = {
  admin: { rotulo: 'Administração' },
  organizador: { rotulo: 'Organização' },
}

export const papelValido = (papel) => Object.hasOwn(PAPEIS, papel)
export const rotuloDoPapel = (papel) => PAPEIS[papel]?.rotulo ?? 'Papel inválido'

export const ABAS = [
  { id: 'dashboard', rotulo: 'Dashboard', icone: 'layout-dashboard' },
  { id: 'colaboradores', rotulo: 'Colaboradores', icone: 'users' },
  { id: 'aniversariantes', rotulo: 'Aniversariantes', icone: 'cake' },
  { id: 'fornecedores', rotulo: 'Fornecedores', icone: 'handshake' },
  { id: 'eletricistas', rotulo: 'Eletricistas do CAE', icone: 'zap' },
  { id: 'listas', rotulo: 'Listas', icone: 'clipboard-list' },
  { id: 'usuarios', rotulo: 'Usuários', icone: 'user-cog', soAdmin: true },
]

export const abasDoPapel = (papel) => ABAS.filter((aba) => !aba.soAdmin || papel === 'admin')

const ADMIN = (papel) => papel === 'admin'
const TODOS = (papel) => papelValido(papel)

// admin: cadastra, edita e apaga tudo e gerencia usuários.
// organizador: vê tudo, faz check-in, cadastra eletricista novo e baixa listas.
const PERMISSOES = {
  gerenciarUsuarios: ADMIN,
  editarCadastros: ADMIN,
  importarPlanilhas: ADMIN,
  gerenciarListas: ADMIN,
  cadastrarEletricista: TODOS,
  fazerCheckin: TODOS,
  baixarListas: TODOS,
}

export const pode = (pessoa, acao) => Boolean(PERMISSOES[acao]?.(pessoa?.papel))
