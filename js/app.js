// Início do app: login, conferência do cadastro em usuarios/{email}, menu e troca de telas.
import { DOMINIO_EMPRESA, ehEmailDaEmpresa } from './config.js'
import { entrarComGoogle, observarSessao, ouvirDocumento, retornoDoLogin, sair } from './dados/banco.js'
import { pararFontes } from './dados/fontes.js'
import { mensagemDeErro } from './lib/erros.js'
import { abasDoPapel, papelValido } from './lib/papeis.js'
import { lerEndereco } from './lib/rotas.js'
import { telaCarregando, telaLogin, telaSemAcesso } from './telas/entrada.js'
import { montarLayout } from './telas/layout.js'
import { blocoDeErro, carregando } from './ui/componentes.js'

const raiz = document.getElementById('raiz')

// Cada aba carrega o próprio arquivo só quando é aberta.
const TELAS = {
  dashboard: () => import('./telas/emConstrucao.js'),
  colaboradores: () => import('./telas/emConstrucao.js'),
  aniversariantes: () => import('./telas/emConstrucao.js'),
  fornecedores: () => import('./telas/emConstrucao.js'),
  eletricistas: () => import('./telas/emConstrucao.js'),
  listas: () => import('./telas/emConstrucao.js'),
  usuarios: () => import('./telas/usuarios.js'),
}

let erroDeLogin = ''
let pararCadastro = null
let app = null

retornoDoLogin().catch((e) => {
  erroDeLogin = mensagemDeErro(e)
  if (!app) mostrarLogin()
})

async function sairDoApp() {
  await sair()
  // Depois de sair, o banco local foi fechado e apagado: recarregar começa tudo do zero.
  window.location.reload()
}

function mostrarLogin() {
  telaLogin(raiz, { erro: erroDeLogin, aoEntrar: entrarComGoogle })
}

function fecharApp() {
  app?.parar()
  app = null
  pararFontes()
}

observarSessao((usuario) => {
  pararCadastro?.()
  pararCadastro = null
  if (!usuario) {
    fecharApp()
    mostrarLogin()
    return
  }
  if (!ehEmailDaEmpresa(usuario.email)) {
    erroDeLogin = `Use o seu e-mail @${DOMINIO_EMPRESA} para entrar.`
    sair({ forcar: true }).finally(() => window.location.reload())
    return
  }
  erroDeLogin = ''
  telaCarregando(raiz)
  pararCadastro = ouvirDocumento(
    `usuarios/${usuario.email}`,
    (cadastro) => {
      if (!cadastro || cadastro.ativo !== true || !papelValido(cadastro.papel)) {
        fecharApp()
        telaSemAcesso(raiz, { usuario, aoSair: sairDoApp })
        return
      }
      abrirApp({ email: usuario.email, nome: cadastro.nome || usuario.nome || usuario.email, cargo: cadastro.cargo ?? '', papel: cadastro.papel })
    },
    (erro) => {
      fecharApp()
      // Para quem não tem cadastro, as regras podem negar até a leitura do próprio documento.
      if (erro.code === 'permission-denied') telaSemAcesso(raiz, { usuario, aoSair: sairDoApp })
      else telaSemAcesso(raiz, { usuario, situacao: 'erro', erro, aoSair: sairDoApp })
    },
  )
})

const mesmaPessoa = (a, b) => a && b && a.email === b.email && a.nome === b.nome && a.cargo === b.cargo && a.papel === b.papel

function abrirApp(pessoa) {
  if (app && mesmaPessoa(app.pessoa, pessoa)) return
  app?.parar()
  const { conteudo, marcarAba } = montarLayout(raiz, pessoa, { aoSair: sairDoApp })
  let limparTela = null
  let versao = 0

  async function abrirTela() {
    const { tela, params } = lerEndereco(window.location.hash)
    const permitidas = abasDoPapel(pessoa.papel).map((aba) => aba.id)
    if (!permitidas.includes(tela)) {
      window.location.replace('#/dashboard')
      if (tela === 'dashboard') return
      return
    }
    const minha = ++versao
    limparTela?.()
    limparTela = null
    marcarAba(tela)
    conteudo.replaceChildren(carregando())
    try {
      const modulo = await TELAS[tela]()
      if (minha !== versao) return
      conteudo.replaceChildren()
      limparTela = modulo.montar(conteudo, { pessoa, tela, params }) ?? null
    } catch (erro) {
      if (minha !== versao) return
      console.error(erro)
      conteudo.replaceChildren(blocoDeErro(mensagemDeErro(erro)))
    }
  }

  let ultimoEndereco = ''
  function aoMudarEndereco() {
    const { tela, params } = lerEndereco(window.location.hash)
    const novo = [tela, ...params].join('/')
    if (novo.split('/')[0] !== ultimoEndereco.split('/')[0]) window.scrollTo({ top: 0 })
    ultimoEndereco = novo
    abrirTela()
  }

  window.addEventListener('hashchange', aoMudarEndereco)
  app = {
    pessoa,
    parar() {
      window.removeEventListener('hashchange', aoMudarEndereco)
      versao++
      limparTela?.()
    },
  }
  aoMudarEndereco()
}
