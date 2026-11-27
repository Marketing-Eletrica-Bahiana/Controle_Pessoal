# Controle Pessoal | Elétrica Bahiana (EB)

App interno com colaboradores (inclusive pais e mães, com contatos), setores, aniversariantes,
fornecedores, eletricistas do CAE, listas de presença com check-in pelo celular e ramais. Explicação para quem usa no `README.md`.

- Repositório (público): https://github.com/Marketing-Eletrica-Bahiana/Controle_Pessoal
- Endereço publicado: https://marketing-eletrica-bahiana.github.io/Controle_Pessoal/
- Referência só para login com Google, organização do Firebase e identidade visual:
  Controle_Atividades (https://github.com/Marketing-Eletrica-Bahiana/Controle_Atividades).
  Não copiar funcionalidades dele nem usar outro projeto como referência.

## Como trabalhar neste projeto

- **Dois computadores (desde 26/11/2026).** A pessoa edita o projeto em dois PCs, e cada um tem a sua Claude, sem
  a memória do outro. O GitHub é o que junta os dois. Em todo pedido de alteração:
  1. Antes de mexer em qualquer arquivo: `git status` e `git pull` nesta pasta. Se houver mudança local sem commit
     ou o pull der conflito, parar e avisar a pessoa antes de continuar.
  2. Ler o "Histórico de alterações" no fim do `README.md` e as etapas abaixo, para saber o que foi feito no outro
     computador.
  3. Ao terminar: escrever a alteração no "Histórico de alterações" (data DD/MM/AAAA, o que mudou em linguagem
     simples, a mais recente primeiro), atualizar este arquivo, testar, fazer o commit e o `git push` para a
     `main`. Nada fica só no computador.
- Trabalhar em etapas. Ao fim de cada uma: testar, fazer o commit e enviar para a `main`.
- Toda a interface em português do Brasil. Nunca usar travessão nos textos da interface.
- Datas exibidas como DD/MM/AAAA e horas como HH:MM, no fuso `America/Bahia` (`js/lib/datas.js`).
- Nenhum e-mail da equipe em arquivo que vai para o repositório (código, documentação, testes).
  O repositório é público. Os cadastros ficam só no Firestore.
- Layout responsivo: o check-in é feito no celular durante os eventos.
- Manter este arquivo atualizado a cada etapa.

## Etapas

1. (Feita) Base: login com Google, conferência de `usuarios/{email}`, menu das abas, cabeçalho
   com nome, cargo e papel, aba Usuários completa, `firestore.rules`, README e publicação.
2. (Feita) Colaboradores e setores, importação de planilha e "Baixar lista" (ver "Colaboradores").
3. (Feita) Fornecedores e Eletricistas do CAE (ver "Fornecedores e eletricistas").
4. (Feita) Listas de presença e check-in (ver "Listas").
5. (Feita) Aniversariantes (ver "Aniversariantes").
6. (Feita) Dashboard e revisão geral (ver "Dashboard" e "Revisão").
7. (Feita) Pais e mães, contatos dos colaboradores e aba Ramal (ver "Pais e mães e Ramal").
8. (Feita) Desligados, excluir de vez, setinhas de ordem nas tabelas e contato nos aniversariantes (ver
   "Desligados, exclusão e ordem das tabelas").
9. (Feita em 24/11/2026, a pedido) "Desativar" colaborador virou "Desligar", com a data (ver "Desligar").
10. (Feita em 24/11/2026, a pedido) Pessoas da marca na ficha do fornecedor (ver "Pessoas da marca").
11. (Feita em 26/11/2026, a pedido) Edição em dois computadores: "Histórico de alterações" e "Editar em mais de um
    computador" no README, e a regra no topo deste arquivo.
12. (Feita em 26/11/2026, a pedido) Quadro "Informações Pessoais" na ficha do colaborador (ver "Informações
    Pessoais").
13. (Feita em 27/11/2026, a pedido) Parte "Participação" em Colaboradores e observações nos rankings dos
    aniversariantes (ver "Participação").
14. (Feita em 27/11/2026, a pedido) Bloco "Endomarketing e eventos" no Dashboard (ver "Dashboard").
15. (Feita em 27/11/2026, a pedido) Opção "Todas as lojas" na loja da lista e em "Loja inteira" (ver "Listas").
16. (Feita em 27/11/2026, a pedido) "Pais e mães" em Adicionar colaboradores dos convocados (ver "Listas").
17. (Feita em 27/11/2026, a pedido: "todas as listas de aniversariantes são Ações de Endomarketing") Os controles de
    aniversariantes contam como ações de endomarketing no filtro de tipo da aba Listas, na Participação e no bloco
    Endomarketing e eventos do Dashboard. O `tipo` gravado não muda (o controle depende dele): a regra é
    `ehAcaoDeEndomarketing` / `ehDoTipo` em `js/lib/listas.js` (com testes).
18. (Feita em 27/11/2026, a pedido: "abrir o nome da pessoa e colocar que não participou, em vez de não veio, e também
    um botão de outros e um campo de observação") Situação e observação no check-in (ver "Listas").
19. (Feita em 27/11/2026, a pedido: "me dê a opção de subir o excel em listas") "Importar planilha" em Convocados
    (ver "Listas").

A pessoa autorizou fazer as etapas 2 a 6 em sequência, sem pedir aprovação entre elas, depois de
conferida a integração da Etapa 1.

## Tecnologia

- Site estático, sem etapa de build: HTML, CSS e ES modules. Nada de React, Vite ou npm no site.
- Bibliotecas por CDN, declaradas no import map de `index.html`:
  - Firebase 13.1.0 (gstatic): `firebase/app`, `firebase/auth`, `firebase/firestore`.
  - SheetJS 0.20.3 (`https://cdn.sheetjs.com/`), como `xlsx`, carregado só quando precisa.
  - Chart.js 4.6.1 (jsDelivr), como `chart.js`, carregado só no Dashboard.
- Ícones Lucide gerados em `js/ui/icones.js` (só os usados; ver o comentário do arquivo).
- Testes com o executor do próprio Node 24 (`npm test`), sem pacotes, para `js/lib/`.
- Publicação por GitHub Actions (`.github/workflows/publicar.yml`): roda os testes, copia
  `index.html`, `404.html`, `.nojekyll`, `css/`, `js/`, `fontes/` e `marca/` para o site.
  `404.html` leva endereços sem `#` para a rota certa.
- Versão nos endereços (27/11/2026): o GitHub Pages guarda cada arquivo 10 minutos no navegador, e uma página aberta
  durante uma publicação juntou `js/lib/listas.js` antigo com a tela nova de Listas ("Algo deu errado"). Agora o
  `publicar.yml` roda `.github/versionar.mjs`, que no `_site/index.html` (só na cópia publicada; o repositório não
  muda) põe `?v=<commit>` no `app.js`, nos dois `.css` e, pelo import map, em todos os módulos de `js/`. Se o trecho
  esperado não estiver no `index.html`, a publicação para. Mesmo assim, uma página aberta antes da publicação ainda pode
  misturar versões ao abrir outra aba: `app.js` reconhece o erro (`ehErroDeVersao` em `js/lib/erros.js`, SyntaxError de
  export/import) e recarrega a página uma vez (`recarregarPorVersao`: não repete em menos de 1 minuto e não recarrega
  sem internet, por causa do check-in); senão mostra "O Controle Pessoal foi atualizado. Recarregue a página...".
- Endereços com `#/` (`js/lib/rotas.js`). Cada aba carrega o próprio arquivo de `js/telas/` só
  quando é aberta (`TELAS` em `js/app.js`). Cada tela exporta `montar(raiz, { pessoa, params })`
  e devolve uma função que para os ouvintes ao sair da tela.
- Caminhos de arquivos sempre relativos (`marca/...`, `css/...`), para funcionar em
  `/Controle_Pessoal/` e em `localhost`.

## Organização do código

- `js/dados/banco.js`: único módulo que importa o Firebase. Funções por caminho em texto
  (`ouvirColecao`, `ouvirDocumento`, `lerColecao`, `lerGrupo`, `contar`, `definir`, `atualizar`,
  `apagar`, `gravarLote`, `transacao`, `agora`, `incluirNaLista`, `tirarDaLista`). Devolve objetos
  `{ id, ...campos }` com Timestamps já como `Date`.
- Firestore com cache no aparelho (`persistentLocalCache`): o check-in funciona com internet fraca.
  Ao sair, espera as gravações pendentes (até 4 s; se não der, avisa e não sai) e apaga o cache.
- `js/dados/fontes.js`: um ouvinte por coleção compartilhado entre as telas (`fonte`,
  `ouvirFontes`), parado ao sair.
- `js/lib/`: regras puras com testes. `js/ui/`: `dom.js` (`el`, `icone`; nunca innerHTML com
  dados), `componentes.js` (botões, janelas, avisos, campos, tabela que vira cartões no celular,
  indicadores), `marca.js` (logos, mascotes, fundo de impacto).
- Permissões em `js/lib/papeis.js` (`pode(pessoa, acao)`), iguais às regras.

## Firebase

Projeto `controle-pessoal-eb`: login com Google ativo; domínios autorizados incluem `localhost`
e `marketing-eletrica-bahiana.github.io`; Firestore com regras publicadas. A configuração web
fica em `js/config.js` (não é segredo; quem protege os dados são as regras).

## Dados no Firestore

Nomes exatos (as regras dependem deles):

- `usuarios/{email em minúsculas}`: `nome`, `cargo`, `papel` (`"admin"` | `"organizador"`),
  `ativo`. O app grava só esses quatro campos. Cadastro novo em transação ("Essa pessoa já está
  cadastrada.").
- `colaboradores/{id}`: `nome`, `setor` (nome do setor), `loja` (`"Salvador (Matriz)"`,
  `"Lauro de Freitas"` ou `"Aracaju"`; `LOJAS` em `js/config.js`), `cargo`, `lideranca`
  (`"Gerente"`, `"Coordenador"`, `"Supervisor"` ou `""`), `nascimentoDia` e `nascimentoMes` (números ou null; o
  ano nunca é guardado, LGPD), `admissao` (`"AAAA-MM-DD"` ou null), `paiOuMae` (`"Pai"`, `"Mãe"` ou `""`),
  `telefone` (só números com DDD, 10 ou 11), `email` (minúsculas), `desligamento` (`"AAAA-MM-DD"` ou null),
  `informacoesPessoais` (`{ pet, familia, sonhos, time, hobby }`, textos de até 300 letras), `ativo`, `criadoEm`,
  `atualizadoEm`. IDs automáticos. Cadastro antigo pode não ter `paiOuMae`, `telefone`, `email` e
  `informacoesPessoais`: o código trata como vazio e os campos aparecem quando a pessoa é salva.
- `setores/{id}`: `nome`, `gerentes`, `coordenadores` e `supervisores` (listas de IDs de
  colaboradores). Setor antigo pode não ter `coordenadores`: o código trata como lista vazia e o
  campo aparece quando alguém entra nele. ID tirado do nome sem acentos (`"recursos-humanos"`),
  para a importação nunca duplicar setor.
- `fornecedores/{id}`: `nome` (marca), `contatoNome`, `contatoEmail`, `contatoTelefone`
  (`"(71) 3333-4444"`), `ativo`, `criadoEm`, `pessoas` (lista de `{ id, nome, funcao, telefone, email }`; `funcao`
  é `"Palestrante"`, `"Representante"` ou `"Convidado"`; telefone só com números). Só o nome é obrigatório. Marca
  antiga não tem `pessoas`: o código trata como lista vazia.
- `eletricistas/{id}`: `nome`, `whatsapp` (só números com DDD, 10 ou 11), `vendedorId`,
  `vendedorNome`, `consentimentoLgpd`, `dataConsentimento`, `dataCadastro` (Timestamps), `ativo`.
- `listas/{id}`: `nome`, `tipo`, `data` (`"AAAA-MM-DD"`), `loja` (uma das lojas, `"Todas as lojas"` ou
  `"Outro local"`), `local`, `fornecedores` (IDs das marcas), `status` (`"aberta"` |
  `"encerrada"`), `criadoPor` (nome de quem criou), `criadoEm`.
- `listas/{id}/presencas/{id}`: `tipoPessoa` (`"colaborador"` | `"eletricista"` | `"fornecedor"` |
  `"convidado"`), `pessoaId` (vazio para fornecedor e convidado), `nome`, `detalhe` (setor e loja;
  "Vendedor: Nome"; nome da marca; "Convidado"), `fornecedorId`, `convocado`, `presente`,
  `horaCheckin`, `checkinPor` (nome de quem fez o check-in). Colaborador e eletricista usam o ID
  `colaborador_{id}` e `eletricista_{id}`: a mesma pessoa nunca entra duas vezes na lista.
- O app só grava os campos acima (as regras publicadas podem conferir os nomes).

## Colaboradores (Etapa 2)

Tela em `js/telas/colaboradores.js` (janelas em `js/telas/colaboradores/formularios.js`), regras em
`js/lib/colaboradores.js` e `js/lib/importacao.js` (com testes), gravação em
`js/dados/colaboradores.js`.

- Endereços: `#/colaboradores` (lista geral), `#/colaboradores/setores` (cartões),
  `#/colaboradores/setores/{id}` (setor aberto; `__sem-setor` para quem não tem setor) e
  `#/colaboradores/pais-e-maes`, `#/colaboradores/participacao`, `#/colaboradores/desligados` e
  `#/colaboradores/ficha/{id}`. Os filtros ficam
  guardados enquanto a pessoa navega.
- Lista: busca por nome; filtros setor, loja, liderança e situação (ativos por padrão).
- Setor do colaborador é texto; casa com `setores` pelo nome sem diferenciar maiúsculas e
  acentos. Setor novo é criado ao salvar ou importar.
- Hierarquia: Gerente > Coordenador > Supervisor, cada nível opcional. `NIVEIS_DE_LIDERANCA` em
  `js/lib/colaboradores.js` é a única lista dos níveis (valor, plural, campo no setor e ícone), na
  ordem hierárquica; formulário, filtro, janela de responsáveis, importação e exibição saem dela.
- Liderança e setores andam juntos: mudar liderança ou setor no cadastro inclui ou tira o ID das
  listas do setor (`ajustesDeLideranca`, só quando muda). Definir responsáveis no setor (qualquer
  colaborador ativo, de qualquer setor) acerta a liderança das pessoas envolvidas para o nível mais
  alto que ocupam (`liderancasAoDefinirResponsaveis`). Responsáveis desativados não aparecem.
- Exibição da liderança (`js/telas/colaboradores/lideranca.js`): cartões do setor, setor aberto e
  Dashboard, sempre na ordem hierárquica e sem o título de nível vazio. Setor sem ninguém não mostra
  o quadro nos cartões; o setor aberto avisa "Ninguém definido como responsável".
- Desligar em vez de apagar (janela com a data; ver "Desligar"). Só quem já está em Desligados pode ser excluído de
  vez (ver "Desligados, exclusão e ordem das tabelas"). Nome repetido não é aceito no cadastro.
- Importação (`js/ui/importador.js`, a mesma janela serve para eletricistas): arquivo, aba e
  linha dos títulos achados sozinhos; a pessoa confere a coluna de cada campo (com exemplos);
  prévia com novos, já existentes (mesmo nome sem acentos), repetidos, sem nome e avisos por linha.
  Quem já existe só recebe os campos preenchidos ("Atualizar quem já existe" pode ser desmarcado).
  Liderança reconhece Gerente, Coordenador/Coordenadora e Supervisor/Supervisora; "não" tira a
  liderança e a pessoa sai da lista do setor; célula vazia não muda nada. Mudar de nível ou de setor
  pela planilha também tira a pessoa da lista antiga.
  Datas do Excel chegam como número de série. Grava em lotes de 450.
  CSV: `lerTextoDoCsv` (`js/lib/importacao.js`) acerta os acentos do UTF-8, com ou sem BOM (Google Planilhas
  e "CSV UTF-8" do Excel), do ANSI do Windows (CSV comum do Excel) e do UTF-16 com BOM.
- "Substituir a lista atual pela planilha" (opção da prévia, só em colaboradores, desmarcada por padrão):
  quem está ativo e não está na planilha (`ausentes` de `prepararImportacao`) é desativado, nunca apagado,
  porque presenças, controles de aniversário, vendedores dos eletricistas e líderes dos setores guardam o ID.
  Quem está na planilha é atualizado (mesmo com "Atualizar quem já existe" desmarcado) e volta a ficar ativo.
  A prévia lista quem sai (até 30 nomes) e quem volta (`avisosDaSubstituicao`), avisa em vermelho se mais da
  metade dos ativos sairia, e há confirmação antes de gravar (`confirmar` na config do importador). Planilha sem
  nenhum nome não desativa ninguém. Não há "excluir todos": um nome corrigido vira cadastro novo e o antigo fica
  desativado com o histórico dele.
- "Baixar lista" exporta o que está filtrado na tela (`Colaboradores [setor] [loja] DD-MM-AAAA.xlsx`),
  com colunas que voltam certinho na importação (menos "Pai ou mãe", que só vem da lista oficial).
- SheetJS só grava a planilha (sem cor no cabeçalho: a versão gratuita não pinta células).

## Fornecedores e eletricistas (Etapa 3)

- Fornecedores (`js/telas/fornecedores.js`, regras em `js/lib/fornecedores.js`): cartões com busca e
  situação; ficha `#/fornecedores/{id}` com contato, "Pessoas da marca" (ver "Pessoas da marca") e o bloco
  "Participações". Marca repetida (sem diferenciar acentos) não é aceita.
- Eletricistas (`js/telas/eletricistas.js`, janelas em `js/telas/eletricistas/formulario.js`,
  regras em `js/lib/eletricistas.js`): busca por nome, filtro por vendedor (pelo nome gravado) e
  situação; ficha `#/eletricistas/{id}`; "Baixar lista" com colunas que voltam na importação.
- WhatsApp aceito com ou sem máscara, +55 ou 0 na frente; guardado só com números; exibido como
  `(71) 99999-9999`; botão abre `https://wa.me/55...`. WhatsApp repetido em outro cadastro não
  é aceito.
- LGPD: caixa "O eletricista autorizou o uso dos dados para contato da Elétrica Bahiana (LGPD)".
  Desmarcada, o campo do WhatsApp fica desligado e nada é salvo; tirar a autorização de quem já
  tinha apaga o WhatsApp e a `dataConsentimento`.
- Vendedor: campo com sugestões (`js/ui/escolherPessoa.js`) entre colaboradores ativos, os do
  setor comercial primeiro (`ehSetorComercial`: nome do setor com "comercial" ou "venda").
- Admin e organizador cadastram; só admin edita, desativa e importa. O cadastro devolve o ID na
  hora e espera o servidor por até 3,5 s: sem internet, fica no aparelho e sobe depois (para o
  check-in).
- Importação: vendedor achado pelo nome (igual, ou um só colaborador com todas as palavras); sem
  achar, o nome fica só como texto. WhatsApp só entra com "Autorizou LGPD" = Sim na linha ou com a
  caixa "Todos os eletricistas desta planilha autorizaram"; a planilha nunca retira autorização.

## Listas (Etapa 4)

Tela em `js/telas/listas.js` (visão geral e página da lista) com as partes em `js/telas/listas/`
(`checkin.js`, `convocados.js`, `resumo.js`, `formulario.js`, `historico.js`); regras em
`js/lib/listas.js` (com testes); gravação em `js/dados/listas.js`.

- Endereços: `#/listas`, `#/listas/{id}` (abre no check-in se aberta, no resumo se encerrada),
  `#/listas/{id}/checkin`, `/convocados` e `/resumo`.
- Tipos: Treinamento CAE, Treinamento Comercial, Evento, Ação de Endomarketing, Outro (os dois de
  aniversário entram na Etapa 5). "Outro local" pede o local.
- Loja da lista (`LOCAIS` em `js/lib/listas.js`): as três lojas, "Todas as lojas" (`TODAS_AS_LOJAS`, Etapa 15, a pedido,
  para ações e eventos das três lojas juntas; o local continua opcional) e "Outro local". As regras do Firestore não
  conferem esse campo. "Loja inteira" em Convocados também tem "Todas as lojas", que traz todos os colaboradores
  ativos, até quem está sem loja (`ehDaLoja`).
- "Adicionar colaboradores" tem quatro modos: Um a um, Setor inteiro, Loja inteira e Pais e mães (Etapa 16, a pedido:
  "puxar a lista de pais e mães"). Os três por grupo saem de `GRUPOS` em `js/telas/listas/convocados.js` (rótulo,
  opções, ajuda e texto de vazio) e de `colaboradoresDoGrupo` (`js/lib/listas.js`, com teste). Pais e mães: "Pais e
  mães" (`PAIS_E_MAES`, os dois), "Só os pais" ou "Só as mães", pelo `paiOuMae` do cadastro, só ativos, como em
  Colaboradores > Pais e mães. No celular os quatro botões ficam em duas linhas.
- "Importar planilha" em Convocados (Etapa 19, só admin): `abrirPlanilhaNaLista` (`js/telas/listas/planilha.js`) usa o
  mesmo `abrirImportador` dos colaboradores, que ganhou `indicadores`, `situacoes`, `textoDoBotao` e `textoDoFim`
  opcionais. Colunas (`CAMPOS_DA_PLANILHA_DA_LISTA`): Nome (obrigatória), "Participou?" (Sim/X/1/Presente, Não/Faltou,
  Outros; `lerParticipou`) e Observação. Regras em `js/lib/planilhaDaLista.js` (com testes):
  `acharPessoaDaPlanilha` (nome igual em colaborador ativo, desligado, eletricista ativo ou desativado; senão um só
  colaborador ou eletricista ativo com todas as palavras, com aviso "Nome parecido"), `prepararPlanilhaDaLista`
  (situações novo, existente, naoEncontrado, repetido, ignorado), `operacoesDaPlanilhaDaLista` (gravadas em lote por
  `importarPlanilhaNaLista`). Todo mundo entra como convocado; "Participou" grava `presente: true` sem hora (a planilha
  não diz) e `checkinPor` = quem importou. Quem já está na lista só muda no que a planilha disser (vazio não apaga).
  Opções: "Quem está na planilha participou" (marcada quando a data da lista já passou) e "Incluir quem não está no
  cadastro como convidado" (desmarcada; senão a linha fica de fora como "Não achado").
- Admin cria, edita, encerra, reabre e exclui (apaga as presenças junto, com confirmação). Nova
  lista abre direto em Convocados.
- Convocados (admin): colaboradores um a um, setor inteiro ou loja inteira (só ativos e quem ainda
  não está); eletricistas (busca, filtro por vendedor, "Marcar todos os mostrados"); pessoa de
  fornecedor (marca + nome, várias seguidas). A marca entra sozinha em `fornecedores` da lista.
- Check-in (admin e organizador, celular): busca grande, filtros Todos/Faltam/Presentes, contador
  "presentes / convocados" (convocados presentes sobre convocados) e "+ N não convocados", barra
  presa no topo (abaixo do cabeçalho, medido em `--altura-cabecalho`). Botão grande; "Desfazer".
  Ao vivo por `onSnapshot`; não espera o servidor (cache do aparelho) e mostra "Enviando..."
  enquanto há gravação pendente. Após check-in pela busca, a busca é limpa. Lista encerrada não
  aceita check-in (tela e regras).
- Situação no check-in (Etapa 18): o nome vira botão (com lápis) e abre `abrirSituacao` (`js/telas/listas/checkin.js`):
  Participou, Não participou, Outros ou Sem marcação (`SITUACOES_DO_CHECKIN`) e observação até 300 letras. Grava em
  `status` ("participou", "nao_participou", "outros" ou "") e `observacao`, com `marcarSituacao`
  (`js/dados/listas.js`, `mudancaDeSituacao`: Participou = check-in, mantém a hora de quem já tinha; as outras tiram o
  check-in). O botão Check-in e o Desfazer também gravam `status`. `situacaoNoCheckin`: o check-in vale mais que o
  status. As regras já deixavam o organizador mudar `status` e `observacao` na lista aberta; na encerrada, só o admin
  abre o nome (`gerenciarListas`). Lista encerrada sem marcação mostra "Não participou" (era "Não veio").
- Onde aparece: etiqueta e observação na linha do check-in; Resumo (Ausentes com Situação e, se houver, Observação; as
  marcas dizem "(não participou)"); ficha da pessoa (`resultadoNaLista` devolve "Não participou" ou "Outros", com a
  observação embaixo); "Baixar lista completa" ganhou as colunas Situação e Observação (no fim; "Baixar presentes"
  não muda, por causa do sorteador). "Outros" não é falta: `contaComoFalta` (ranking da Participação), "Do setor
  comercial, faltou" do Resumo e do Dashboard. Os presentes continuam contados por `presente`.
- "Adicionar participante não convocado": colaborador ou eletricista cadastrado (quem já está na
  lista só recebe o check-in), eletricista novo (formulário com LGPD) ou convidado só com o nome.
  Entra com `convocado: false` e já presente.
- Resumo: convocados, convocados presentes (com %), ausentes, não convocados que vieram, pessoas
  enviadas por marca. Treinamento Comercial destaca quem do setor comercial (setor atual do
  cadastro) foi convocado e faltou.
- Planilhas (admin e organizador): "Baixar presentes" (Nome, Tipo, Detalhe, Hora do check-in; a
  primeira coluna é Nome para o sorteador) e "Baixar lista completa" (mais Convocado, Presente e
  quem fez o check-in). Nome: `[lista] DD-MM-AAAA presentes.xlsx` / `... completa.xlsx`.
- Histórico nas fichas de colaborador e eletricista: consulta em grupo de `presencas` por
  `pessoaId` (índice em `firestore.indexes.json`, passo a passo no README); sem o índice, lê lista
  por lista pelo ID previsível. Resultado: Compareceu, Faltou, Veio sem convite, Ainda não chegou.
- Participações na ficha da marca: listas com a marca em `fornecedores` e quem ela enviou (consulta
  por `fornecedorId` em cada lista).

## Aniversariantes (Etapa 5)

Telas em `js/telas/aniversariantes.js` (mês) e `js/telas/aniversariantes/` (`controle.js`,
`historico.js`, `comum.js`); regras em `js/lib/aniversariantes.js` (com testes); gravação em
`js/dados/aniversariantes.js`.

- Endereços: `#/aniversariantes` (mês escolhido, abre no mês atual, guardado ao navegar),
  `#/aniversariantes/historico` e `#/aniversariantes/controle/{id}`. Uma lista de aniversário
  aberta pela aba Listas vai direto para a tela de status (nunca para o check-in comum).
- Do mês: colaboradores ativos com `nascimentoMes` do mês, por dia. De empresa: ativos com mês de
  admissão igual e pelo menos um ano de casa no ano escolhido (mostra "N anos"). Quem faz hoje
  ganha a faixa "Hoje tem festa!" e a etiqueta "Hoje!".
- Controle do mês (só admin gera): lista em `listas` com ID previsível
  `aniversariantes-AAAA-MM` ou `aniversario-empresa-AAAA-MM`, nome "Aniversariantes de
  Novembro/2026" ou "Aniversário de empresa de Novembro/2026", `data` no dia 1, `loja` vazia.
  Gerado em transação: não gera duas vezes. Todos entram como convocados com `status:
  "pendente"` e `observacao: ""`. Quem virou aniversariante depois (cadastro novo) entra pelo botão
  "Incluir que faltam".
- Status (admin e organizador, lista aberta): Pendente, Participou, Não participou. `presente`
  acompanha "Participou"; `horaCheckin` e `checkinPor` guardam quando e quem marcou. Observação até
  300 letras, salva ao sair do campo; o texto em edição não é apagado por mudanças que chegam.
- Histórico: por colaborador, os meses com o status (chips) e as observações, filtros de ano e tipo, e os rankings
  dos 10 que mais ficaram com "Participou" e com "Não participou", com as observações (ver "Participação").
- Planilha do mês (`Aniversariantes Mês-AAAA.xlsx`): abas "Aniversariantes" e "Aniversário de
  empresa" com o status do controle ("Controle não gerado" quando não existe). O controle também
  tem "Baixar planilha" própria.

## Pais e mães e Ramal (Etapa 7)

- Pais e mães: `#/colaboradores/pais-e-maes`, terceira parte da aba Colaboradores (`desenharPaisEMaes` em
  `js/telas/colaboradores.js`; regras em `filtrarPaisEMaes` e `PAI_OU_MAE`, `js/lib/colaboradores.js`). Só
  ativos com `paiOuMae` preenchido. Indicadores (total, pais, mães), busca e filtros de pai ou mãe, setor e
  loja, guardados ao navegar. "Baixar lista" exporta o que está filtrado na tela.
- Contatos (`js/telas/colaboradores/contatos.js`): celular abre o WhatsApp, fixo abre a ligação, e-mail abre
  o `mailto:`. Aparecem em Pais e mães e na ficha. Quem tem acesso ao app vê; só o admin edita (as regras de
  `colaboradores` já cobrem, sem mudança no `firestore.rules`). Não há caixa de autorização LGPD para
  colaboradores, ao contrário dos eletricistas.
- Telefone, WhatsApp e e-mail ficam em `js/lib/contato.js`; `js/lib/eletricistas.js` e `js/lib/usuarios.js`
  reexportam o que outros arquivos já importavam deles.
- Planilha: colunas `Telefone` e `E-mail`; célula vazia não muda nada. A importação não tem mais a linha
  "Pai ou mãe" (tirada em 06/11/2026 a pedido): pai ou mãe vem só da lista oficial ou do cadastro.
- Lista oficial da empresa (aba "Lista Geral"): não tem `Pai ou mãe`, tem `Tem Filhos` (Sim ou Não) e `Gênero`.
  Sim + Masculino = Pai; Sim + Feminino = Mãe; Não tira a marcação; Sim sem gênero reconhecido gera aviso e a
  pessoa é marcada no cadastro. `Gênero` e `Tem Filhos` só servem
  para esse cálculo e não são guardados. Conferido em 04/11/2026 com a lista real, sem gravar: o cálculo bate com
  as abas "Pais" e "Mães" da própria lista (`normalizarTemFilhos`, `paiOuMaeDoGenero`).
- Na lista oficial, `Telefone` cai em "Celular" e `E-mail` em "Email Pessoal", a primeira coluna de e-mail; a
  pessoa pode trocar por "Email Corporativo" na tela das colunas. "Telefone de Emergência" não é importado.
- Prévia da importação (`js/ui/importador.js`): colunas sem nenhum dado ficam de fora, e os avisos ficam junto do
  nome, para continuarem à vista nas planilhas com muitas colunas.
- Ramal: `#/ramal` (`js/telas/ramal.js`), aba do menu para todos os papéis, por enquanto só com a tela vazia.
  Quando a lista chegar, definir os campos pelas colunas dela e criar a coleção e a regra no Firestore.

## Desligados, exclusão e ordem das tabelas (Etapa 8)

- Desligados: `#/colaboradores/desligados`, quarta parte da aba Colaboradores (`desenharDesligados`). Mostra quem
  está desativado (`filtrarDesligados`), com a data de desligamento, os mais recentes primeiro e sem data no fim.
  Busca por nome e "Baixar lista" (`CABECALHO_DOS_DESLIGADOS`, volta na importação dos desligados).
- "Importar desligados" (`abrirImportacaoDesligados`): aba "Desligados" da lista oficial (Nome e Data de
  Desligamento), já escolhida sozinha (`aba` na config do importador). Quem está no cadastro é desativado e recebe a
  data (data vazia não apaga a que existe); quem não está entra só com nome e data, já desativado, para a lista
  ficar completa (`prepararDesligados`, `operacoesDosDesligados`). Quem está ativo e aparece lá ganha um aviso.
- Reativar (manual ou pela substituição da lista) apaga `desligamento`. A ficha de quem está desativado mostra o
  desligamento e volta para Desligados.
- Excluir de vez (`excluirColaborador`, `operacoesDaExclusao`): só para desativados (lixeira na tabela e botão na
  ficha), com confirmação. Apaga o documento, tira o ID das lideranças dos setores e limpa `vendedorId` dos
  eletricistas (o `vendedorNome` fica como texto). Presenças e controles de aniversário guardam o nome e não mudam;
  a ficha e o histórico da pessoa somem. As regras de `colaboradores` (admin grava) já permitem.
- Setinhas de ordem em todas as tabelas (`tabela` em `js/ui/componentes.js`): o título de cada coluna vira um
  botão (crescente, depois decrescente); no celular, onde o cabeçalho some, aparece "Ordenar por". A lista inteira
  é ordenada antes de mostrar os primeiros (`limite` no lugar de `listaComLimite` em volta da tabela). O valor é o
  texto da célula (datas DD/MM/AAAA viram AAAA-MM-DD; números em ordem numérica; vazios no fim) ou `ordem(item)`;
  `ordenavel: false` e a coluna de Ações ficam sem setas. A escolha fica guardada por tela e colunas enquanto a
  pessoa navega. Telas em cartões (Fornecedores, Listas) mantêm a ordem própria.
- Aniversariantes: coluna Contato (`contatosDoColaborador`) nas tabelas do mês; a planilha do mês ganhou Telefone e
  E-mail.

## Desligar (Etapa 9)

A pessoa reclamou que só havia "Desativar" e não via como mandar alguém para Desligados. Para colaboradores, a
palavra na tela é sempre **Desligar/Desligado** (no banco continua `ativo: false` + `desligamento`). Eletricistas,
fornecedores e usuários continuam com "Desativar".

- `abrirDesligamento` (`js/telas/colaboradores/formularios.js`): janela com a data (hoje de início, máscara
  DD/MM/AAAA), validada por `validarDesligamento` (`js/lib/colaboradores.js`, com testes): obrigatória, sem data no
  futuro e nunca antes da admissão. Grava com `desligarColaborador(id, data)` (`ativo: false` + `desligamento`);
  `reativarColaborador` volta `ativo: true` e apaga a data. Não há mais `definirAtivoColaborador`.
- Três entradas: ícone `user-x` "Desligar" na linha (lista, setor), botão "Desligar" na ficha e "Desligar
  colaborador" no topo de Desligados (sem colaborador: escolhe a pessoa entre os ativos com `campoEscolherPessoa`).
- Em quem já está em Desligados, a mesma janela vira "Data de desligamento" (ícone `calendar` na linha, botão na
  ficha) para corrigir ou informar a data (quem foi pela substituição da lista fica sem data).
- Etiqueta "Desligado", filtro Situação "Desligados", coluna Situação da planilha "Desligado" e os avisos da
  substituição da lista e da importação de desligados falam em "vai para Desligados".

## Pessoas da marca (Etapa 10)

Pedido: na ficha do fornecedor, adicionar palestrante, representante ou convidado da marca.

- Guardadas no próprio documento da marca (campo `pessoas`), não em subcoleção: as regras de `fornecedores`
  (admin grava) já cobrem, sem mudar `firestore.rules`, e as pessoas chegam junto com o ouvinte de `fornecedores`.
- Regras em `js/lib/fornecedores.js` (com testes): `FUNCOES_DO_FORNECEDOR` (ordem da tela), `pessoasDoFornecedor`
  (por função e nome), `validarPessoaDoFornecedor` (nome e função obrigatórios, nome sem repetir na marca, telefone e
  e-mail opcionais como nos colaboradores), `pessoasComAlteracao`, `pessoasSem`, `novoIdDePessoa`.
- Gravação em `js/dados/fornecedores.js` (`salvarPessoaDoFornecedor`, `tirarPessoaDoFornecedor`), em transação:
  lê a lista atual da marca e grava a lista nova, para duas pessoas não apagarem o que a outra fez.
- Tela em `js/telas/fornecedores/pessoas.js`: bloco "Pessoas da marca" (tabela com Nome, Função, Contatos de
  `contatosDoColaborador` e, para admin, editar e tirar com confirmação) e a janela de cadastro. Organizador só vê.
- Listas (`abrirFornecedor` em `js/telas/listas/convocados.js`): o nome é um `campoEscolherPessoa` com as pessoas da
  marca escolhida (`semResultado: null`: sem sugestão, a lista não abre e o nome novo é aceito); escolher alguém
  preenche a função (`aoEscolher`). Função obrigatória. Nome novo mostra a caixa "Guardar também na ficha da marca"
  (marcada). A mesma pessoa da mesma marca não entra duas vezes (`fornecedorJaNaLista`).
- Presença de fornecedor: `detalhe` vira `"Marca · Função"` (`presencaDeFornecedor(nome, fornecedor, funcao)`);
  presenças antigas têm só a marca. `marcaDaPresenca`, `funcaoDaPresenca` e `nomeComFuncao` (`js/lib/listas.js`) leem
  o detalhe; o resumo agrupa pela marca e mostra "Nome (Função)", assim como "Quem a marca enviou" na ficha.

## Informações Pessoais (Etapa 12)

Pedido: na ficha do colaborador, um quadro "Informações Pessoais" ligado à participação nas ações internas, com os
espaços Pet, Família, Sonhos, Time e Hobby (nomes e ordem como a pessoa pediu).

- Campo `informacoesPessoais` no próprio documento do colaborador: as regras de `colaboradores` (admin grava) já
  cobrem, sem mudar `firestore.rules`. Gravado sozinho (`salvarInformacoesPessoais` em `js/dados/colaboradores.js`),
  então o formulário "Editar" do cadastro e a importação nunca apagam as respostas.
- Regras em `js/lib/colaboradores.js` (com testes): `INFORMACOES_PESSOAIS` (campo, rótulo e exemplo, na ordem da
  tela; é a única lista dos espaços), `LIMITE_DA_INFORMACAO_PESSOAL` (300), `informacoesPessoaisDe`,
  `temInformacoesPessoais`, `validarInformacoesPessoais` (todas opcionais; limpa espaços e mantém as quebras de linha).
- Tela em `js/telas/colaboradores/informacoes.js`: bloco logo abaixo de "Dados" na ficha (ícone `star`), com
  "Preencher" (vazio) ou "Editar" só para admin, e a janela com cinco caixas de texto. Organizador só vê. A
  classe `bloco--informacoes-pessoais` mostra as quebras de linha.
- Não entram na planilha "Baixar lista" nem na importação (não foi pedido).

## Participação (Etapa 13)

Pedido: uma aba em Colaboradores com o ranking de quem participou das listas que são ações, outra lista de quem mais
participou dos aniversariantes, e a observação na lista. "Ações" foi lido como o tipo "Ação de Endomarketing" (o
filtro troca o tipo); a observação é a dos controles de aniversariantes (as outras listas não têm observação).

- `#/colaboradores/participacao`, quinta parte da aba Colaboradores, antes de Desligados (ícone `trophy`). Montada uma
  vez por `montarParticipacao` (`js/telas/colaboradores/participacao.js`), que ouve `fonte('listas')` e recebe os
  colaboradores novos pela função `colaboradores` (a busca não perde o foco). Filtros guardados ao navegar: busca, tipo
  (`TIPO_PADRAO` "Ação de Endomarketing") e ano (vazio = todos).
- Leitura: presenças com `tipoPessoa == "colaborador"` de cada lista escolhida (`lerPresencas` com filtro) e os
  controles de aniversário do ano (`lerControles`). Só relê quando mudam os IDs das listas escolhidas; check-ins novos
  aparecem ao reabrir a tela.
- Regras em `js/lib/participacao.js` (com testes): `TIPOS_DA_PARTICIPACAO` (rótulo e frases de cada tipo; vazio = todas
  as listas), `listasDaParticipacao` (tipo por `ehDoTipo`, ano e data até hoje; as ações e "todas" trazem os controles
  de aniversariantes, Etapa 17), `controlesDaParticipacao`, `anosDasListas`,
  `rankingDeParticipacao` (por colaborador ativo: participou = check-in, convocado ou não; convocado; faltou = convocado
  sem check-in, e no controle só "Não participou", nunca "Pendente"; última participação; ordem: participou, menos
  faltas, nome), `aniversariosDosAtivos`, e as planilhas
  (`CABECALHO_DA_PARTICIPACAO`, `linhasDaParticipacao`, `CABECALHO_DOS_ANIVERSARIOS`, `linhasDosAniversarios`).
- Só colaboradores ativos nos dois rankings da Participação (desligados e cadastros apagados ficam de fora). Em
  Aniversariantes > Histórico os rankings continuam com todo mundo dos controles.
- `historicoDosAniversarios` devolve também `participaram` (mais "Participou", depois menos "Não participou", nome);
  `observacoesDaPessoa` (`js/lib/aniversariantes.js`) dá `[{ rotulo: "Nov/2026" ou "Nov/2026 (empresa)", texto }]`.
- Tabela dos rankings de aniversário em `js/telas/aniversariantes/comum.js` (`tabelaDoRankingDeAniversarios`,
  `listaDeObservacoes`, `linkDaPessoa`), usada no Histórico e na Participação. A posição vem do ranking inteiro, então
  a busca não muda a posição. Classe `observacoes` no CSS.
- "Baixar planilha" (quem pode `baixarListas`): abas com o tipo escolhido e "Aniversariantes" (observações juntas com
  " | ").

## Papéis

- `admin`: cadastra, edita e apaga tudo e gerencia usuários.
- `organizador`: vê tudo, faz check-in, cadastra eletricista novo e baixa listas.
- Sem cadastro, desativado ou com papel inválido: "Seu acesso ainda não foi liberado. Fale com a
  equipe de Marketing." e botão Sair. E-mail fora do domínio sai na hora, com aviso no login.
- O admin não desativa o próprio acesso nem muda o próprio papel (tela e regras).

## Identidade visual (Endomarketing EB #EnergiaBahiana 2026)

Mesma do Controle_Atividades, com variáveis no topo de `css/estilos.css`:

- Só 7 cores: `#001780` marinho, `#0037ff` brilhante, `#4069ff` médio, `#d4121a` vermelho,
  `#a92a2e` vermelho escuro, `#ffffff`, `#000000`. Tons claros só como transparência delas.
  Proibido amarelo, laranja, cinza, verde, roxo ou outros azuis.
- Gradientes principal, vermelho e premium. Lato (local, `EB Lato`) em tudo; Klavika em títulos e
  números grandes, com Lato Black de alternativa até os arquivos `.otf` chegarem em `fontes/`.
- Logos em `marca/logos/` (no par azul os nomes dos arquivos estão trocados; `js/ui/marca.js`
  escolhe pelo formato real). Nunca recriar o logo em texto nem mudar cor, sombra ou rotação.
- Mascotes só no login, em telas vazias e em boas-vindas; nunca no Dashboard.
- Hashtag `#EnergiaBahiana` em Lato Black e "Mais forte por você!" no rodapé.
- Tabelas com cabeçalho marinho e linhas alternadas em médio a 10%; no celular viram cartões.
- Variável CSS com `url(...)` precisa de endereço completo (ver `fundoMarca`), senão o navegador
  procura a imagem dentro de `css/`.

## Dashboard (Etapa 6)

Tela inicial depois do login: `js/telas/dashboard.js`; cálculos em `js/lib/dashboard.js` (com
testes); consultas em `js/dados/dashboard.js`; gráficos em `js/ui/grafico.js` (Chart.js por CDN,
carregado só aqui, só cores da paleta, sem animação com `prefers-reduced-motion`).

- Números gerais: colaboradores ativos (total e por loja), eletricistas ativos (contagem no
  banco), fornecedores ativos, listas realizadas no ano (até hoje, sem controles de aniversário).
- Listas abertas e próximas (as futuras primeiro) com atalho para o check-in.
- Aniversariantes do mês atual (nascimento e tempo de casa), hoje em destaque, e quantos "Pendente"
  faltam em cada controle do mês.
- Setores: cartão com a liderança em ordem hierárquica e o total; abre
  `#/colaboradores/setores/{id}`.
- Filtro de período (mês ou ano inteiro + ano), guardado ao navegar, vale para:
  - Fornecedores: marcas ativas, quantas participaram e ranking (barras deitadas, 10 primeiras).
  - CAE: eletricistas, presença média (média das taxas dos treinamentos com convocados), média de
    presentes, gráfico convocados x presentes dos 8 últimos e tabela.
  - Treinamentos do Comercial: presença média, faltas do comercial (soma), gráfico da taxa e tabela
    com quantos do comercial faltaram em cada um.
  - Endomarketing e eventos (Etapa 14, a pedido: "só tem CAE, Treinamento de Fornecedor e Comercial"): bloco largo
    abaixo de CAE e Comercial com as ações de endomarketing (com os controles de aniversariantes, Etapa 17) e os
    eventos (`ehDoEndomarketing`; o pedido falou em "Eventos do Endomarketing", e Evento não aparecia em lugar nenhum
    do Dashboard). As listas saem de `listasDoPeriodo(..., { comAniversarios: true })`, e os controles entram na chave
    do período. Indicadores: ações (quantas de aniversariantes) e eventos, participantes (soma dos presentes,
    convocados ou não, e a média por lista) e presença média dos convocados (no controle: "Participou" sobre todos os
    aniversariantes, pendentes inclusive). Gráfico convocados x participantes das 8 últimas e tabela com tipo
    (Endomarketing, Aniversariantes, Tempo de casa ou Evento), data, participantes, presentes/convocados e presença; o
    nome do controle abre `#/aniversariantes/controle/{id}`. Contagens de `contagensDaLista`; resumo em
    `resumoDoEndomarketing` (`js/lib/dashboard.js`, com teste). Atalho "Quem mais participou" para a Participação.
- Só entram listas que já aconteceram (data até hoje).

## Revisão (Etapa 6)

- Navegação: todas as rotas abrem; endereço desconhecido ou sem permissão volta ao Dashboard;
  registro inexistente mostra "não encontrado" com link de volta; `404.html` cobre endereço sem `#`.
- Permissões da tela iguais às regras: organizador só vê Baixar lista/planilha, Novo eletricista,
  check-in, adicionar não convocado e marcar status de aniversariantes.
- Erros: tudo passa por `mensagemDeErro` (`js/lib/erros.js`), em português.
- Cores e textos: só as 7 cores da paleta (conferido por busca de `#...` e `rgba(...)`), sem
  travessão. Ícones: só os usados (62).
- Desempenho das consultas:
  - Coleções pequenas (`colaboradores`, `setores`, `fornecedores`, `listas`) têm um ouvinte só,
    compartilhado entre as telas (`js/dados/fontes.js`); `eletricistas` só nas telas que precisam.
  - Presenças: só a lista aberta na tela fica ouvindo. Histórico da pessoa por consulta em grupo
    (com índice); participações da marca só nas listas da marca.
  - Dashboard por contagens no banco (`getCountFromServer`), guardadas para listas encerradas;
    faltas do comercial leem só os ausentes de cada Treinamento Comercial.
  - Cache do aparelho (Firestore) deixa reabrir as telas rápido e o check-in funcionar sem
    internet.

## Demonstração local (fora do repositório)

`.claude/demo/` (ignorada pelo git): `servidor.mjs` serve a pasta em `http://localhost:5181/` e
`/demo.html`, que é o `index.html` com `js/dados/banco.js` trocado (pelo import map) por
`banco-demo.js`, um banco de mentira no `localStorage` com dados de `semente.js`. Papel pela URL:
`/demo.html?papel=admin|organizador`; `?vazio` começa sem pais e mães; `?zerar` volta à semente. Nunca
grava no Firestore real. Como a pasta é ignorada, ela não vem junto ao clonar o repositório e não passa de um
computador para o outro pelo `git pull` (vai só quando a pasta é copiada). Ela fica fora porque `banco-demo.js` usa
um e-mail fictício no domínio da empresa. Se ela faltar neste computador, avisar a pessoa e conferir só com `npm test`.
Se a semente mudar aqui, a do outro computador continua a antiga, o que não atrapalha: é só para testar.

## Notas técnicas

- Login com `signInWithPopup`; se o popup não funcionar (navegador bloqueia ou celular), cai no
  `signInWithRedirect`. O redirecionamento pode falhar em navegadores que bloqueiam cookies de
  terceiros, porque o site está no GitHub Pages e o login no domínio do Firebase.
- Testes de tela feitos na demonstração local; o login real e as regras publicadas só podem ser
  conferidos com uma conta de verdade.

## Pendências

- Regras: o pedido da Etapa 1 não trouxe o texto publicado no console. `firestore.rules` foi
  escrito a partir das permissões combinadas e cobre tudo o que o app grava (inclusive `status` e
  `observacao` nas presenças, presença criada pelo organizador com `convocado: false`, leitura em
  grupo de `presencas`). Em 31/10/2026 a pessoa decidiu publicar este arquivo no console no lugar
  das regras antigas; falta ela confirmar que publicou.
- Índice de `pessoaId` para grupos de coleção (README); sem ele, o histórico lê lista por lista.
- Lista de ramais: a aba está vazia até a lista chegar (ver "Pais e mães e Ramal").
- Arquivos da Klavika em `fontes/` quando chegarem.
