// Gravação de fornecedores/{id}: nome, contatoNome, contatoEmail, contatoTelefone, ativo, criadoEm e
// pessoas (palestrantes, representantes e convidados da marca: lista de { id, nome, funcao, telefone, email }).
// Marca antiga não tem "pessoas"; o campo aparece quando a primeira pessoa é cadastrada.
import { erroDoApp } from '../lib/erros.js'
import { novoIdDePessoa, pessoasComAlteracao, pessoasSem } from '../lib/fornecedores.js'
import { agora, atualizar, definir, novoId, transacao } from './banco.js'

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

// Pessoa nova (sem id) ou editada. Em transação: duas pessoas mexendo na mesma marca não apagam o que a outra fez.
export function salvarPessoaDoFornecedor(fornecedorId, { id = null, ...dados }) {
  const pessoa = { id: id ?? novoIdDePessoa(), ...dados }
  return transacao(async ({ ler, atualizar: mudar }) => {
    const marca = await ler(`fornecedores/${fornecedorId}`)
    if (!marca) throw erroDoApp('Essa marca não existe mais.')
    mudar(`fornecedores/${fornecedorId}`, { pessoas: pessoasComAlteracao(marca.pessoas ?? [], pessoa) })
    return pessoa
  })
}

export function tirarPessoaDoFornecedor(fornecedorId, pessoaId) {
  return transacao(async ({ ler, atualizar: mudar }) => {
    const marca = await ler(`fornecedores/${fornecedorId}`)
    if (!marca) throw erroDoApp('Essa marca não existe mais.')
    mudar(`fornecedores/${fornecedorId}`, { pessoas: pessoasSem(marca.pessoas ?? [], pessoaId) })
  })
}
