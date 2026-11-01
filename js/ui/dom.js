// Criação de elementos sem innerHTML: textos vindos do banco entram sempre como texto, nunca como HTML.
import { ICONES } from './icones.js'

const SVG = 'http://www.w3.org/2000/svg'

export const achatar = (filhos) =>
  filhos
    .flat(Infinity)
    .filter((f) => f !== null && f !== undefined && f !== false && f !== '')
    .map((f) => (f instanceof Node ? f : document.createTextNode(String(f))))

function aplicar(no, props) {
  for (const [chave, valor] of Object.entries(props ?? {})) {
    if (valor === undefined || valor === null || valor === false) continue
    if (chave === 'class') no.setAttribute('class', Array.isArray(valor) ? valor.filter(Boolean).join(' ') : valor)
    else if (chave === 'style' && typeof valor === 'object') {
      for (const [prop, v] of Object.entries(valor)) {
        if (prop.startsWith('--')) no.style.setProperty(prop, v)
        else no.style[prop] = v
      }
    } else if (chave === 'dataset') Object.assign(no.dataset, valor)
    else if (chave.startsWith('on') && typeof valor === 'function') no.addEventListener(chave.slice(2).toLowerCase(), valor)
    else if (['value', 'checked', 'disabled', 'hidden', 'selected', 'type', 'htmlFor', 'title', 'id', 'name'].includes(chave)) {
      no[chave] = valor
    } else no.setAttribute(chave, valor === true ? '' : String(valor))
  }
}

export function el(tag, props, ...filhos) {
  const no = document.createElement(tag)
  aplicar(no, props)
  no.append(...achatar(filhos))
  return no
}

export function icone(nome, classe = '') {
  const svg = document.createElementNS(SVG, 'svg')
  for (const [chave, valor] of Object.entries({
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round',
    'stroke-linejoin': 'round', 'aria-hidden': 'true', class: `icone ${classe}`.trim(),
  })) svg.setAttribute(chave, valor)
  // Desenhos fixos do pacote Lucide (js/ui/icones.js), nunca dados digitados.
  svg.innerHTML = ICONES[nome] ?? ''
  return svg
}

export const trocar = (no, ...filhos) => {
  no.replaceChildren(...achatar(filhos))
  return no
}

// Atraso para buscas enquanto a pessoa digita.
export function atrasar(funcao, ms = 150) {
  let id
  return (...args) => {
    clearTimeout(id)
    id = setTimeout(() => funcao(...args), ms)
  }
}

// Rola até o topo quando a tela muda.
export const irParaTopo = () => window.scrollTo({ top: 0 })
