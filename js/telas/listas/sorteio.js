// Marca do sorteio (lista com "temSorteio"), usada no check-in e em Convocados: "No sorteio" ou "Fora do sorteio". Quem
// pode marcar troca com um toque; não espera o servidor, como o check-in.
import { marcarSorteio } from '../../dados/listas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { participaDoSorteio, rotuloDoSorteio } from '../../lib/listas.js'
import { avisar, avisarErro } from '../../ui/componentes.js'
import { el, icone } from '../../ui/dom.js'

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
      onClick: () => {
        marcarSorteio(listaId, p.id, !participa).catch((e) => avisarErro(mensagemDeErro(e)))
        avisar(participa ? `${p.nome} ficou fora do sorteio.` : `${p.nome} entrou no sorteio.`)
      },
    },
    conteudo,
  )
}
