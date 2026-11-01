// Controle mensal dos aniversariantes: uma lista em "listas" (tipo "Aniversariantes do mês" ou
// "Aniversário de empresa") com cada aniversariante como convocado. Cada presença ganha "status"
// ("pendente" | "participou" | "nao_participou") e "observacao".
import { formatarMesAno } from '../lib/datas.js'
import { erroDoApp } from '../lib/erros.js'
import { idDoControle, listaDoControle, mudancaDeStatus, presencaDoAniversariante } from '../lib/aniversariantes.js'
import { idDaPresenca } from '../lib/listas.js'
import { agora, atualizar, gravarLote, lerColecao, transacao } from './banco.js'

const caminhoDaPresenca = (listaId, colaboradorId) => `listas/${listaId}/presencas/${idDaPresenca('colaborador', colaboradorId)}`

// Em transação: se alguém já gerou o mesmo controle, não gera de novo.
export function gerarControle({ tipo, mes, ano, colaboradores, pessoa }) {
  const id = idDoControle(tipo, mes, ano)
  return transacao(async (t) => {
    if (await t.ler(`listas/${id}`)) throw erroDoApp(`O controle de ${formatarMesAno(mes, ano)} já foi gerado.`)
    t.definir(`listas/${id}`, { ...listaDoControle(tipo, mes, ano), criadoPor: pessoa.nome, criadoEm: agora() })
    for (const c of colaboradores) t.definir(caminhoDaPresenca(id, c.id), presencaDoAniversariante(c))
    return id
  })
}

// Aniversariantes cadastrados depois de gerar o controle.
export const incluirNoControle = (listaId, colaboradores) =>
  gravarLote(colaboradores.map((c) => ({ tipo: 'definir', caminho: caminhoDaPresenca(listaId, c.id), dados: presencaDoAniversariante(c) })))

// Não espera o servidor: a tela já mostra a mudança e o envio termina sozinho.
export const marcarStatus = (listaId, presencaId, status, pessoa) =>
  atualizar(`listas/${listaId}/presencas/${presencaId}`, mudancaDeStatus(status, pessoa.nome, agora()))

export const salvarObservacao = (listaId, presencaId, observacao) => atualizar(`listas/${listaId}/presencas/${presencaId}`, { observacao })

// Presenças de vários controles, para o histórico.
export const lerControles = (listas) => Promise.all(listas.map((lista) => lerColecao(`listas/${lista.id}/presencas`).then((presencas) => ({ lista, presencas }))))
