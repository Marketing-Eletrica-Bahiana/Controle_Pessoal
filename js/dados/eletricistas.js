// Gravação de eletricistas/{id}: nome, whatsapp (só números com DDD), vendedorId, vendedorNome,
// consentimentoLgpd, dataConsentimento, dataCadastro, ativo. Sem autorização, o WhatsApp fica vazio.
import { operacoesDaImportacao } from '../lib/eletricistas.js'
import { agora, atualizar, definir, gravarLote, novoId } from './banco.js'

// Admin e organizador cadastram. Devolve o ID na hora e a promessa do envio: no treinamento,
// com internet fraca, o cadastro fica no aparelho e sobe quando a conexão voltar.
export function cadastrarEletricista(dados) {
  const id = novoId('eletricistas')
  const enviado = definir(`eletricistas/${id}`, {
    ...dados,
    dataConsentimento: dados.consentimentoLgpd ? agora() : null,
    dataCadastro: agora(),
    ativo: true,
  })
  return { id, enviado }
}

// Só admin edita. Autorização nova grava a data; autorização retirada apaga o WhatsApp.
export function editarEletricista(id, antes, dados) {
  const mudancas = { ...dados }
  if (dados.consentimentoLgpd && !antes.consentimentoLgpd) mudancas.dataConsentimento = agora()
  if (!dados.consentimentoLgpd) {
    mudancas.whatsapp = ''
    mudancas.dataConsentimento = null
  }
  return atualizar(`eletricistas/${id}`, mudancas)
}

export const definirAtivoEletricista = (id, ativo) => atualizar(`eletricistas/${id}`, { ativo })

export function importarEletricistas(previa, { atualizarExistentes }, aoAvancar) {
  return gravarLote(operacoesDaImportacao(previa, { atualizarExistentes, novoId, agora }), aoAvancar)
}
