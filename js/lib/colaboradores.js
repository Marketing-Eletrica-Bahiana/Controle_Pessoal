// Regras dos colaboradores e setores: validação, filtros, lideranças e importação de planilha.
import { LOJAS } from '../config.js'
import { formatarData, formatarDiaMes, hojeISO, lerData, lerDataDaPlanilha, lerDiaMes, montarISO } from './datas.js'
import { compararTexto, combinaBusca, limparEspacos, normalizar, paraId } from './texto.js'

export const LIDERANCAS = ['Gerente', 'Supervisor']
export const SEM_SETOR = '__sem-setor'

// Campos da planilha de importação (a ordem é a da tela).
export const CAMPOS_DA_PLANILHA = [
  { chave: 'nome', rotulo: 'Nome', obrigatorio: true, sinonimos: ['nome', 'nome completo', 'colaborador', 'colaboradora', 'funcionario', 'funcionaria'] },
  { chave: 'setor', rotulo: 'Setor', sinonimos: ['setor', 'departamento', 'area'] },
  { chave: 'loja', rotulo: 'Loja', sinonimos: ['loja', 'unidade', 'filial'] },
  { chave: 'cargo', rotulo: 'Cargo', sinonimos: ['cargo', 'funcao'] },
  { chave: 'lideranca', rotulo: 'Liderança', sinonimos: ['lideranca', 'lider', 'gestao'] },
  { chave: 'nascimento', rotulo: 'Data de nascimento', tipo: 'data', sinonimos: ['data de nascimento', 'nascimento', 'aniversario', 'data nascimento', 'dt nascimento'] },
  { chave: 'admissao', rotulo: 'Data de admissão', tipo: 'data', sinonimos: ['data de admissao', 'admissao', 'data admissao', 'dt admissao', 'contratacao'] },
]

// Loja escrita de qualquer jeito vira uma das três lojas fixas (ou null).
export function normalizarLoja(texto) {
  const t = normalizar(texto)
  if (!t) return ''
  if (t.includes('lauro')) return 'Lauro de Freitas'
  if (t.includes('aracaju')) return 'Aracaju'
  if (t.includes('salvador') || t.includes('matriz') || t === 'ssa') return 'Salvador (Matriz)'
  return null
}

export function normalizarLideranca(texto) {
  const t = normalizar(texto)
  if (!t || ['nao', 'nenhuma', 'sem', 'n'].includes(t)) return ''
  if (t.includes('gerent')) return 'Gerente'
  if (t.includes('supervis')) return 'Supervisor'
  return null
}

export const acharSetor = (setores, nome) => {
  const alvo = normalizar(nome)
  return alvo ? (setores ?? []).find((s) => normalizar(s.nome) === alvo) ?? null : null
}

// Setor comercial: o nome tem "comercial" ou "vendas".
export const ehSetorComercial = (nome) => {
  const t = normalizar(nome)
  return t.includes('comercial') || t.includes('venda')
}

export const idParaSetor = (nome) => paraId(nome).slice(0, 80)

export const aniversarioDe = (c) => formatarDiaMes(c?.nascimentoDia, c?.nascimentoMes)

// Validação do formulário. "aniversario" vem como "DD/MM" e "admissao" como "DD/MM/AAAA".
export function validarColaborador(entrada, { colaboradores = [], setores = [], idAtual = null } = {}) {
  const erros = {}
  const nome = limparEspacos(entrada.nome)
  const setorDigitado = limparEspacos(entrada.setor)
  const setor = acharSetor(setores, setorDigitado)?.nome ?? setorDigitado
  const cargo = limparEspacos(entrada.cargo)
  const lideranca = entrada.lideranca ?? ''

  if (!nome) erros.nome = 'Informe o nome.'
  else if (nome.length > 120) erros.nome = 'Use até 120 letras.'
  else if (colaboradores.some((c) => c.id !== idAtual && normalizar(c.nome) === normalizar(nome))) {
    erros.nome = 'Já existe um colaborador com esse nome. Use o nome completo para diferenciar.'
  }
  if (!setor) erros.setor = 'Informe o setor.'
  else if (setor.length > 60) erros.setor = 'Use até 60 letras.'
  if (!LOJAS.includes(entrada.loja)) erros.loja = 'Escolha a loja.'
  if (cargo.length > 80) erros.cargo = 'Use até 80 letras.'
  if (!['', ...LIDERANCAS].includes(lideranca)) erros.lideranca = 'Escolha a liderança.'

  let nascimento = null
  if (limparEspacos(entrada.aniversario)) {
    nascimento = lerDiaMes(entrada.aniversario)
    if (!nascimento) erros.aniversario = 'Use dia e mês, por exemplo 25/12.'
  }
  let admissao = null
  if (limparEspacos(entrada.admissao)) {
    admissao = lerData(entrada.admissao)
    if (!admissao) erros.admissao = 'Use DD/MM/AAAA, por exemplo 01/03/2020.'
    else if (admissao > hojeISO()) erros.admissao = 'A data de admissão não pode ser no futuro.'
  }

  return {
    erros,
    valido: Object.keys(erros).length === 0,
    dados: {
      nome,
      setor,
      loja: entrada.loja,
      cargo,
      lideranca,
      nascimentoDia: nascimento?.dia ?? null,
      nascimentoMes: nascimento?.mes ?? null,
      admissao,
    },
  }
}

