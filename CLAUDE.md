# Controle Pessoal | Elétrica Bahiana (EB)

App interno com colaboradores (inclusive pais e mães, com contatos), setores, aniversariantes,
fornecedores, eletricistas do CAE, listas de presença com check-in pelo celular e ramais. Explicação para quem usa no `README.md`.

- Repositório (público): https://github.com/Marketing-Eletrica-Bahiana/Controle_Pessoal
- Endereço publicado: https://marketing-eletrica-bahiana.github.io/Controle_Pessoal/
- Referência só para login com Google, organização do Firebase e identidade visual:
  Controle_Atividades (https://github.com/Marketing-Eletrica-Bahiana/Controle_Atividades).
  Não copiar funcionalidades dele nem usar outro projeto como referência.

## Como trabalhar neste projeto

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
  `telefone` (só números com DDD, 10 ou 11), `email` (minúsculas), `desligamento` (`"AAAA-MM-DD"` ou null), `ativo`, `criadoEm`,
  `atualizadoEm`. IDs automáticos. Cadastro antigo pode não ter `paiOuMae`, `telefone` e `email`: o
  código trata como vazio e os campos aparecem quando a pessoa é salva.
- `setores/{id}`: `nome`, `gerentes`, `coordenadores` e `supervisores` (listas de IDs de
  colaboradores). Setor antigo pode não ter `coordenadores`: o código trata como lista vazia e o
  campo aparece quando alguém entra nele. ID tirado do nome sem acentos (`"recursos-humanos"`),
  para a importação nunca duplicar setor.
- `fornecedores/{id}`: `nome` (marca), `contatoNome`, `contatoEmail`, `contatoTelefone`
  (`"(71) 3333-4444"`), `ativo`, `criadoEm`. Só o nome é obrigatório.
- `eletricistas/{id}`: `nome`, `whatsapp` (só números com DDD, 10 ou 11), `vendedorId`,
  `vendedorNome`, `consentimentoLgpd`, `dataConsentimento`, `dataCadastro` (Timestamps), `ativo`.
- `listas/{id}`: `nome`, `tipo`, `data` (`"AAAA-MM-DD"`), `loja` (uma das lojas ou
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
  `#/colaboradores/pais-e-maes`, `#/colaboradores/desligados` e `#/colaboradores/ficha/{id}`. Os filtros ficam
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
- Desativar em vez de apagar (confirmação). Só quem já está desativado pode ser excluído de vez (ver "Desligados,
  exclusão e ordem das tabelas"). Nome repetido não é aceito no cadastro.
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
  situação; ficha `#/fornecedores/{id}` com contato e o bloco "Participações". Marca repetida (sem
  diferenciar acentos) não é aceita. Pessoas enviadas pelas marcas ficam só dentro das listas.
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
- Histórico: por colaborador, os meses com o status (chips), filtros de ano e tipo, e o ranking dos
  10 que mais ficaram com "Não participou".
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
grava no Firestore real. Como a pasta é ignorada, ela não vem junto ao clonar o repositório.

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
