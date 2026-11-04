// Janela de importação de planilha, igual para colaboradores e eletricistas:
// 1. escolher o arquivo; 2. dizer qual coluna é cada campo; 3. conferir a prévia; 4. gravar.
//
// config: {
//   titulo, ajuda, campos (chave, rotulo, obrigatorio, sinonimos),
//   opcoes: [{ chave, rotulo, ajuda, padrao }]          caixas de marcar da prévia
//   preparar(registros, opcoes) => { itens, contagem, extras }
//   colunas: [{ rotulo, celula(item) }]                 colunas da tabela da prévia
//   gravar(previa, opcoes, aoAvancar) => Promise
// }
import { acharCabecalho, exemplosDaColuna, extrairRegistros, nomeDaColuna, sugerirMapeamento } from '../lib/importacao.js'
import { formatarNumero, plural } from '../lib/texto.js'
import {
  abrirJanela, aviso, blocoDeErro, botao, caixaDeMarcar, campo, carregando, comOcupado, etiqueta, indicadores, listaComLimite,
  selecao, tabela,
} from './componentes.js'
import { el, icone, trocar } from './dom.js'
import { lerPlanilha } from './planilha.js'

const SITUACOES = {
  novo: ['Novo', 'forte'],
  existente: ['Já existe', ''],
  repetido: ['Repetido', 'alerta'],
  ignorado: ['Ignorado', 'alerta'],
}

