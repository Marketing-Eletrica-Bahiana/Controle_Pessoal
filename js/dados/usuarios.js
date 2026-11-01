// Leitura e gravação de usuarios/{email em minúsculas}: nome, cargo, papel e ativo.
import { erroDoApp } from '../lib/erros.js'
import { atualizar, ouvirColecao, transacao } from './banco.js'

export const ouvirUsuarios = (aoMudar, aoErrar) => ouvirColecao('usuarios', aoMudar, aoErrar)

// Em transação, para nunca sobrescrever quem já está cadastrado.
export function cadastrarUsuario(email, { nome, cargo, papel }) {
  return transacao(async (t) => {
    if (await t.ler(`usuarios/${email}`)) throw erroDoApp('Essa pessoa já está cadastrada.')
    t.definir(`usuarios/${email}`, { nome, cargo, papel, ativo: true })
  })
}

export const editarUsuario = (email, { nome, cargo, papel }) => atualizar(`usuarios/${email}`, { nome, cargo, papel })

export const definirAtivo = (email, ativo) => atualizar(`usuarios/${email}`, { ativo })
