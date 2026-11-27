// Sorteio, em toda lista: quem participa ou não. Não espera o servidor, como o check-in.
import { marcarSorteio } from '../../dados/listas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { participaDoSorteio, rotuloDoSorteio } from '../../lib/listas.js'
import { avisar, avisarErro } from '../../ui/componentes.js'
import { el, icone } from '../../ui/dom.js'

function trocarSorteio(p, listaId) {
  const participa = participaDoSorteio(p)
  marcarSorteio(listaId, p.id, !participa).catch((e) => avisarErro(mensagemDeErro(e)))
  avisar(participa ? `${p.nome} ficou fora do sorteio.` : `${p.nome} entrou no sorteio.`)
}

// Botão "Sorteio" ao lado do Check-in (pedido de 27/11/2026): azul com o visto quando a pessoa participa, vermelho
// com o X (e riscado) quando está fora. Um toque troca. Quem não pode marcar vê só a etiqueta.
export function botaoDoSorteio(p, { listaId, podeMarcar }) {
  if (!podeMarcar) return marcaDoSorteio(p, { listaId, podeMarcar })
  const participa = participaDoSorteio(p)
  return el(
    'button',
    {
      type: 'button',
      class: ['botao', 'checkin__sorteio-botao', participa ? 'checkin__sorteio-botao--sim' : 'checkin__sorteio-botao--nao'],
      'aria-pressed': participa ? 'true' : 'false',
      'aria-label': `Sorteio de ${p.nome}: ${participa ? 'participa. Tocar tira do sorteio.' : 'fora. Tocar põe no sorteio.'}`,
      title: participa ? 'No sorteio. Toque para tirar.' : 'Fora do sorteio. Toque para pôr.',
      onClick: () => trocarSorteio(p, listaId),
    },
    icone(participa ? 'circle-check' : 'circle-x'),
    el('span', {}, 'Sorteio'),
  )
}

// Etiqueta "No sorteio" / "Fora do sorteio" (Convocados e quem não pode marcar). Quem pode marcar troca com um toque.
export function marcaDoSorteio(p, { listaId, podeMarcar }) {
  const participa = participaDoSorteio(p)
  const classe = ['etiqueta', participa ? 'etiqueta--forte' : 'etiqueta--alerta', 'checkin__sorteio']
  const conteudo = [icone(participa ? 'trophy' : 'circle-x'), rotuloDoSorteio(p)]
  if (!podeMarcar) return el('span', { class: classe }, conteudo)
  return el(
    'button',
    {
      type: 'button',
      class: classe,
      'aria-pressed': participa ? 'true' : 'false',
      'aria-label': `${p.nome}: ${participa ? 'no sorteio. Tocar tira do sorteio.' : 'fora do sorteio. Tocar põe no sorteio.'}`,
      title: participa ? 'Tocar para tirar do sorteio' : 'Tocar para pôr no sorteio',
      onClick: () => trocarSorteio(p, listaId),
    },
    conteudo,
  )
}
