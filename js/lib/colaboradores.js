// Regras dos colaboradores e setores: validação, filtros, lideranças e importação de planilha.
import { LOJAS } from '../config.js'
import { FORMATO_EMAIL, formatarWhatsapp, normalizarEmail, normalizarWhatsapp } from './contato.js'
import { formatarData, formatarDiaMes, hojeISO, lerData, lerDataDaPlanilha, lerDiaMes, montarISO } from './datas.js'
import { compararTexto, combinaBusca, limparEspacos, normalizar, paraId } from './texto.js'

// Níveis de liderança em ordem hierárquica. Cada um é opcional: há setores sem gerente ou sem coordenador.
export const NIVEIS_DE_LIDERANCA = [
  { valor: 'Gerente', plural: 'Gerentes', campo: 'gerentes', icone: 'crown' },
  { valor: 'Coordenador', plural: 'Coordenadores', campo: 'coordenadores', icone: 'badge-check' },
  { valor: 'Supervisor', plural: 'Supervisores', campo: 'supervisores', icone: 'star' },
]
export const LIDERANCAS = NIVEIS_DE_LIDERANCA.map((n) => n.valor)
export const SEM_SETOR = '__sem-setor'

// Pais e mães da empresa: marcação no cadastro de cada pessoa ("" = não marcada).
export const PAI_OU_MAE = [
  { valor: 'Pai', plural: 'Pais' },
  { valor: 'Mãe', plural: 'Mães' },
]

// Campos da planilha de importação (a ordem é a da tela).
export const CAMPOS_DA_PLANILHA = [
  { chave: 'nome', rotulo: 'Nome', obrigatorio: true, sinonimos: ['nome', 'nome completo', 'colaborador', 'colaboradora', 'funcionario', 'funcionaria'] },
  { chave: 'setor', rotulo: 'Setor', sinonimos: ['setor', 'departamento', 'area'] },
  { chave: 'loja', rotulo: 'Loja', sinonimos: ['loja', 'unidade', 'filial'] },
  { chave: 'cargo', rotulo: 'Cargo', sinonimos: ['cargo', 'funcao'] },
  { chave: 'lideranca', rotulo: 'Liderança', sinonimos: ['lideranca', 'lider', 'gestao'] },
  { chave: 'nascimento', rotulo: 'Data de nascimento', tipo: 'data', sinonimos: ['data de nascimento', 'nascimento', 'aniversario', 'data nascimento', 'dt nascimento'] },
  { chave: 'admissao', rotulo: 'Data de admissão', tipo: 'data', sinonimos: ['data de admissao', 'admissao', 'data admissao', 'dt admissao', 'contratacao'] },
  // Sem "pai" ou "mae" soltos: colunas como "Nome da mãe" não podem ser confundidas com esta.
  { chave: 'paiOuMae', rotulo: 'Pai ou mãe', sinonimos: ['pai ou mae', 'mae ou pai', 'pai mae', 'mae pai'] },
  { chave: 'telefone', rotulo: 'Telefone', sinonimos: ['telefone', 'celular', 'whatsapp', 'whats', 'fone'] },
  { chave: 'email', rotulo: 'E-mail', sinonimos: ['email', 'e mail'] },
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
  if (t.includes('coorden')) return 'Coordenador'
  if (t.includes('supervis')) return 'Supervisor'
  return null
}

