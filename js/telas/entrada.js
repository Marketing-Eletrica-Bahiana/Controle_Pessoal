// Telas de fora do app: login, carregando e acesso não liberado.
import { DOMINIO_EMPRESA } from '../config.js'
import { mensagemDeErro } from '../lib/erros.js'
import { primeiroNome } from '../lib/texto.js'
import { aviso, botao, comOcupado } from '../ui/componentes.js'
import { el, icone } from '../ui/dom.js'
import { fundoMarca, logo, mascote } from '../ui/marca.js'

export function telaCarregando(raiz, texto = 'Carregando...') {
  raiz.replaceChildren(fundoMarca(el('p', { class: 'carregando', role: 'status' }, icone('loader-circle', 'girando'), texto)))
}

export function telaLogin(raiz, { erro, aoEntrar }) {
  const caixaDeErro = el('div', { class: 'login__erro' }, erro && aviso(erro, { erro: true }))
  const entrar = botao({
    texto: 'Entrar com Google',
    icone: 'log-in',
    variante: 'principal',
    classe: 'botao--grande',
    aoClicar: () =>
      comOcupado(entrar, async () => {
        caixaDeErro.replaceChildren()
        try {
          await aoEntrar()
        } catch (e) {
          caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
        }
      }),
  })

  raiz.replaceChildren(
    fundoMarca(
      el(
        'div',
        { class: 'login' },
        mascote('ebinho', 'login__mascote login__mascote--ebinho'),
        el(
          'section',
          { class: 'janela login__janela' },
          logo({ formato: 'compacto', cor: 'azul', altura: 80 }),
          el('div', { class: 'linha-circuito', 'aria-hidden': 'true' }),
          el('h1', { class: 'titulo-destaque' }, 'Controle Pessoal'),
          el(
            'p',
            {},
            'Colaboradores, aniversariantes, fornecedores, eletricistas e listas de presença num lugar só. Entre com o seu e-mail da Elétrica Bahiana e bora!',
          ),
          entrar,
          el('p', { class: 'texto-suave texto-pequeno' }, `Acesso só com e-mail @${DOMINIO_EMPRESA}.`),
          caixaDeErro,
        ),
        mascote('ebinha', 'login__mascote login__mascote--ebinha'),
      ),
    ),
  )
}

// situacao: 'sem-acesso' (sem cadastro, inativo ou papel inválido) ou 'erro' (não deu para ler o cadastro).
export function telaSemAcesso(raiz, { usuario, situacao = 'sem-acesso', erro, aoSair }) {
  const nome = primeiroNome(usuario?.nome)
  const titulo = situacao === 'erro' ? 'Não deu para carregar seu cadastro' : nome ? `Oi, ${nome}!` : 'Quase lá!'
  const texto = situacao === 'erro' ? mensagemDeErro(erro) : 'Seu acesso ainda não foi liberado. Fale com a equipe de Marketing.'
  const caixaDeErro = el('div')
  const sair = botao({
    texto: 'Sair',
    icone: 'log-out',
    aoClicar: () =>
      comOcupado(sair, async () => {
        try {
          await aoSair()
        } catch (e) {
          caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
        }
      }),
  })

  raiz.replaceChildren(
    fundoMarca(
      el(
        'div',
        { class: 'sem-acesso' },
        mascote('ebinha', 'sem-acesso__mascote'),
        el(
          'section',
          { class: 'janela sem-acesso__janela' },
          logo({ formato: 'compacto', cor: 'azul', altura: 64 }),
          el('div', { class: 'linha-circuito', 'aria-hidden': 'true' }),
          el('h1', { class: 'titulo-destaque' }, titulo),
          el('p', {}, texto),
          usuario?.email && el('p', { class: 'texto-suave texto-pequeno' }, `Conta: ${usuario.email}`),
          caixaDeErro,
          el(
            'div',
            { class: 'acoes' },
            situacao === 'erro' && botao({ texto: 'Tentar de novo', icone: 'rotate-cw', aoClicar: () => window.location.reload() }),
            sair,
          ),
        ),
      ),
    ),
  )
}
