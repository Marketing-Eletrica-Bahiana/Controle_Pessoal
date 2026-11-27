// "Importar planilha" em Convocados (pedido de 27/11/2026): cada linha é uma pessoa, com o nome e, se a planilha
// tiver, se participou e a observação. O nome é procurado nos colaboradores (ativos primeiro, depois desligados, para
// listas antigas), nos eletricistas e em Outras pessoas. Regras puras; a tela fica em js/telas/listas/planilha.js.
import {
  idDaPresenca, limparObservacao, presencaDeColaborador, presencaDeConvidado, presencaDeEletricista, presencaDeOutraPessoa, rotuloDaSituacao,
  situacaoNoCheckin,
} from './listas.js'
import { GRUPOS_DE_OUTRAS_PESSOAS } from './outrasPessoas.js'
import { combinaBusca, limparEspacos, normalizar } from './texto.js'

export const CAMPOS_DA_PLANILHA_DA_LISTA = [
  {
    chave: 'nome',
    rotulo: 'Nome',
    obrigatorio: true,
    sinonimos: ['nome', 'nome completo', 'participante', 'colaborador', 'colaboradora', 'funcionario', 'funcionaria', 'eletricista', 'convidado'],
  },
  { chave: 'participou', rotulo: 'Participou?', sinonimos: ['participou', 'presente', 'presenca', 'compareceu', 'situacao', 'status', 'check in', 'checkin'] },
  { chave: 'observacao', rotulo: 'Observação', sinonimos: ['observacao', 'observacoes', 'obs', 'motivo', 'comentario', 'comentarios'] },
]

const PARTICIPOU = ['sim', 's', 'x', '1', 'true', 'ok', 'presente', 'participou', 'compareceu', 'veio', 'check in', 'checkin', 'feito']
const NAO_PARTICIPOU = ['nao', 'n', '0', 'false', 'ausente', 'faltou', 'nao participou', 'nao veio', 'nao compareceu']

// Valor da coluna "Participou?": 'participou', 'nao_participou', 'outros', '' (vazio) ou null (não entendido).
export function lerParticipou(valor) {
  const t = normalizar(valor)
  if (!t) return ''
  if (PARTICIPOU.includes(t)) return 'participou'
  if (NAO_PARTICIPOU.includes(t)) return 'nao_participou'
  if (t.startsWith('outro')) return 'outros'
  return null
}

// Acha a pessoa pelo nome: igual (sem diferenciar maiúsculas e acentos) num colaborador ativo, num desligado, num
// eletricista (ativo ou desativado) ou em Outras pessoas (ativa ou desativada); senão, um só colaborador ativo (ou
// eletricista ativo, ou outra pessoa ativa) com todas as palavras.
export function acharPessoaDaPlanilha(nome, { colaboradores = [], eletricistas = [], outrasPessoas = [] }) {
  const alvo = normalizar(nome)
  if (!alvo) return null
  const igual = (lista) => lista.find((p) => normalizar(p.nome) === alvo)
  const ativos = (lista) => lista.filter((p) => p.ativo !== false)
  const cadastros = [['colaborador', colaboradores], ['eletricista', eletricistas], ['outro', outrasPessoas]]
  for (const [tipo, lista] of cadastros) {
    const achada = igual(ativos(lista)) ?? igual(lista)
    if (achada) return { tipo, pessoa: achada, parecido: false }
  }
  for (const [tipo, lista] of cadastros) {
    const parecidos = ativos(lista).filter((p) => combinaBusca(p.nome, nome))
    if (parecidos.length === 1) return { tipo, pessoa: parecidos[0], parecido: true }
  }
  return null
}

