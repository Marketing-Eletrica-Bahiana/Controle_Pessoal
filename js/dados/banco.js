// Único módulo que conversa com o Firebase. O resto do app usa estas funções com caminhos em texto
// ("colaboradores/abc", "listas/x/presencas") e recebe objetos simples { id, ...campos }, com as
// datas do Firestore já convertidas em Date.
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth'
import {
  Timestamp, arrayRemove, arrayUnion, clearIndexedDbPersistence, collection, collectionGroup, deleteDoc, doc,
  getCountFromServer, getDoc, getDocs, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, query, runTransaction, serverTimestamp, setDoc, terminate, updateDoc,
  waitForPendingWrites, where, writeBatch,
} from 'firebase/firestore'
import { DOMINIO_EMPRESA, FIREBASE } from '../config.js'

const app = initializeApp(FIREBASE)
const auth = getAuth(app)
auth.languageCode = 'pt-BR'

// Cache no aparelho: o check-in continua funcionando com internet fraca e envia quando a conexão volta.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

const provedor = new GoogleAuthProvider()
// "hd" faz o Google oferecer só contas da empresa. A checagem que vale fica no app e nas regras.
provedor.setCustomParameters({ hd: DOMINIO_EMPRESA, prompt: 'select_account' })

// Sessão

const JANELA_FECHADA = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']
const POPUP_NAO_FUNCIONA = ['auth/popup-blocked', 'auth/operation-not-supported-in-environment']
const ehCelular = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

export function observarSessao(aoMudar) {
  return onAuthStateChanged(auth, (u) =>
    aoMudar(u ? { email: (u.email ?? '').toLowerCase(), nome: u.displayName ?? '' } : null),
  )
}

export const retornoDoLogin = () => getRedirectResult(auth)

export async function entrarComGoogle() {
  try {
    await signInWithPopup(auth, provedor)
  } catch (erro) {
    const redirecionar = POPUP_NAO_FUNCIONA.includes(erro.code) || (ehCelular() && !JANELA_FECHADA.includes(erro.code))
    if (!redirecionar) throw erro
    await signInWithRedirect(auth, provedor)
  }
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

// Antes de sair, garante que nada ficou esperando internet; depois apaga o cache do aparelho.
export async function sair({ forcar = false } = {}) {
  if (!forcar) {
    const enviado = await Promise.race([waitForPendingWrites(db).then(() => true), esperar(4000).then(() => false)])
    if (!enviado) {
      const erro = new Error('Ainda há alterações esperando a internet para serem enviadas. Conecte-se e tente sair de novo.')
      erro.code = 'app/pendente'
      throw erro
    }
  }
  await signOut(auth)
  try {
    await terminate(db)
    await clearIndexedDbPersistence(db)
  } catch {
    // Outra aba aberta ainda usa o cache; ele é limpo quando a última sair.
  }
}

// Leitura

const OPCOES_LEITURA = { serverTimestamps: 'estimate' }

function converter(valor) {
  if (valor instanceof Timestamp) return valor.toDate()
  if (Array.isArray(valor)) return valor.map(converter)
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(Object.entries(valor).map(([chave, v]) => [chave, converter(v)]))
  }
  return valor
}

const paraObjeto = (snap) => ({ id: snap.id, ...converter(snap.data(OPCOES_LEITURA)) })
const refDoc = (caminho) => doc(db, caminho)
const refColecao = (caminho) => collection(db, caminho)
const comFiltros = (base, filtros) => (filtros.length ? query(base, ...filtros.map(([c, o, v]) => where(c, o, v))) : base)

export function ouvirDocumento(caminho, aoMudar, aoErrar) {
  return onSnapshot(refDoc(caminho), (s) => aoMudar(s.exists() ? paraObjeto(s) : null), aoErrar)
}

// aoMudar(lista, { pendente }): "pendente" diz se há gravações deste aparelho ainda sem confirmação do servidor.
// Só os documentos que mudaram são convertidos de novo; os outros mantêm o mesmo objeto.
export function ouvirColecao(caminho, aoMudar, aoErrar, filtros = [], { comPendencias = false } = {}) {
  const objetos = new Map()
  return onSnapshot(
    comFiltros(refColecao(caminho), filtros),
    { includeMetadataChanges: comPendencias },
    (s) => {
      for (const mudanca of s.docChanges()) {
        if (mudanca.type === 'removed') objetos.delete(mudanca.doc.id)
        else objetos.set(mudanca.doc.id, paraObjeto(mudanca.doc))
      }
      aoMudar(
        s.docs.map((d) => objetos.get(d.id)),
        { pendente: s.metadata.hasPendingWrites },
      )
    },
    aoErrar,
  )
}

export async function lerDocumento(caminho) {
  const s = await getDoc(refDoc(caminho))
  return s.exists() ? paraObjeto(s) : null
}

export async function lerColecao(caminho, filtros = []) {
  const s = await getDocs(comFiltros(refColecao(caminho), filtros))
  return s.docs.map(paraObjeto)
}

// Consulta em todas as subcoleções com esse nome (ex.: "presencas" de todas as listas).
// Cada item traz paiId: o ID do documento dono da subcoleção.
export async function lerGrupo(nome, filtros = []) {
  const s = await getDocs(comFiltros(collectionGroup(db, nome), filtros))
  return s.docs.map((d) => ({ ...paraObjeto(d), paiId: d.ref.parent.parent?.id ?? null }))
}

export async function contar(caminho, filtros = []) {
  const s = await getCountFromServer(comFiltros(refColecao(caminho), filtros))
  return s.data().count
}

// Escrita

export const novoId = (caminhoColecao) => doc(refColecao(caminhoColecao)).id
export const agora = () => serverTimestamp()
export const incluirNaLista = (...valores) => arrayUnion(...valores)
export const tirarDaLista = (...valores) => arrayRemove(...valores)

export const definir = (caminho, dados, { mesclar = false } = {}) => setDoc(refDoc(caminho), dados, { merge: mesclar })
export const atualizar = (caminho, dados) => updateDoc(refDoc(caminho), dados)
export const apagar = (caminho) => deleteDoc(refDoc(caminho))

// operacoes: [{ tipo: 'definir' | 'atualizar' | 'apagar', caminho, dados, mesclar }]. Grava em lotes de 450.
export async function gravarLote(operacoes, aoAvancar) {
  for (let inicio = 0; inicio < operacoes.length; inicio += 450) {
    const lote = writeBatch(db)
    for (const { tipo, caminho, dados, mesclar } of operacoes.slice(inicio, inicio + 450)) {
      if (tipo === 'definir') lote.set(refDoc(caminho), dados, { merge: Boolean(mesclar) })
      else if (tipo === 'atualizar') lote.update(refDoc(caminho), dados)
      else if (tipo === 'apagar') lote.delete(refDoc(caminho))
    }
    await lote.commit()
    aoAvancar?.(Math.min(inicio + 450, operacoes.length), operacoes.length)
  }
}

export function transacao(funcao) {
  return runTransaction(db, (t) =>
    funcao({
      ler: async (caminho) => {
        const s = await t.get(refDoc(caminho))
        return s.exists() ? paraObjeto(s) : null
      },
      definir: (caminho, dados, { mesclar = false } = {}) => t.set(refDoc(caminho), dados, { merge: mesclar }),
      atualizar: (caminho, dados) => t.update(refDoc(caminho), dados),
      apagar: (caminho) => t.delete(refDoc(caminho)),
    }),
  )
}
