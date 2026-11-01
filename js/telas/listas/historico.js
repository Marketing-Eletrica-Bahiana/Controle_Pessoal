// Histórico de listas mostrado nas fichas: de uma pessoa (colaborador ou eletricista) e de uma marca.
import { fonte } from '../../dados/fontes.js'
import { historicoDaPessoa as lerHistorico, pessoasDaMarca } from '../../dados/listas.js'
import { formatarData } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { historicoDaPessoa as montarHistorico, listasDaMarca, resultadoNaLista } from '../../lib/listas.js'
import { plural } from '../../lib/texto.js'
import { aviso, bloco, carregando, etiqueta, indicadores, tabela } from '../../ui/componentes.js'
import { el, trocar } from '../../ui/dom.js'
import { endereco } from '../../lib/rotas.js'

const VARIANTES = {
  Compareceu: 'forte',
  Participou: 'forte',
  'Veio sem convite': 'forte',
  Faltou: 'alerta',
  'Não participou': 'alerta',
}

const linkDaLista = (l) => el('a', { class: 'tabela__nome', href: endereco('listas', l.id) }, l.nome)

// Lê uma vez ao abrir a ficha (não fica ouvindo todas as presenças do banco).
export function historicoDaPessoa(caixa, { tipo, id }) {
  let ativo = true
  const titulo = { titulo: 'Histórico de listas', icone: 'history' }
  trocar(caixa, bloco(titulo, carregando('Buscando as listas...')))

  let lido = false
  const pararListas = fonte('listas').ouvir(async (listas, erro) => {
    if (lido || (!listas && !erro)) return
    if (erro) return trocar(caixa, bloco(titulo, aviso(mensagemDeErro(erro), { erro: true })))
    lido = true
    try {
      const presencas = await lerHistorico(tipo, id, listas)
      if (!ativo) return
      const historico = montarHistorico(presencas, listas)
      if (!historico.length) return trocar(caixa, bloco(titulo, el('p', { class: 'texto-suave' }, 'Ainda não esteve em nenhuma lista.')))
      const resultados = historico.map((h) => resultadoNaLista(h.lista, h.presenca))
      const vezes = resultados.filter((r) => ['Compareceu', 'Veio sem convite', 'Participou'].includes(r)).length
      const faltas = resultados.filter((r) => r === 'Faltou' || r === 'Não participou').length
      trocar(
        caixa,
        bloco(
          titulo,
          indicadores(
            [
              { rotulo: 'Listas', valor: historico.length },
              { rotulo: 'Compareceu', valor: vezes },
              { rotulo: 'Faltou', valor: faltas },
            ],
            { classe: 'indicadores--tres indicadores--compactos' },
          ),
          tabela({
            itens: historico,
            chave: (h) => h.lista.id,
            colunas: [
              { rotulo: 'Lista', principal: true, celula: (h) => linkDaLista(h.lista) },
              { rotulo: 'Tipo', celula: (h) => h.lista.tipo },
              { rotulo: 'Data', classe: 'numero', celula: (h) => formatarData(h.lista.data) },
              { rotulo: 'Convocado', celula: (h) => (h.presenca.convocado ? 'Sim' : 'Não') },
              {
                rotulo: 'Resultado',
                celula: (h) => {
                  const r = resultadoNaLista(h.lista, h.presenca)
                  return etiqueta(r, VARIANTES[r] ?? '')
                },
              },
            ],
          }),
        ),
      )
    } catch (e) {
      if (ativo) trocar(caixa, bloco(titulo, aviso(mensagemDeErro(e), { erro: true })))
    }
  })

  return () => {
    ativo = false
    pararListas()
  }
}

// Listas em que a marca participou, quantas vezes e quem ela enviou em cada uma.
export function participacoesDoFornecedor(caixa, { fornecedorId }) {
  let ativo = true
  let ultimaChave = ''
  const titulo = { titulo: 'Participações', icone: 'calendar-days' }
  trocar(caixa, bloco(titulo, carregando()))

  const pararListas = fonte('listas').ouvir(async (listas, erro) => {
    if (erro) return trocar(caixa, bloco(titulo, aviso(mensagemDeErro(erro), { erro: true })))
    if (!listas) return
    const daMarca = listasDaMarca(fornecedorId, listas)
    const chave = daMarca.map((l) => l.id).join(',')
    if (chave === ultimaChave) return
    ultimaChave = chave
    if (!daMarca.length) return trocar(caixa, bloco(titulo, el('p', { class: 'texto-suave' }, 'A marca ainda não participou de nenhum treinamento ou evento.')))
    try {
      const pessoas = await pessoasDaMarca(fornecedorId, daMarca)
      if (!ativo) return
      const enviadas = Object.values(pessoas).reduce((soma, lista) => soma + lista.length, 0)
      trocar(
        caixa,
        bloco(
          titulo,
          indicadores(
            [
              { rotulo: 'Participações', valor: daMarca.length, detalhe: 'treinamentos e eventos' },
              { rotulo: 'Pessoas enviadas', valor: enviadas, detalhe: 'somando todas as listas' },
            ],
            { classe: 'indicadores--compactos indicadores--duas' },
          ),
          tabela({
            itens: daMarca,
            colunas: [
              { rotulo: 'Lista', principal: true, celula: linkDaLista },
              { rotulo: 'Tipo', celula: (l) => l.tipo },
              { rotulo: 'Data', classe: 'numero', celula: (l) => formatarData(l.data) },
              {
                rotulo: 'Quem a marca enviou',
                celula: (l) => {
                  const enviados = pessoas[l.id] ?? []
                  return enviados.length ? enviados.map((p) => `${p.nome}${p.presente ? '' : ' (não veio)'}`).join(', ') : el('span', { class: 'texto-suave' }, 'Ninguém registrado')
                },
              },
            ],
          }),
          el('p', { class: 'texto-suave texto-pequeno' }, plural(daMarca.length, 'participação', 'participações')),
        ),
      )
    } catch (e) {
      if (ativo) trocar(caixa, bloco(titulo, aviso(mensagemDeErro(e), { erro: true })))
    }
  })

  return () => {
    ativo = false
    pararListas()
  }
}
