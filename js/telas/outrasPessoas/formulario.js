// Janelas da aba Outras pessoas: cadastro e importação de planilha (só admin).
import { cadastrarOutraPessoa, editarOutraPessoa, importarOutrasPessoas } from '../../dados/outrasPessoas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { CAMPOS_DA_PLANILHA, GRUPOS_DE_OUTRAS_PESSOAS, prepararImportacao, validarOutraPessoa } from '../../lib/outrasPessoas.js'
import {
  abrirJanela, aviso, avisar, blocoDeErro, botao, campo, comOcupado, confirmar, entradaTexto, mostrarErros, selecao,
} from '../../ui/componentes.js'
import { el } from '../../ui/dom.js'
import { abrirImportador } from '../../ui/importador.js'

// Antes de publicar as regras novas no Firebase, a coleção outrasPessoas nega a leitura: explica o que fazer. Sem erro
// (por exemplo quando veio só a lista "indisponiveis" de ouvirFontes), mostra o mesmo aviso.
export const avisoDasRegras = (erro) =>
  !erro || erro.code === 'permission-denied'
    ? aviso('Esta parte precisa das regras novas do Firebase. Abra o console do Firebase em Firestore Database > Regras, cole o conteúdo do arquivo firestore.rules, clique em Publicar e recarregue esta página (passo a passo no README, parte "Como publicar novas regras do Firestore").', { erro: true })
    : blocoDeErro(erro)

// dados(): { outrasPessoas, colaboradores }. grupo: grupo já escolhido para quem é novo.
export function abrirFormularioOutraPessoa({ outra = null, dados, grupo = '' }) {
  const nova = !outra
  const janela = abrirJanela({ titulo: nova ? 'Nova pessoa' : 'Editar pessoa', largura: 560 })
  const campos = {
    nome: campo({ rotulo: 'Nome completo', entrada: entradaTexto({ value: outra?.nome ?? '', maxlength: 120, 'data-foco': true }) }),
    grupo: campo({ rotulo: 'Grupo', entrada: selecao([{ valor: '', rotulo: 'Escolha o grupo' }, ...GRUPOS_DE_OUTRAS_PESSOAS], outra?.grupo ?? grupo) }),
    empresa: campo({
      rotulo: 'Empresa ou função',
      opcional: true,
      entrada: entradaTexto({ value: outra?.empresa ?? '', maxlength: 120, placeholder: 'Ex.: Diretor comercial, Limpeza (Empresa X), Segurança' }),
    }),
  }
  const caixaDeErro = el('div')
  const salvar = botao({ texto: nova ? 'Cadastrar' : 'Salvar', icone: 'check', variante: 'principal', tipo: 'submit' })
  const formulario = el(
    'form',
    { class: 'formulario', novalidate: true },
    campos.nome.no,
    el('div', { class: 'formulario__linha' }, campos.grupo.no, campos.empresa.no),
    caixaDeErro,
    el('div', { class: 'janela-modal__acoes' }, botao({ texto: 'Cancelar', aoClicar: () => janela.fechar() }), salvar),
  )
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    caixaDeErro.replaceChildren()
    const { outrasPessoas, colaboradores } = dados()
    const { erros, dados: limpos, valido, homonimo, colaborador } = validarOutraPessoa(
      { nome: campos.nome.entrada.value, grupo: campos.grupo.entrada.value, empresa: campos.empresa.entrada.value },
      { outrasPessoas, colaboradores, idAtual: outra?.id },
    )
    if (!mostrarErros(campos, erros) || !valido) return
    if (homonimo || colaborador) {
      const seguir = await confirmar({
        titulo: 'Nome igual a outro cadastro',
        texto: homonimo
          ? `${homonimo.nome} já está em Outras pessoas (${homonimo.grupo || 'Outro'}). Se for outra pessoa com o mesmo nome, pode seguir.`
          : `${colaborador.nome} já é colaborador. Colaboradores entram nas listas pela aba Colaboradores; só siga se for outra pessoa.`,
        botaoSim: nova ? 'Cadastrar mesmo assim' : 'Salvar mesmo assim',
      })
      if (!seguir) return
    }
    await comOcupado(salvar, async () => {
      try {
        if (nova) await cadastrarOutraPessoa(limpos)
        else await editarOutraPessoa(outra.id, limpos)
        avisar(nova ? `${limpos.nome} cadastrado em Outras pessoas.` : 'Alterações salvas.')
        janela.fechar()
      } catch (e) {
        caixaDeErro.replaceChildren(aviso(mensagemDeErro(e), { erro: true }))
      }
    })
  })
  janela.corpo.append(formulario)
  janela.focar()
}

export function abrirImportacaoOutrasPessoas({ dados }) {
  abrirImportador({
    titulo: 'Importar outras pessoas',
    ajuda: 'Precisa ter pelo menos a coluna com o nome. Se tiver, também o grupo (Diretoria, Prestador de serviço ou Outro) e a empresa ou função.',
    campos: CAMPOS_DA_PLANILHA,
    opcoes: [{ chave: 'atualizar', rotulo: 'Atualizar quem já existe com os dados da planilha', ajuda: 'Só mudam os campos preenchidos na planilha.', padrao: true }],
    preparar: (registros) => prepararImportacao({ registros, outrasPessoas: dados().outrasPessoas }),
    colunas: [
      { rotulo: 'Grupo', celula: (i) => i.dados?.grupo ?? '' },
      { rotulo: 'Empresa ou função', celula: (i) => i.dados?.empresa ?? '' },
    ],
    contarGravacoes: (previa, opcoes) => previa.contagem.novos + (opcoes.atualizar ? previa.contagem.existentes : 0),
    gravar: (previa, opcoes, aoAvancar) => importarOutrasPessoas(previa, { atualizarExistentes: opcoes.atualizar }, aoAvancar),
  })
}
