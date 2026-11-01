// Configuração web do Firebase. Não é segredo: quem protege os dados são as regras do Firestore.
export const FIREBASE = {
  apiKey: 'AIzaSyDFJQuqNDjeIZ4NBS0hO-4hjvMKDxPcpYI',
  authDomain: 'controle-pessoal-eb.firebaseapp.com',
  projectId: 'controle-pessoal-eb',
  storageBucket: 'controle-pessoal-eb.firebasestorage.app',
  messagingSenderId: '533813008010',
  appId: '1:533813008010:web:5368611d4c788ca145bf73',
}

export const DOMINIO_EMPRESA = 'eletricabahiana.com.br'

export const ehEmailDaEmpresa = (email) => String(email ?? '').trim().toLowerCase().endsWith(`@${DOMINIO_EMPRESA}`)

// Lojas permitidas no cadastro de colaboradores (valores fixos).
export const LOJAS = ['Salvador (Matriz)', 'Lauro de Freitas', 'Aracaju']