export function abrirImportador(config) {
  const janela = abrirJanela({ titulo: config.titulo, largura: 1000 })
  const area = el('div', { class: 'importador' })
  janela.corpo.append(area)

  let abas = []
  let aba = null
  let indiceCabecalho = 0
  let mapeamento = {}
  let nomeDoArquivo = ''
  const opcoes = Object.fromEntries((config.opcoes ?? []).map((o) => [o.chave, o.padrao ?? false]))

  passoArquivo()

  function passoArquivo(erro) {
    const entrada = el('input', { type: 'file', accept: '.xlsx,.xls,.xlsm,.csv,.ods', 'aria-label': 'Escolher planilha' })
    entrada.addEventListener('change', async () => {
      const arquivo = entrada.files?.[0]
      if (!arquivo) return
      trocar(area, carregando('Lendo a planilha...'))
      try {
        abas = await lerPlanilha(arquivo)
        nomeDoArquivo = arquivo.name
        escolherAba(0)
      } catch (e) {
        passoArquivo(e)
      }
    })
    trocar(
      area,
      el(
        'div',
        { class: 'formulario' },
        el('p', {}, 'Escolha a planilha (.xlsx). No próximo passo você confere qual coluna é cada informação.'),
        config.ajuda && el('p', { class: 'campo__ajuda' }, config.ajuda),
        el('div', { class: 'acoes acoes--esquerda' }, el('label', { class: 'botao botao--principal botao-arquivo' }, icone('upload'), 'Escolher planilha', entrada)),
        erro && blocoDeErro(erro),
      ),
    )
  }

  function escolherAba(indice) {
    aba = abas[indice]
    indiceCabecalho = acharCabecalho(aba.linhas, config.campos)
    mapeamento = sugerirMapeamento(aba.linhas[indiceCabecalho], config.campos)
    passoColunas()
  }

  function passoColunas(erro) {
    const cabecalho = aba.linhas[indiceCabecalho] ?? []
    const largura = Math.max(...aba.linhas.slice(0, 50).map((l) => l.length), cabecalho.length)
    const opcoesDeColuna = [
      { valor: '-1', rotulo: 'Não tem na planilha' },
      ...Array.from({ length: largura }, (_, i) => ({
        valor: String(i),
        rotulo: `Coluna ${nomeDaColuna(i)}${String(cabecalho[i] ?? '').trim() ? `: ${String(cabecalho[i]).trim()}` : ''}`,
      })),
    ]

    const linhasDoMapa = config.campos.map((c) => {
      const exemplos = el('span', { class: 'importador__exemplos' })
      const mostrarExemplos = () => {
        const lista = exemplosDaColuna(aba.linhas, indiceCabecalho, mapeamento[c.chave], 3, c.tipo)
        trocar(exemplos, lista.length ? lista.join(' · ') : mapeamento[c.chave] >= 0 ? 'Coluna vazia' : '')
      }
      const select = selecao(opcoesDeColuna, String(mapeamento[c.chave]), {
        'aria-label': `Coluna de ${c.rotulo}`,
        onChange: (e) => {
          mapeamento[c.chave] = Number(e.target.value)
          mostrarExemplos()
        },
      })
      mostrarExemplos()
      return el(
        'div',
        { class: 'importador__campo' },
        el('span', { class: 'importador__rotulo' }, c.rotulo, c.obrigatorio && el('span', { class: 'texto-alerta' }, ' *')),
        el('div', { class: 'campo' }, select),
        exemplos,
      )
    })

    const escolhaDeAba =
      abas.length > 1 &&
      campo({
        rotulo: 'Aba da planilha',
        entrada: selecao(
          abas.map((a, i) => ({ valor: String(i), rotulo: a.nome })),
          String(abas.indexOf(aba)),
          { onChange: (e) => escolherAba(Number(e.target.value)) },
        ),
        classe: 'campo--compacto',
      }).no
    const escolhaDeCabecalho = campo({
      rotulo: 'Linha dos títulos',
      entrada: selecao(
        aba.linhas.slice(0, 10).map((l, i) => ({ valor: String(i), rotulo: `Linha ${i + 1}${l.some((v) => String(v).trim()) ? `: ${l.filter((v) => String(v).trim()).slice(0, 3).join(', ')}` : ''}` })),
        String(indiceCabecalho),
        {
          onChange: (e) => {
            indiceCabecalho = Number(e.target.value)
            mapeamento = sugerirMapeamento(aba.linhas[indiceCabecalho], config.campos)
            passoColunas()
          },
        },
      ),
      classe: 'campo--compacto',
    }).no

    const seguir = botao({
      texto: 'Ver prévia',
      icone: 'arrow-right',
      variante: 'principal',
      aoClicar: () => {
        const faltando = config.campos.filter((c) => c.obrigatorio && !(mapeamento[c.chave] >= 0))
        if (faltando.length) return passoColunas(`Escolha a coluna de ${faltando.map((c) => c.rotulo).join(' e ')}.`)
        passoPrevia()
      },
    })

    trocar(
      area,
      el(
        'div',
        { class: 'formulario' },
        el('p', { class: 'texto-suave' }, `Arquivo: ${nomeDoArquivo}`),
        el('div', { class: 'filtros' }, escolhaDeAba, escolhaDeCabecalho),
        el('p', {}, 'Confira qual coluna da planilha corresponde a cada informação. Campos que a planilha não tem podem ficar em "Não tem na planilha".'),
        el('div', { class: 'importador__mapa' }, linhasDoMapa),
        erro && blocoDeErro(erro),
        el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Trocar arquivo', icone: 'arrow-left', aoClicar: () => passoArquivo() }), seguir),
      ),
    )
  }

  function passoPrevia(erro) {
    const registros = extrairRegistros(aba.linhas, indiceCabecalho, mapeamento)
    const previa = config.preparar(registros, opcoes)
    const { contagem } = previa
    const comAvisos = previa.itens.filter((i) => i.avisos?.length && i.situacao !== 'ignorado' && i.situacao !== 'repetido').length
    // Colunas que a planilha não trouxe ficam de fora da prévia, para sobrar espaço para os avisos.
    const colunasComDados = config.colunas.filter((c) => previa.itens.some((i) => c.celula(i)))

    const caixas = (config.opcoes ?? []).map((o) =>
      el(
        'div',
        {},
        caixaDeMarcar({
          rotulo: o.rotulo,
          marcada: opcoes[o.chave],
          aoMudar: (marcada) => {
            opcoes[o.chave] = marcada
            passoPrevia()
          },
        }).no,
        o.ajuda && el('p', { class: 'campo__ajuda importador__ajuda-opcao' }, o.ajuda),
      ),
    )

    const total = config.contarGravacoes(previa, opcoes)
    const importar = botao({
      texto: total ? `Importar ${plural(total, 'registro', 'registros')}` : 'Nada para importar',
      icone: 'check',
      variante: 'principal',
      disabled: !total,
      aoClicar: () =>
        comOcupado(importar, async () => {
          const progresso = el('p', { class: 'carregando-bloco', role: 'status' }, icone('loader-circle', 'girando'), 'Gravando...')
          rodape.replaceChildren(progresso)
          try {
            await config.gravar(previa, opcoes, (feitos, de) => trocar(progresso, icone('loader-circle', 'girando'), `Gravando ${formatarNumero(feitos)} de ${formatarNumero(de)}...`))
            trocar(
              area,
              el(
                'div',
                { class: 'formulario' },
                aviso(`Importação concluída: ${plural(total, 'registro gravado', 'registros gravados')}.`, { icone: 'circle-check' }),
                el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Fechar', variante: 'principal', aoClicar: () => janela.fechar() })),
              ),
            )
          } catch (e) {
            passoPrevia(e)
          }
        }),
    })
    const rodape = el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Voltar às colunas', icone: 'arrow-left', aoClicar: () => passoColunas() }), importar)

    trocar(
      area,
      el(
        'div',
        { class: 'formulario' },
        indicadores(
          [
            { rotulo: 'Novos', valor: formatarNumero(contagem.novos) },
            { rotulo: 'Já existem', valor: formatarNumero(contagem.existentes), detalhe: 'mesmo nome, sem diferenciar acentos' },
            { rotulo: 'Repetidos na planilha', valor: formatarNumero(contagem.repetidos) },
            { rotulo: 'Linhas sem nome', valor: formatarNumero(contagem.ignorados) },
          ],
          { classe: 'indicadores--compactos' },
        ),
        (previa.extras ?? []).map((texto) => aviso(texto)),
        comAvisos > 0 && aviso(`${plural(comAvisos, 'linha tem', 'linhas têm')} algum aviso. Confira na tabela abaixo; o resto da linha é importado normalmente.`, { icone: 'triangle-alert' }),
        caixas.length > 0 && el('div', { class: 'opcoes opcoes--coluna' }, caixas),
        listaComLimite(previa.itens, (itens) =>
          tabela({
            itens,
            chave: (i) => i.linha,
            classe: 'tabela--compacta',
            colunas: [
              { rotulo: 'Linha', classe: 'numero', celula: (i) => i.linha },
              { rotulo: 'Nome', principal: true, celula: (i) => el('span', { class: 'tabela__nome' }, i.nome || 'Sem nome') },
              { rotulo: 'Situação', celula: (i) => etiqueta(...SITUACOES[i.situacao]) },
              ...colunasComDados,
              {
                rotulo: 'Avisos',
                celula: (i) => (i.avisos?.length ? el('span', { class: 'texto-alerta texto-pequeno' }, i.avisos.join(' ')) : ''),
              },
            ],
          }),
        { passo: 100 }),
        erro && blocoDeErro(erro),
        rodape,
      ),
    )
  }

  return janela
}
