// Parte "Participação" da aba Colaboradores: quem mais participou das listas de um tipo (as ações de endomarketing
// por padrão) e dos controles de aniversariantes. Regras puras; as presenças chegam já lidas.
import { observacoesDaPessoa } from './aniversariantes.js'
import { formatarData } from './datas.js'
import { ehListaDeAniversario } from './listas.js'
import { compararTexto } from './texto.js'

export const TIPO_PADRAO = 'Ação de Endomarketing'

// Filtro de tipo e frases da tela ("Em 5 ações de endomarketing"). Valor vazio = todas as listas, sem os aniversários.
export const TIPOS_DA_PARTICIPACAO = [
  { valor: 'Ação de Endomarketing', rotulo: 'Ações de Endomarketing', um: 'ação de endomarketing', varios: 'ações de endomarketing' },
  { valor: 'Evento', rotulo: 'Eventos', um: 'evento', varios: 'eventos' },
  { valor: 'Treinamento CAE', rotulo: 'Treinamentos CAE', um: 'treinamento CAE', varios: 'treinamentos CAE' },
  { valor: 'Treinamento Comercial', rotulo: 'Treinamentos Comerciais', um: 'treinamento comercial', varios: 'treinamentos comerciais' },
  { valor: 'Outro', rotulo: 'Outras listas', um: 'lista do tipo Outro', varios: 'listas do tipo Outro' },
  { valor: '', rotulo: 'Todas as listas', um: 'lista', varios: 'listas' },
]

export const tipoDaParticipacao = (valor) => TIPOS_DA_PARTICIPACAO.find((t) => t.valor === valor) ?? TIPOS_DA_PARTICIPACAO[0]

// Listas do tipo e do ano escolhidos que já aconteceram (data até hoje), as mais recentes primeiro.
export function listasDaParticipacao(listas, { tipo = TIPO_PADRAO, ano = '' } = {}, hoje) {
  return listas
    .filter((l) => !ehListaDeAniversario(l) && (!tipo || l.tipo === tipo) && (!ano || String(l.data).startsWith(ano)) && String(l.data) <= hoje)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))
}

// Controles de aniversariantes do ano escolhido (todos, se o ano estiver vazio).
export const controlesDaParticipacao = (listas, { ano = '' } = {}) =>
  listas.filter((l) => ehListaDeAniversario(l) && (!ano || String(l.data).startsWith(ano)))

// Anos do filtro: os das listas e dos controles, o mais recente primeiro.
export const anosDasListas = (listas) =>
  [...new Set(listas.map((l) => String(l.data ?? '').slice(0, 4)).filter((a) => /^\d{4}$/.test(a)))].sort().reverse()

const ativosPorId = (colaboradores) => new Map(colaboradores.filter((c) => c.ativo !== false).map((c) => [c.id, c]))

// lidas: [{ lista, presencas }]. Para cada colaborador ativo: em quantas listas fez check-in (convocado ou não), em
// quantas foi convocado e em quantas faltou (convocado sem check-in). Desligados e cadastros apagados ficam de fora.
// O ranking só tem quem participou de pelo menos uma; semParticipar conta os ativos que ainda não participaram.
export function rankingDeParticipacao(lidas, colaboradores) {
  const ativos = ativosPorId(colaboradores)
  const contas = new Map()
  for (const { lista, presencas } of lidas) {
    for (const p of presencas) {
      if (p.tipoPessoa !== 'colaborador' || !ativos.has(p.pessoaId)) continue
      if (!contas.has(p.pessoaId)) contas.set(p.pessoaId, { colaborador: ativos.get(p.pessoaId), participou: 0, convocado: 0, faltou: 0, ultima: '' })
      const conta = contas.get(p.pessoaId)
      if (p.convocado) conta.convocado++
      if (p.presente) {
        conta.participou++
        if (String(lista.data) > conta.ultima) conta.ultima = String(lista.data)
      } else if (p.convocado) conta.faltou++
    }
  }
  const ranking = [...contas.values()]
    .filter((c) => c.participou > 0)
    .sort((a, b) => b.participou - a.participou || a.faltou - b.faltou || compararTexto(a.colaborador.nome, b.colaborador.nome))
  return { ranking, participacoes: ranking.reduce((soma, c) => soma + c.participou, 0), semParticipar: ativos.size - ranking.length }
}

// Ranking dos aniversariantes (de historicoDosAniversarios) só com quem está ativo, já com o cadastro de cada um.
export function aniversariosDosAtivos(participaram, colaboradores) {
  const ativos = ativosPorId(colaboradores)
  return participaram.filter((p) => ativos.has(p.pessoaId)).map((p) => ({ ...p, colaborador: ativos.get(p.pessoaId) }))
}

// Planilha "Baixar planilha": uma aba para o tipo escolhido e outra para os aniversariantes.
export const CABECALHO_DA_PARTICIPACAO = ['Posição', 'Nome', 'Setor', 'Loja', 'Participou', 'Convocado', 'Faltou', 'Última participação']
export const linhasDaParticipacao = (ranking) =>
  ranking.map((r, i) => [i + 1, r.colaborador.nome, r.colaborador.setor ?? '', r.colaborador.loja ?? '', r.participou, r.convocado, r.faltou, formatarData(r.ultima)])

export const CABECALHO_DOS_ANIVERSARIOS = ['Posição', 'Nome', 'Setor', 'Loja', 'Participou', 'Não participou', 'Pendente', 'Observações']
export const linhasDosAniversarios = (ranking) =>
  ranking.map((p, i) => [
    i + 1,
    p.colaborador?.nome ?? p.nome,
    p.colaborador?.setor ?? '',
    p.colaborador?.loja ?? '',
    p.conta.participou,
    p.conta.nao_participou,
    p.conta.pendente,
    observacoesDaPessoa(p).map((o) => `${o.rotulo}: ${o.texto}`).join(' | '),
  ])
