// Gravação de colaboradores/{id} e setores/{id}.
// colaboradores: nome, setor (nome do setor), loja, cargo, lideranca, nascimentoDia, nascimentoMes,
//   admissao ("AAAA-MM-DD"), paiOuMae ("Pai", "Mãe" ou ""), telefone (só números com DDD), email, ativo,
//   criadoEm, atualizadoEm. Nascimento sem ano (LGPD). Cadastro antigo pode não ter paiOuMae, telefone e email.
// setores: nome, gerentes, coordenadores e supervisores (listas de ids de colaboradores).
//   Setor antigo pode não ter "coordenadores"; o campo aparece quando alguém entra nele.
import {
  acharSetor, ajustesDeLideranca, idParaSetor, liderancasAoDefinirResponsaveis, operacoesDaImportacao,
} from '../lib/colaboradores.js'
import { agora, atualizar, gravarLote, incluirNaLista, novoId, tirarDaLista } from './banco.js'

// Cria ou edita um colaborador. Setor novo é criado na hora; mudar a liderança ou o setor
// atualiza também as listas de liderança dos setores. Tudo num lote só.
export async function salvarColaborador({ id = null, antes = null, dados, setores }) {
  const operacoes = []
  let setoresConhecidos = setores
  if (!acharSetor(setores, dados.setor)) {
    const setorId = idParaSetor(dados.setor) || novoId('setores')
    operacoes.push({ tipo: 'definir', caminho: `setores/${setorId}`, dados: { nome: dados.setor, gerentes: [], coordenadores: [], supervisores: [] }, mesclar: true })
    setoresConhecidos = [...setores, { id: setorId, nome: dados.setor, gerentes: [], coordenadores: [], supervisores: [] }]
  }

  const colaboradorId = id ?? novoId('colaboradores')
  if (id) operacoes.push({ tipo: 'atualizar', caminho: `colaboradores/${id}`, dados: { ...dados, atualizadoEm: agora() } })
  else operacoes.push({ tipo: 'definir', caminho: `colaboradores/${colaboradorId}`, dados: { ...dados, ativo: true, criadoEm: agora(), atualizadoEm: agora() } })

  for (const { setorId, campo, acao } of ajustesDeLideranca({ setores: setoresConhecidos, id: colaboradorId, antes, depois: dados })) {
    operacoes.push({
      tipo: 'atualizar',
      caminho: `setores/${setorId}`,
      dados: { [campo]: acao === 'incluir' ? incluirNaLista(colaboradorId) : tirarDaLista(colaboradorId) },
    })
  }
  await gravarLote(operacoes)
  return colaboradorId
}

// Desativar em vez de apagar, para manter o histórico de participação.
export const definirAtivoColaborador = (id, ativo) => atualizar(`colaboradores/${id}`, { ativo, atualizadoEm: agora() })

// Responsáveis do setor, com a liderança de cada pessoa acompanhando.
// responsaveis: { gerentes, coordenadores, supervisores }. Grava só esses campos do setor.
export async function definirResponsaveis({ setorId, responsaveis, setores, colaboradores }) {
  const operacoes = [{ tipo: 'atualizar', caminho: `setores/${setorId}`, dados: responsaveis }]
  for (const { id, lideranca } of liderancasAoDefinirResponsaveis({ setores, colaboradores, setorId, responsaveis })) {
    operacoes.push({ tipo: 'atualizar', caminho: `colaboradores/${id}`, dados: { lideranca, atualizadoEm: agora() } })
  }
  await gravarLote(operacoes)
}

export function importarColaboradores(previa, { setores, atualizarExistentes }, aoAvancar) {
  const operacoes = operacoesDaImportacao(previa, { setores, atualizarExistentes, novoId, agora, incluirNaLista, tirarDaLista })
  return gravarLote(operacoes, aoAvancar)
}