// Prévia. opcoes: { participaram } (linha sem "Participou?" preenchido conta como participou), { cadastrarNaoAchados }
// (quem não está em nenhum cadastro pode ser cadastrado em Outras pessoas e entrar na lista; pedido de 27/11/2026) e
// { escolhas } (Map linha → { adicionar, grupo }, o que a pessoa marcou em cada linha; sem escolha, vem marcado com o
// grupo "Outro"). presencas: as que já estão na lista.
// Situações: novo (entra na lista), existente (já está; recebe a situação e a observação), naoEncontrado (com
// "adicionar" e "grupo"), repetido, ignorado (linha sem nome).
export function prepararPlanilhaDaLista({ registros, colaboradores = [], eletricistas = [], outrasPessoas = [], presencas = [] }, opcoes = {}) {
  const naLista = new Map(presencas.filter((p) => p.pessoaId).map((p) => [`${p.tipoPessoa}_${p.pessoaId}`, p]))
  const convidadosNaLista = new Map(presencas.filter((p) => p.tipoPessoa === 'convidado').map((p) => [normalizar(p.nome), p]))
  const vistos = new Set()
  const itens = registros.map(({ linha, valores }) => {
    const nome = limparEspacos(valores.nome).slice(0, 120)
    if (!nome) return { linha, nome: '', situacao: 'ignorado', avisos: ['Linha sem nome.'] }
    const avisos = []
    const lida = lerParticipou(valores.participou)
    if (lida === null) avisos.push(`"Participou?" não entendido ("${limparEspacos(valores.participou)}"); use Sim, Não ou Outros.`)
    const situacao = lida || (opcoes.participaram ? 'participou' : '')
    const observacao = limparObservacao(valores.observacao)
    const achada = acharPessoaDaPlanilha(nome, { colaboradores, eletricistas, outrasPessoas })
    if (achada) {
      const chave = idDaPresenca(achada.tipo, achada.pessoa.id)
      if (vistos.has(chave)) return { linha, nome, situacao: 'repetido', avisos: ['A mesma pessoa aparece mais de uma vez; vale a primeira linha.'] }
      vistos.add(chave)
      if (achada.parecido) avisos.push(`Nome parecido: entra como ${achada.pessoa.nome}.`)
      if (achada.tipo === 'colaborador' && achada.pessoa.ativo === false) avisos.push('Está em Desligados.')
      if (achada.tipo === 'outro' && achada.pessoa.ativo === false) avisos.push('Está desativada em Outras pessoas.')
      const atual = naLista.get(chave)
      return { linha, nome, situacao: atual ? 'existente' : 'novo', tipo: achada.tipo, pessoa: achada.pessoa, presenca: atual ?? null, marcar: situacao, observacao, avisos }
    }
    const chave = `convidado_${normalizar(nome)}`
    if (vistos.has(chave)) return { linha, nome, situacao: 'repetido', avisos: ['Nome repetido na planilha; vale a primeira linha.'] }
    vistos.add(chave)
    const convidado = convidadosNaLista.get(normalizar(nome))
    if (convidado) return { linha, nome, situacao: 'existente', tipo: 'convidado', pessoa: null, presenca: convidado, marcar: situacao, observacao, avisos }
    const escolha = opcoes.escolhas?.get(linha)
    const podeCadastrar = opcoes.cadastrarNaoAchados === true
    return {
      linha,
      nome,
      situacao: 'naoEncontrado',
      tipo: 'outro',
      pessoa: null,
      presenca: null,
      marcar: situacao,
      observacao,
      adicionar: podeCadastrar && (escolha?.adicionar ?? true),
      grupo: GRUPOS_DE_OUTRAS_PESSOAS.includes(escolha?.grupo) ? escolha.grupo : 'Outro',
      avisos: [
        ...avisos,
        podeCadastrar
          ? 'Não está em nenhum cadastro.'
          : 'Não está no cadastro de colaboradores, eletricistas nem Outras pessoas. Confira o nome.',
      ],
    }
  })
  const conta = (s) => itens.filter((i) => i.situacao === s).length
  return {
    itens,
    contagem: { novos: conta('novo'), existentes: conta('existente'), naoEncontrados: conta('naoEncontrado'), repetidos: conta('repetido'), ignorados: conta('ignorado') },
  }
}

// O que muda numa presença que já está na lista: a situação (se a planilha disser e for diferente) e a observação (se
// a planilha tiver). Planilha vazia nunca apaga o que já foi marcado. Quem já tem check-in não perde a hora.
export function mudancaNaPresenca(item, quem) {
  const atual = item.presenca
  const dados = {}
  if (item.marcar && item.marcar !== situacaoNoCheckin(atual)) {
    if (item.marcar === 'participou') Object.assign(dados, { presente: true, status: 'participou', horaCheckin: null, checkinPor: quem })
    else Object.assign(dados, { presente: false, status: item.marcar, horaCheckin: null, checkinPor: null })
  }
  if (item.observacao && item.observacao !== (atual.observacao ?? '')) dados.observacao = item.observacao
  return dados
}