export function normalizarPaiOuMae(texto) {
  const t = normalizar(texto)
  if (!t || ['nao', 'nenhum', 'nenhuma', 'sem', 'n'].includes(t)) return ''
  return PAI_OU_MAE.find((p) => normalizar(p.valor) === t)?.valor ?? null
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
  const paiOuMae = entrada.paiOuMae ?? ''
  const telefone = normalizarWhatsapp(entrada.telefone)
  const email = normalizarEmail(entrada.email)

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
  if (paiOuMae && !PAI_OU_MAE.some((p) => p.valor === paiOuMae)) erros.paiOuMae = 'Escolha Pai, Mãe ou Não.'
  if (telefone === null) erros.telefone = 'Use o número com DDD, por exemplo (71) 99999-9999.'
  if (email && !FORMATO_EMAIL.test(email)) erros.email = 'Esse e-mail não parece válido.'

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
      paiOuMae,
      telefone: telefone ?? '',
      email,
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

// Parte "Pais e mães": só quem está ativo e marcado. filtros: { busca, tipo, setor, loja }, tipo = "Pai" ou "Mãe".
export function filtrarPaisEMaes(lista, { tipo = '', ...filtros } = {}) {
  return filtrarColaboradores(lista, { ...filtros, situacao: 'ativos' }).filter((c) => (tipo ? c.paiOuMae === tipo : Boolean(c.paiOuMae)))
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
      // Na ordem hierárquica e só os níveis com alguém. Setor antigo sem "coordenadores" conta como lista vazia.
      lideranca: NIVEIS_DE_LIDERANCA.map((n) => ({ ...n, pessoas: (setor[n.campo] ?? []).map(ativoPorId).filter(Boolean) })).filter((n) => n.pessoas.length),
      ...contarPorLoja(pessoas),
    }
  })
  const conhecidos = new Set(setores.map((s) => normalizar(s.nome)))
  const semSetor = colaboradores.filter((c) => c.ativo !== false && !conhecidos.has(normalizar(c.setor)))
  return { setores: resumo.sort((a, b) => compararTexto(a.setor.nome, b.setor.nome)), semSetor }
}

// Mudanças nas listas de liderança dos setores para o colaborador ficar só no nível certo.
// No próprio setor entra na lista do nível; no setor antigo sai de todas; nos outros setores continua
// só se já estava nesse mesmo nível.
function ajustesNosSetores({ setores, id, setorAntigo, setorAtual, lideranca }) {
  const nivel = NIVEIS_DE_LIDERANCA.find((n) => n.valor === lideranca)
  const atual = acharSetor(setores, setorAtual)
  const antigo = acharSetor(setores, setorAntigo)
  const ajustes = []
  for (const setor of setores) {
    const proprio = atual?.id === setor.id
    const saiu = antigo?.id === setor.id && !proprio
    for (const { campo } of NIVEIS_DE_LIDERANCA) {
      const esta = (setor[campo] ?? []).includes(id)
      const quer = nivel?.campo === campo && (proprio || (esta && !saiu))
      if (quer !== esta) ajustes.push({ setorId: setor.id, campo, acao: quer ? 'incluir' : 'tirar' })
    }
  }
  return ajustes
}

// Quando o cadastro de um colaborador muda de setor ou de liderança.
// Devolve [{ setorId, campo: 'gerentes' | 'coordenadores' | 'supervisores', acao: 'incluir' | 'tirar' }].
export function ajustesDeLideranca({ setores, id, antes, depois }) {
  if (antes && normalizar(antes.setor) === normalizar(depois.setor) && (antes.lideranca ?? '') === (depois.lideranca ?? '')) return []
  return ajustesNosSetores({ setores, id, setorAntigo: antes?.setor, setorAtual: depois.setor, lideranca: depois.lideranca })
}

