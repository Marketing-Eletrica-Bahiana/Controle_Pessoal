// Contatos de um colaborador, usados na parte "Pais e mães" e na ficha.
import { formatarWhatsapp, linkDoWhatsapp } from '../../lib/contato.js'
import { el, icone } from '../../ui/dom.js'

// Celular (11 números) abre a conversa no WhatsApp; telefone fixo abre a ligação.
export function telefoneDoColaborador(c) {
  if (!c.telefone) return ''
  const numero = formatarWhatsapp(c.telefone)
  if (c.telefone.length !== 11) return el('a', { href: `tel:+55${c.telefone}` }, numero)
  return el(
    'a',
    { class: 'botao botao--pequeno botao--whatsapp', href: linkDoWhatsapp(c.telefone), target: '_blank', rel: 'noopener', title: `Abrir conversa com ${c.nome} no WhatsApp` },
    icone('message-circle'),
    el('span', {}, numero),
  )
}

export const emailDoColaborador = (c) => (c.email ? el('a', { href: `mailto:${c.email}` }, c.email) : '')

export function contatosDoColaborador(c) {
  if (!c.telefone && !c.email) return el('span', { class: 'texto-suave' }, 'Sem contato cadastrado')
  return el(
    'ul',
    { class: 'contato' },
    c.telefone && el('li', {}, telefoneDoColaborador(c)),
    c.email && el('li', {}, icone('mail'), emailDoColaborador(c)),
  )
}
