// Estrutura das telas internas: cabeçalho com a pessoa logada, menu das abas, conteúdo e rodapé.
import { mensagemDeErro } from '../lib/erros.js'
import { abasDoPapel, rotuloDoPapel } from '../lib/papeis.js'
import { avisarErro, comOcupado } from '../ui/componentes.js'
import { el, icone } from '../ui/dom.js'
import { assinatura, logo } from '../ui/marca.js'

export function montarLayout(raiz, pessoa, { aoSair }) {
  const conteudo = el('main', { class: 'conteudo', tabindex: '-1' })
  const itens = abasDoPapel(pessoa.papel).map((aba) =>
    el('a', { class: 'menu__item', href: `#/${aba.id}`, dataset: { aba: aba.id } }, icone(aba.icone), aba.rotulo),
  )

  const sair = el(
    'button',
    {
      type: 'button',
      class: 'botao botao--claro',
      'aria-label': 'Sair',
      onClick: () =>
        comOcupado(sair, async () => {
          try {
            await aoSair()
          } catch (e) {
            avisarErro(mensagemDeErro(e))
          }
        }),
    },
    icone('log-out'),
    el('span', { class: 'so-largo' }, 'Sair'),
  )

  raiz.replaceChildren(
    el(
      'div',
      { class: 'app' },
      el(
        'header',
        { class: 'cabecalho' },
        el(
          'div',
          { class: 'cabecalho__barra' },
          el('a', { href: '#/dashboard', class: 'cabecalho__marca', 'aria-label': 'Ir para o Dashboard' },
            logo({ formato: 'linha', cor: 'branco', altura: 28, classe: 'so-largo' }),
            logo({ formato: 'icone', cor: 'branco', altura: 32, classe: 'so-estreito' }),
          ),
          el('span', { class: 'cabecalho__titulo' }, 'Controle Pessoal'),
          el(
            'div',
            { class: 'cabecalho__pessoa' },
            el(
              'div',
              { class: 'cabecalho__identidade' },
              el('span', { class: 'cabecalho__nome', title: pessoa.nome }, pessoa.nome),
              el(
                'span',
                { class: 'cabecalho__cargo' },
                pessoa.cargo && el('span', { title: pessoa.cargo }, pessoa.cargo),
                el('span', { class: 'etiqueta etiqueta--escura' }, rotuloDoPapel(pessoa.papel)),
              ),
            ),
            sair,
          ),
        ),
        el('nav', { class: 'menu', 'aria-label': 'Abas do Controle Pessoal' }, itens),
      ),
      conteudo,
      el('footer', { class: 'rodape' }, assinatura()),
    ),
  )

  function marcarAba(id) {
    for (const item of itens) {
      const ativo = item.dataset.aba === id
      item.classList.toggle('ativo', ativo)
      if (ativo) {
        item.setAttribute('aria-current', 'page')
        item.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      } else item.removeAttribute('aria-current')
    }
  }

  return { conteudo, marcarAba }
}