// Quando o admin define os responsáveis de um setor, a liderança de cada pessoa envolvida acompanha
// o nível mais alto que ela ocupa em todos os setores; quem não responde por nenhum fica sem liderança.
// responsaveis: { gerentes, coordenadores, supervisores }. Devolve [{ id, lideranca }] só de quem muda.
export function liderancasAoDefinirResponsaveis({ setores, colaboradores, setorId, responsaveis }) {
  const depois = setores.map((s) => (s.id === setorId ? { ...s, ...responsaveis } : s))
  const atual = setores.find((s) => s.id === setorId) ?? {}
  const envolvidos = new Set(NIVEIS_DE_LIDERANCA.flatMap(({ campo }) => [...(responsaveis[campo] ?? []), ...(atual[campo] ?? [])]))
  const mudancas = []
  for (const id of envolvidos) {
    const colaborador = colaboradores.find((c) => c.id === id)
    if (!colaborador) continue
    const nova = NIVEIS_DE_LIDERANCA.find(({ campo }) => depois.some((s) => (s[campo] ?? []).includes(id)))?.valor ?? ''
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

    const paiOuMaeTexto = limparEspacos(valores.paiOuMae)
    if (paiOuMaeTexto) {
      const paiOuMae = normalizarPaiOuMae(paiOuMaeTexto)
      if (paiOuMae === null) avisos.push(`Pai ou mãe "${paiOuMaeTexto}" não reconhecido; use Pai, Mãe ou Não.`)
      else dados.paiOuMae = paiOuMae
    }

    const telefoneTexto = limparEspacos(valores.telefone)
    if (telefoneTexto) {
      const telefone = normalizarWhatsapp(telefoneTexto)
      if (telefone) dados.telefone = telefone
      else avisos.push(`Telefone "${telefoneTexto}" não entendido; fica em branco.`)
    }

    const email = normalizarEmail(valores.email)
    if (email) {
      if (FORMATO_EMAIL.test(email)) dados.email = email
      else avisos.push(`E-mail "${email}" não parece válido; fica em branco.`)
    }

    const atual = existentes.get(chave)
    return {
      linha,
      nome,
      situacao: atual ? 'existente' : 'novo',
      id: atual?.id ?? null,
      antes: atual ? { setor: atual.setor ?? '', lideranca: atual.lideranca ?? '' } : null,
      dados,
      avisos,
    }
  })

  const conta = (s) => itens.filter((i) => i.situacao === s).length
  return {
    itens,
    setoresNovos: [...setoresNovos.values()],
    contagem: { novos: conta('novo'), existentes: conta('existente'), repetidos: conta('repetido'), ignorados: conta('ignorado') },
  }
}

// Gravações da importação. Quem já existe só recebe os campos preenchidos na planilha.
// Setores que faltam são criados; quem tem liderança entra na lista do nível, e quem trocou ou perdeu
// a liderança (ou mudou de setor) sai da lista antiga.
export function operacoesDaImportacao(previa, { setores, atualizarExistentes = true, novoId, agora, incluirNaLista, tirarDaLista }) {
  const operacoes = []
  const novosSetores = new Map(previa.setoresNovos.map((nome) => [normalizar(nome), { id: idParaSetor(nome) || novoId('setores'), nome, gerentes: [], coordenadores: [], supervisores: [] }]))
  const conhecidos = [...setores, ...novosSetores.values()]
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
          paiOuMae: item.dados.paiOuMae ?? '',
          telefone: item.dados.telefone ?? '',
          email: item.dados.email ?? '',
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
      ajustarExistente(item)
    }
  }

  function marcarLideranca(id, dados) {
    if (!dados.setor || !dados.lideranca) return
    const { campo } = NIVEIS_DE_LIDERANCA.find((n) => n.valor === dados.lideranca)
    const novo = novosSetores.get(normalizar(dados.setor))
    if (novo) novo[campo].push(id)
    else {
      const setor = acharSetor(setores, dados.setor)
      if (setor) juntar(incluirEmSetor, `${setor.id}|${campo}`, id)
    }
  }

  // Só mexe nas listas se a planilha informou a liderança ou mudou o setor; célula vazia não muda nada.
  function ajustarExistente({ id, antes, dados }) {
    const setorAtual = dados.setor ?? antes.setor
    if (dados.lideranca === undefined && normalizar(setorAtual) === normalizar(antes.setor)) return
    const lideranca = dados.lideranca ?? antes.lideranca
    for (const { setorId, campo, acao } of ajustesNosSetores({ setores: conhecidos, id, setorAntigo: antes.setor, setorAtual, lideranca })) {
      juntar(acao === 'incluir' ? incluirEmSetor : tirarDeSetor, `${setorId}|${campo}`, id)
    }
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
export const CABECALHO_DA_LISTA = ['Nome', 'Setor', 'Loja', 'Cargo', 'Liderança', 'Aniversário', 'Data de admissão', 'Pai ou mãe', 'Telefone', 'E-mail', 'Situação']

export const linhaDaLista = (c) => [
  c.nome ?? '',
  c.setor ?? '',
  c.loja ?? '',
  c.cargo ?? '',
  c.lideranca ?? '',
  aniversarioDe(c),
  formatarData(c.admissao),
  c.paiOuMae ?? '',
  formatarWhatsapp(c.telefone),
  c.email ?? '',
  c.ativo === false ? 'Desativado' : 'Ativo',
]
