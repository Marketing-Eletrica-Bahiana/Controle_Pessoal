// Gravação de fornecedores/{id}: nome, contatoNome, contatoEmail, contatoTelefone, ativo, criadoEm.
// As pessoas que cada marca manda (palestrantes, representantes) ficam só dentro das listas.
import { agora, atualizar, definir, novoId } from './banco.js'

export async function salvarFornecedor({ id = null, dados }) {
  if (id) {
    await atualizar(`fornecedores/${id}`, dados)
    return id
  }
  const novo = novoId('fornecedores')
  await definir(`fornecedores/${novo}`, { ...dados, ativo: true, criadoEm: agora() })
  return novo
}

export const definirAtivoFornecedor = (id, ativo) => atualizar(`fornecedores/${id}`, { ativo })
