// Partes da aba Aniversariantes usadas pelas três telas (mês, controle e histórico).
import { partesDeHoje } from '../../lib/datas.js'
import { abas, cabecalhoPagina } from '../../ui/componentes.js'

// Mês escolhido fica guardado enquanto a pessoa navega.
export const periodo = { ...partesDeHoje() }

export const VARIANTE_DO_STATUS = { participou: 'forte', nao_participou: 'alerta', pendente: '' }

export function cabecalhoDaAba(ativa) {
  return [
    cabecalhoPagina({
      titulo: 'Aniversariantes',
      icone: 'cake',
      descricao: 'Aniversariantes do mês e de empresa, e o controle de quem participou da mensagem de Feliz Aniversário.',
    }),
    abas([
      { rotulo: 'Do mês', icone: 'calendar-days', href: '#/aniversariantes', ativo: ativa === 'mes' },
      { rotulo: 'Histórico', icone: 'history', href: '#/aniversariantes/historico', ativo: ativa === 'historico' },
    ]),
  ]
}