// Filtros da lista geral. filtros: { busca, setor, loja, lideranca, situacao }.
export function filtrarColaboradores(lista, { busca = '', setor = '', loja = '', lideranca = '', situacao = 'ativos' } = {}) {
  return lista
    .filter((c) => (situacao === 'ativos' ? c.ativo !== false : situacao === 'inativos' ? c.ativo === false : true))
    .filter((c) => !setor || (setor === SEM_SETOR ? !limparEspacos(c.setor) : normalizar(c.setor) === normalizar(setor)))
    .filter((c) => !loja || c.loja === loja)
    .filter((c) => !lideranca || (lideranca === 'sem' ? !c.lideranca : c.lideranca === lideranca))
    .filter((c) => combinaBusca(c.nome, busca))
    .sort((a, b) => compararTexto(a.nome, b.nome))
}

export function contarPorLoja(lista) {
  const contagem = Object.fromEntries(LOJAS.map((l) => [l, 0]))
  let semLoja = 0
  for (const c of lista) {
    if (c.loja in contagem) contagem[c.loja]++
    else semLoja++
  }
  return { porLoja: contagem, semLoja, total: lista.length }
}

// Colaboradores ativos de um setor (pelo nome, sem diferenciar maiúsculas e acentos).
export const colaboradoresDoSetor = (colaboradores, setor) =>
  colaboradores.filter((c) => c.ativo !== false && normalizar(c.setor) === normalizar(setor.nome))

// Cartões da visão por setor, com os responsáveis já resolvidos (só ativos).
export function resumoDosSetores(setores, colaboradores) {
  const porId = new Map(colaboradores.map((c) => [c.id, c]))
  const ativoPorId = (id) => {
    const c = porId.get(id)
    return c && c.ativo !== false ? c : null
  }
  const resumo = setores.map((setor) => {
    const pessoas = colaboradoresDoSetor(colaboradores, setor)
    return {
      setor,
      pessoas,
      gerentes: (setor.gerentes ?? []).map(ativoPorId).filter(Boolean),
      supervisores: (setor.supervisores ?? []).map(ativoPorId).filter(Boolean),
      ...contarPorLoja(pessoas),
    }
  })
  const conhecidos = new Set(setores.map((s) => normalizar(s.nome)))
  const semSetor = colaboradores.filter((c) => c.ativo !== false && !conhecidos.has(normalizar(c.setor)))
  return { setores: resumo.sort((a, b) => compararTexto(a.setor.nome, b.setor.nome)), semSetor }
}

// Mudanças nas listas de gerentes e supervisores dos setores quando o cadastro de um colaborador
// muda de setor ou de liderança. Devolve [{ setorId, campo: 'gerentes' | 'supervisores', acao: 'incluir' | 'tirar' }].
export function ajustesDeLideranca({ setores, id, antes, depois }) {
  if (antes && normalizar(antes.setor) === normalizar(depois.setor) && (antes.lideranca ?? '') === (depois.lideranca ?? '')) return []
  const ajustes = []
  const setorNovo = acharSetor(setores, depois.setor)
  const setorAntigo = antes ? acharSetor(setores, antes.setor) : null
  for (const setor of setores) {
    const gerente = (setor.gerentes ?? []).includes(id)
    const supervisor = (setor.supervisores ?? []).includes(id)
    const proprio = setorNovo?.id === setor.id
    let querGerente = gerente
    let querSupervisor = supervisor
    if (setorAntigo?.id === setor.id && !proprio) {
      querGerente = false
      querSupervisor = false
    }
    if (depois.lideranca === 'Gerente') {
      querSupervisor = false
      if (proprio) querGerente = true
    } else if (depois.lideranca === 'Supervisor') {
      querGerente = false
      if (proprio) querSupervisor = true
    } else {
      querGerente = false
      querSupervisor = false
    }
    if (querGerente !== gerente) ajustes.push({ setorId: setor.id, campo: 'gerentes', acao: querGerente ? 'incluir' : 'tirar' })
    if (querSupervisor !== supervisor) ajustes.push({ setorId: setor.id, campo: 'supervisores', acao: querSupervisor ? 'incluir' : 'tirar' })
  }
  return ajustes
}

