// Janelas da aba Colaboradores: cadastro e edição, responsáveis do setor e importação de planilha.
import { LOJAS } from '../../config.js'
import { definirResponsaveis, importarColaboradores, salvarColaborador } from '../../dados/colaboradores.js'
import { CAMPOS_DA_PLANILHA, LIDERANCAS, aniversarioDe, prepararImportacao, validarColaborador } from '../../lib/colaboradores.js'
import { formatarData, formatarDiaMes, mascararData, mascararDiaMes } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { combinaBusca, compararTexto, normalizar } from '../../lib/texto.js'
import {
  abrirJanela, aviso, avisar, botao, campo, campoBusca, comOcupado, entradaComMascara, entradaTexto, etiqueta, mostrarErros,
  selecao,
} from '../../ui/componentes.js'
import { el, trocar } from '../../ui/dom.js'
import { abrirImportador } from '../../ui/importador.js'

// dados(): { colaboradores, setores } sempre com a versão mais nova.
export function abrirFormularioColaborador({ colaborador = null, dados, aoSalvar }) {
  const novo = !colaborador
  const janela = abrirJanela({ titulo: novo ? 'Novo colaborador' : 'Editar colaborador', largura: 640 })
  const idLista = `setores-${Math.random().toString(36).slice(2)}`
  const listaDeSetores = el('datalist', { id: idLista }, dados().setores.map((s) => el('option', { value: s.nome })))

  const campos = {
    nome: campo({ rotulo: 'Nome completo', entrada: entradaTexto({ value: colaborador?.nome ?? '', maxlength: 120, 'data-foco': true }) }),
    setor: campo({
      rotulo: 'Setor',
      entrada: entradaTexto({ value: colaborador?.setor ?? '', maxlength: 60, list: idLista, placeholder: 'Escolha ou digite um setor novo' }),
      ajuda: 'Setor que ainda não existe é criado ao salvar.',
    }),
    loja: campo({ rotulo: 'Loja', entrada: selecao([{ valor: '', rotulo: 'Escolha a loja' }, ...LOJAS], colaborador?.loja ?? '') }),
    cargo: campo({ rotulo: 'Cargo', opcional: true, entrada: entradaTexto({ value: colaborador?.cargo ?? '', maxlength: 80 }) }),
    lideranca: campo({
      rotulo: 'Liderança',
      entrada: selecao([{ valor: '', rotulo: 'Sem liderança' }, ...LIDERANCAS], colaborador?.lideranca ?? ''),
      ajuda: 'Gerentes e supervisores aparecem em destaque no cartão do setor.',
    }),
    aniversario: campo({
      rotulo: 'Aniversário (dia e mês)',
      opcional: true,
      entrada: entradaComMascara(mascararDiaMes, { value: aniversarioDe(colaborador), placeholder: 'DD/MM', maxlength: 5 }),
      ajuda: 'Só dia e mês. O ano do nascimento não é guardado (LGPD).',
    }),
    admissao: campo({
      rotulo: 'Data de admissão',
      opcional: true,
      entrada: entradaComMascara(mascararData, { value: formatarData(colaborador?.admissao), placeholder: 'DD/MM/AAAA', maxlength: 10 }),
    }),
  }

  const caixaDeErro = el('div')
  const salvar = botao({ texto: novo ? 'Cadastrar' : 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
  const formulario = el(
    'form',
    { class: 'formulario', novalidate: true },
    campos.nome.no,
    el('div', { class: 'formulario__linha' }, campos.setor.no, campos.loja.no),
    el('div', { class: 'formulario__linha' }, campos.cargo.no, campos.lideranca.no),
    el('div', { class: 'formulario__linha' }, campos.aniversario.no, campos.admissao.no),
    listaDeSetores,
    caixaDeErro,
    el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
  )

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    caixaDeErro.replaceChildren()
    const { colaboradores, setores } = dados()
    const valores = Object.fromEntries(Object.entries(campos).map(([chave, c]) => [chave, c.entrada.value]))
    const { erros, dados: limpos, valido } = validarColaborador(valores, { colaboradores, setores, idAtual: colaborador?.id })
    if (!mostrarErros(campos, erros) || !valido) return
    await comOcupado(salvar, async () => {
      try {
        const id = await salvarColaborador({
          id: colaborador?.id,
          antes: colaborador ? { setor: colaborador.setor, lideranca: colaborador.lideranca ?? '' } : null,
          dados: limpos,
          setores,
        })
        avisar(novo ? `Cadastro de ${limpos.nome} feito!` : 'Alterações salvas.')
        janela.fechar()
        aoSalvar?.(id)
      } catch (e) {
        caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
      }
    })
  })

  janela.corpo.append(formulario)
  janela.focar()
}