// Situação da pessoa nova (sem hora de check-in: a planilha não diz a hora).
const situacaoNova = (marcar, quem) =>
  marcar === 'participou'
    ? { presente: true, status: 'participou', horaCheckin: null, checkinPor: quem }
    : { presente: false, status: marcar || '', horaCheckin: null, checkinPor: null }

// Não achado marcado para cadastrar: entra em outras pessoas e na lista.
const vaiCadastrar = (item) => item.situacao === 'naoEncontrado' && item.adicionar === true

// Operações de gravação (gravarLote). Todo mundo da planilha entra como convocado. Quem não foi achado e ficou marcado
// é cadastrado em outrasPessoas (nome e grupo) e entra na lista como essa outra pessoa.
export function operacoesDaPlanilhaDaLista(previa, { listaId, quem, novoId, agora }) {
  const caminho = (id) => `listas/${listaId}/presencas/${id}`
  const operacoes = []
  for (const item of previa.itens) {
    if (vaiCadastrar(item)) {
      const id = novoId('outrasPessoas')
      const outra = { nome: item.nome, grupo: GRUPOS_DE_OUTRAS_PESSOAS.includes(item.grupo) ? item.grupo : 'Outro', empresa: '' }
      operacoes.push({ tipo: 'definir', caminho: `outrasPessoas/${id}`, dados: { ...outra, ativo: true, criadoEm: agora() } })
      operacoes.push({
        tipo: 'definir',
        caminho: caminho(idDaPresenca('outro', id)),
        dados: { ...presencaDeOutraPessoa({ id, ...outra }, true), ...situacaoNova(item.marcar, quem), observacao: item.observacao },
      })
    } else if (item.situacao === 'novo') {
      const base =
        item.tipo === 'colaborador' ? presencaDeColaborador(item.pessoa, true)
        : item.tipo === 'eletricista' ? presencaDeEletricista(item.pessoa, true)
        : item.tipo === 'outro' ? presencaDeOutraPessoa(item.pessoa, true)
        : { ...presencaDeConvidado(item.nome), convocado: true }
      const id = idDaPresenca(item.tipo, item.pessoa?.id) ?? novoId(`listas/${listaId}/presencas`)
      operacoes.push({ tipo: 'definir', caminho: caminho(id), dados: { ...base, ...situacaoNova(item.marcar, quem), observacao: item.observacao } })
    } else if (item.situacao === 'existente') {
      const dados = mudancaNaPresenca(item, quem)
      if (Object.keys(dados).length) operacoes.push({ tipo: 'atualizar', caminho: caminho(item.presenca.id), dados })
    }
  }
  return operacoes
}

// Quantas pessoas a importação grava: quem entra (inclusive quem vai ser cadastrado em Outras pessoas) e quem já está e
// muda alguma coisa.
export const contarGravacoesDaPlanilha = (previa, quem = '') =>
  previa.itens.filter((i) => i.situacao === 'novo' || vaiCadastrar(i) || (i.situacao === 'existente' && Object.keys(mudancaNaPresenca(i, quem)).length)).length

// Quantos não achados ficaram marcados para cadastrar em Outras pessoas e quantos ficaram desmarcados.
export const contarNaoAchados = (previa) => {
  const naoAchados = previa.itens.filter((i) => i.situacao === 'naoEncontrado')
  const cadastrar = naoAchados.filter(vaiCadastrar).length
  return { cadastrar, deFora: naoAchados.length - cadastrar }
}

// Texto da coluna da prévia: com quem a linha combinou e o que vai ser marcado.
export const noCadastro = (item) =>
  item.pessoa
    ? `${item.pessoa.nome}${item.tipo === 'eletricista' ? ' (eletricista)' : item.tipo === 'outro' ? ` (${item.pessoa.grupo || 'Outro'})` : ''}`
    : item.situacao === 'novo' || item.situacao === 'existente' ? 'Convidado' : ''
const vaiPraLista = (item) => item.situacao === 'novo' || item.situacao === 'existente' || item.situacao === 'naoEncontrado'
export const marcacaoDoItem = (item) => (vaiPraLista(item) && item.marcar ? rotuloDaSituacao(item.marcar) : '')
export const observacaoDoItem = (item) => (vaiPraLista(item) ? item.observacao ?? '' : '')