// Quando o admin define os responsáveis de um setor, a liderança de cada pessoa envolvida acompanha
// o que ela é em todos os setores: gerente de algum vira "Gerente"; só supervisor vira "Supervisor";
// quem não responde por nenhum setor fica sem liderança. Devolve [{ id, lideranca }] só de quem muda.
export function liderancasAoDefinirResponsaveis({ setores, colaboradores, setorId, gerentes, supervisores }) {
  const depois = setores.map((s) => (s.id === setorId ? { ...s, gerentes, supervisores } : s))
  const atual = setores.find((s) => s.id === setorId) ?? {}
  const envolvidos = new Set([...gerentes, ...supervisores, ...(atual.gerentes ?? []), ...(atual.supervisores ?? [])])
  const mudancas = []
  for (const id of envolvidos) {
    const colaborador = colaboradores.find((c) => c.id === id)
    if (!colaborador) continue
    const nova = depois.some((s) => (s.gerentes ?? []).includes(id))
      ? 'Gerente'
      : depois.some((s) => (s.supervisores ?? []).includes(id))
        ? 'Supervisor'
        : ''
    if (nova !== (colaborador.lideranca ?? '')) mudancas.push({ id, lideranca: nova })
  }
  return mudancas
}

// Importação

// Compara a planilha com o que já existe e monta a prévia, linha a linha.
// Devolve { itens, setoresNovos, contagem }. Cada item: { linha, nome, situacao, dados, avisos, id? }
// situacao: 'novo' | 'existente' | 'repetido' | 'ignorado'.
export function prepararImportacao({ registros, colaboradores, setores }) {
  const existentes = new Map(colaboradores.map((c) => [normalizar(c.nome), c]))
  const vistos = new Set()
  const setoresNovos = new Map()
  const itens = registros.map(({ linha, valores }) => {
    const nome = limparEspacos(valores.nome)
    const avisos = []
    if (!nome) return { linha, nome: '', situacao: 'ignorado', dados: null, avisos: ['Linha sem nome.'] }
    const chave = normalizar(nome)
    if (vistos.has(chave)) return { linha, nome, situacao: 'repetido', dados: null, avisos: ['Nome repetido na planilha; vale a primeira linha.'] }
    vistos.add(chave)

    const dados = {}
    if (nome.length <= 120) dados.nome = nome
    else {
      dados.nome = nome.slice(0, 120)
      avisos.push('Nome cortado em 120 letras.')
    }

    const setorTexto = limparEspacos(valores.setor)
    if (setorTexto) {
      const existente = acharSetor(setores, setorTexto)
      if (existente) dados.setor = existente.nome
      else {
        const chaveSetor = normalizar(setorTexto)
        if (!setoresNovos.has(chaveSetor)) setoresNovos.set(chaveSetor, setorTexto.slice(0, 60))
        dados.setor = setoresNovos.get(chaveSetor)
      }
    }

    const lojaTexto = limparEspacos(valores.loja)
    if (lojaTexto) {
      const loja = normalizarLoja(lojaTexto)
      if (loja) dados.loja = loja
      else avisos.push(`Loja "${lojaTexto}" não reconhecida; fica em branco.`)
    }

    const cargo = limparEspacos(valores.cargo)
    if (cargo) dados.cargo = cargo.slice(0, 80)

    const liderancaTexto = limparEspacos(valores.lideranca)
    if (liderancaTexto) {
      const lideranca = normalizarLideranca(liderancaTexto)
      if (lideranca === null) avisos.push(`Liderança "${liderancaTexto}" não reconhecida; fica sem liderança.`)
      else dados.lideranca = lideranca
    }

    if (String(valores.nascimento ?? '').trim() !== '') {
      const data = lerDataDaPlanilha(valores.nascimento)
      if (data) {
        // Só dia e mês: o ano do nascimento nunca é guardado (LGPD).
        dados.nascimentoDia = data.dia
        dados.nascimentoMes = data.mes
      } else avisos.push('Data de nascimento não entendida; fica em branco.')
    }

    if (String(valores.admissao ?? '').trim() !== '') {
      const data = lerDataDaPlanilha(valores.admissao)
      const iso = data?.ano ? montarISO(data.ano, data.mes, data.dia) : null
      if (iso) dados.admissao = iso
      else avisos.push('Data de admissão não entendida (precisa ter dia, mês e ano); fica em branco.')
    }

    const atual = existentes.get(chave)
    return { linha, nome, situacao: atual ? 'existente' : 'novo', id: atual?.id ?? null, dados, avisos }
  })

  const conta = (s) => itens.filter((i) => i.situacao === s).length
  return {
    itens,
    setoresNovos: [...setoresNovos.values()],
    contagem: { novos: conta('novo'), existentes: conta('existente'), repetidos: conta('repetido'), ignorados: conta('ignorado') },
  }
}

