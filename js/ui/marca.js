// Logos, mascotes, patterns e assinatura da marca #EnergiaBahiana.
import { el } from './dom.js'

// No par azul, os nomes dos arquivos estão trocados em relação ao formato (ver CLAUDE.md).
// Aqui cada logo é escolhido pelo formato real.
const LOGOS = {
  linha: { branco: 'marca/logos/Logotipo_Horizontal_Branco.png', azul: 'marca/logos/Logotipo_Vertical_Azul.png' },
  compacto: { branco: 'marca/logos/Logotipo_Vertical_Branco.png', azul: 'marca/logos/Logotipo_Horizontal_Azul.png' },
  icone: { branco: 'marca/logos/Icone_Branco.png', azul: 'marca/logos/Icone_Azul.png' },
}

// Parte visível de cada formato dentro do quadrado do arquivo, em pixels do arquivo (com 4px de folga).
const CAIXAS = {
  linha: { x: 78, y: 464, largura: 905, altura: 149, lado: 1043 },
  compacto: { x: 115, y: 343, largura: 800, altura: 358, lado: 1043 },
  icone: { x: 9, y: 22, largura: 162, altura: 136, lado: 180 },
}

export const MASCOTES = {
  ebinho: 'marca/mascotes/Mascote_Ebinho.png',
  ebinha: 'marca/mascotes/Mascote_Ebinha.png',
}

// Endereço completo: dentro de uma variável CSS, o caminho seria lido a partir da pasta css/.
const PATTERN_CIRCUITO = new URL('marca/patterns/Pattern_EB_1080x1920.png', document.baseURI).href

// Logo oficial. Só recorta a sobra transparente do arquivo; nunca muda cor, sombra ou rotação.
export function logo({ formato = 'linha', cor = 'branco', altura = 32, classe = '' } = {}) {
  const caixa = CAIXAS[formato]
  return el(
    'span',
    { class: `logo ${classe}`.trim(), style: { height: `${altura}px`, aspectRatio: `${caixa.largura} / ${caixa.altura}` } },
    el('img', {
      src: LOGOS[formato][cor],
      alt: 'Elétrica Bahiana',
      style: {
        width: `${(caixa.lado / caixa.largura) * 100}%`,
        left: `${(-caixa.x / caixa.largura) * 100}%`,
        top: `${(-caixa.y / caixa.altura) * 100}%`,
      },
    }),
  )
}

export function assinatura({ clara = false } = {}) {
  return el(
    'p',
    { class: ['assinatura', clara && 'assinatura--clara'] },
    el('span', { class: 'assinatura__hashtag' }, '#EnergiaBahiana'),
    el('span', {}, 'Mais forte por você!'),
  )
}

// Fundo de impacto: gradiente principal com o pattern de circuito nas duas laterais.
export function fundoMarca(...conteudo) {
  return el(
    'div',
    { class: 'fundo-marca', style: { '--pattern': `url("${PATTERN_CIRCUITO}")` } },
    el('main', { class: 'fundo-marca__conteudo' }, ...conteudo),
    el('footer', { class: 'fundo-marca__rodape' }, assinatura({ clara: true })),
  )
}

export const mascote = (qual, classe) => el('img', { class: classe, src: MASCOTES[qual], alt: '' })