// Gerentes e supervisores do setor, escolhidos entre os colaboradores ativos (de qualquer setor).
export function abrirResponsaveis({ setor, dados }) {
  const janela = abrirJanela({ titulo: `Responsáveis: ${setor.nome}`, largura: 720 })
  const gerentes = new Set(setor.gerentes ?? [])
  const supervisores = new Set(setor.supervisores ?? [])
  let busca = ''

  const resumo = el('div', { class: 'responsaveis__resumo' })
  const lista = el('div', { class: 'responsaveis__lista' })
  const caixaDeErro = el('div')
  const buscaCampo = campoBusca({
    placeholder: 'Buscar colaborador de qualquer setor',
    aoDigitar: (v) => {
      busca = v
      desenhar()
    },
  })
  buscaCampo.entrada.setAttribute('data-foco', '')

  const papelDe = (id) => (gerentes.has(id) ? 'gerente' : supervisores.has(id) ? 'supervisor' : '')
  function definirPapel(id, papel) {
    gerentes.delete(id)
    supervisores.delete(id)
    if (papel === 'gerente') gerentes.add(id)
    if (papel === 'supervisor') supervisores.add(id)
    desenhar()
  }

  function desenhar() {
    const { colaboradores } = dados()
    const ativos = colaboradores.filter((c) => c.ativo !== false)
    const porId = new Map(colaboradores.map((c) => [c.id, c]))
    const chip = (id, papel) =>
      el(
        'span',
        { class: 'chip' },
        porId.get(id)?.nome ?? 'Colaborador removido',
        el('button', { type: 'button', class: 'chip__tirar', 'aria-label': `Tirar ${porId.get(id)?.nome ?? ''} de ${papel}`, onClick: () => definirPapel(id, '') }, '×'),
      )
    trocar(
      resumo,
      el('div', {}, el('strong', {}, 'Gerentes: '), gerentes.size ? [...gerentes].map((id) => chip(id, 'gerente')) : el('span', { class: 'texto-suave' }, 'nenhum')),
      el('div', {}, el('strong', {}, 'Supervisores: '), supervisores.size ? [...supervisores].map((id) => chip(id, 'supervisor')) : el('span', { class: 'texto-suave' }, 'nenhum')),
    )

    const doSetor = (c) => normalizar(c.setor) === normalizar(setor.nome)
    const candidatos = busca.trim()
      ? ativos.filter((c) => combinaBusca(c.nome, busca)).slice(0, 60)
      : ativos.filter((c) => doSetor(c) || papelDe(c.id))
    candidatos.sort((a, b) => Number(doSetor(b)) - Number(doSetor(a)) || compararTexto(a.nome, b.nome))

    trocar(
      lista,
      candidatos.length
        ? candidatos.map((c) =>
            el(
              'div',
              { class: 'responsaveis__linha' },
              el('div', {}, el('strong', {}, c.nome), el('span', { class: 'tabela__detalhe' }, [c.setor || 'Sem setor', c.cargo].filter(Boolean).join(' · '))),
              selecao(
                [
                  { valor: '', rotulo: 'Não responde' },
                  { valor: 'gerente', rotulo: 'Gerente' },
                  { valor: 'supervisor', rotulo: 'Supervisor' },
                ],
                papelDe(c.id),
                { 'aria-label': `Papel de ${c.nome} no setor`, class: 'responsaveis__papel', onChange: (e) => definirPapel(c.id, e.target.value) },
              ),
            ),
          )
        : el('p', { class: 'texto-suave' }, busca.trim() ? 'Ninguém encontrado com essa busca.' : 'O setor ainda não tem colaboradores. Busque alguém de outro setor.'),
    )
  }

  const salvar = botao({
    texto: 'Salvar responsáveis',
    icone: 'check',
    variante: 'principal',
    aoClicar: () =>
      comOcupado(salvar, async () => {
        caixaDeErro.replaceChildren()
        try {
          const { colaboradores, setores } = dados()
          await definirResponsaveis({ setorId: setor.id, gerentes: [...gerentes], supervisores: [...supervisores], setores, colaboradores })
          avisar('Responsáveis do setor salvos.')
          janela.fechar()
        } catch (e) {
          caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
        }
      }),
  })

  janela.corpo.append(
    el(
      'div',
      { class: 'formulario' },
      el('p', { class: 'texto-suave' }, 'A liderança no cadastro de cada pessoa acompanha o que for escolhido aqui.'),
      resumo,
      buscaCampo.no,
      lista,
      caixaDeErro,
      el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
    ),
  )
  desenhar()
  janela.focar()
}

export function abrirImportacaoColaboradores({ dados }) {
  abrirImportador({
    titulo: 'Importar colaboradores',
    ajuda: 'Precisa ter pelo menos a coluna com o nome. Da data de nascimento, só o dia e o mês são guardados. Setores que ainda não existem são criados.',
    campos: CAMPOS_DA_PLANILHA,
    opcoes: [
      {
        chave: 'atualizar',
        rotulo: 'Atualizar quem já existe com os dados da planilha',
        ajuda: 'Só mudam os campos preenchidos na planilha; células vazias não apagam nada.',
        padrao: true,
      },
    ],
    preparar: (registros) => {
      const { colaboradores, setores } = dados()
      const previa = prepararImportacao({ registros, colaboradores, setores })
      previa.extras = previa.setoresNovos.length ? [`Setores que serão criados: ${previa.setoresNovos.join(', ')}.`] : []
      return previa
    },
    colunas: [
      { rotulo: 'Setor', celula: (i) => i.dados?.setor ?? '' },
      { rotulo: 'Loja', celula: (i) => i.dados?.loja ?? '' },
      { rotulo: 'Cargo', celula: (i) => i.dados?.cargo ?? '' },
      { rotulo: 'Liderança', celula: (i) => (i.dados?.lideranca ? etiqueta(i.dados.lideranca) : '') },
      { rotulo: 'Aniversário', celula: (i) => formatarDiaMes(i.dados?.nascimentoDia, i.dados?.nascimentoMes) },
      { rotulo: 'Admissão', celula: (i) => formatarData(i.dados?.admissao) },
    ],
    contarGravacoes: (previa, opcoes) => previa.contagem.novos + (opcoes.atualizar ? previa.contagem.existentes : 0),
    gravar: (previa, opcoes, aoAvancar) => importarColaboradores(previa, { setores: dados().setores, atualizarExistentes: opcoes.atualizar }, aoAvancar),
  })
}
