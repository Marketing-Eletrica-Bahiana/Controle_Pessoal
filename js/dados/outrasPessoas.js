// Gravação de outrasPessoas/{id}: nome, grupo ("Diretoria", "Prestador de serviço" ou "Outro"), empresa (empresa ou
// função), ativo, criadoEm. Só o admin grava (firestore.rules).
import { operacoesDaImportacao } from '../lib/outrasPessoas.js'
import { agora, atualizar, definir, gravarLote, novoId } from './banco.js'

export async function cadastrarOutraPessoa(dados) {
  const id = novoId('outrasPessoas')
  await definir(`outrasPessoas/${id}`, { ...dados, ativo: true, criadoEm: agora() })
  return id
}

export const editarOutraPessoa = (id, dados) => atualizar(`outrasPessoas/${id}`, dados)

export const definirAtivoOutraPessoa = (id, ativo) => atualizar(`outrasPessoas/${id}`, { ativo })

export const importarOutrasPessoas = (previa, { atualizarExistentes }, aoAvancar) =>
  gravarLote(operacoesDaImportacao(previa, { atualizarExistentes, novoId, agora }), aoAvancar)