// Gravações da importação. Quem já existe só recebe os campos preenchidos na planilha.
// Setores que faltam são criados; gerentes e supervisores entram nas listas do setor.
export function operacoesDaImportacao(previa, { setores, atualizarExistentes = true, novoId, agora, incluirNaLista, tirarDaLista }) {
  const operacoes = []
  const novosSetores = new Map(previa.setoresNovos.map((nome) => [normalizar(nome), { id: idParaSetor(nome) || novoId('setores'), nome, gerentes: [], supervisores: [] }]))
  const incluirEmSetor = new Map()
  const tirarDeSetor = new Map()
  const juntar = (mapa, chave, id) => {
    if (!mapa.has(chave)) mapa.set(chave, [])
    mapa.get(chave).push(id)
  }

  for (const item of previa.itens) {
    if (item.situacao === 'novo') {
      const id = novoId('colaboradores')
      operacoes.push({
        tipo: 'definir',
        caminho: `colaboradores/${id}`,
        dados: {
          nome: item.dados.nome,
          setor: item.dados.setor ?? '',
          loja: item.dados.loja ?? '',
          cargo: item.dados.cargo ?? '',
          lideranca: item.dados.lideranca ?? '',
          nascimentoDia: item.dados.nascimentoDia ?? null,
          nascimentoMes: item.dados.nascimentoMes ?? null,
          admissao: item.dados.admissao ?? null,
          ativo: true,
          criadoEm: agora(),
          atualizadoEm: agora(),
        },
      })
      marcarLideranca(id, item.dados)
    } else if (item.situacao === 'existente' && atualizarExistentes) {
      const { nome: _nome, ...campos } = item.dados
      if (Object.keys(campos).length === 0) continue
      operacoes.push({ tipo: 'atualizar', caminho: `colaboradores/${item.id}`, dados: { ...campos, atualizadoEm: agora() } })
      marcarLideranca(item.id, item.dados)
    }
  }

  function marcarLideranca(id, dados) {
    if (!dados.setor || !dados.lideranca) return
    const campo = dados.lideranca === 'Gerente' ? 'gerentes' : 'supervisores'
    const novo = novosSetores.get(normalizar(dados.setor))
    if (novo) {
      novo[campo].push(id)
      return
    }
    const setor = acharSetor(setores, dados.setor)
    if (!setor) return
    const outro = campo === 'gerentes' ? 'supervisores' : 'gerentes'
    if (!(setor[campo] ?? []).includes(id)) juntar(incluirEmSetor, `${setor.id}|${campo}`, id)
    // Quem era supervisor e agora é gerente (ou o contrário) troca de lista no setor.
    if ((setor[outro] ?? []).includes(id)) juntar(tirarDeSetor, `${setor.id}|${outro}`, id)
  }

  const operacoesDeSetor = [...novosSetores.values()].map(({ id, ...dados }) => ({ tipo: 'definir', caminho: `setores/${id}`, dados, mesclar: true }))
  for (const [chave, ids] of incluirEmSetor) {
    const [setorId, campo] = chave.split('|')
    operacoesDeSetor.push({ tipo: 'atualizar', caminho: `setores/${setorId}`, dados: { [campo]: incluirNaLista(...ids) } })
  }
  for (const [chave, ids] of tirarDeSetor) {
    const [setorId, campo] = chave.split('|')
    operacoesDeSetor.push({ tipo: 'atualizar', caminho: `setores/${setorId}`, dados: { [campo]: tirarDaLista(...ids) } })
  }
  return [...operacoesDeSetor, ...operacoes]
}

// Planilha "Baixar lista" (as colunas voltam certinho na importação).
export const CABECALHO_DA_LISTA = ['Nome', 'Setor', 'Loja', 'Cargo', 'Liderança', 'Aniversário', 'Data de admissão', 'Situação']

export const linhaDaLista = (c) => [
  c.nome ?? '',
  c.setor ?? '',
  c.loja ?? '',
  c.cargo ?? '',
  c.lideranca ?? '',
  aniversarioDe(c),
  formatarData(c.admissao),
  c.ativo === false ? 'Desativado' : 'Ativo',
]
