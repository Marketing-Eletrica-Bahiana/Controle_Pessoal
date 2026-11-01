# Controle Pessoal | Elétrica Bahiana (EB)

App interno com colaboradores, setores, aniversariantes, fornecedores, eletricistas do CAE e
listas de presença com check-in pelo celular. Explicação para quem usa no `README.md`.

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
3. Fornecedores e Eletricistas do CAE.
4. Listas de presença e check-in.
5. Aniversariantes.
6. Dashboard e revisão geral.

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
  (`"Gerente"`, `"Supervisor"` ou `""`), `nascimentoDia` e `nascimentoMes` (números ou null; o
  ano nunca é guardado, LGPD), `admissao` (`"AAAA-MM-DD"` ou null), `ativo`, `criadoEm`,
  `atualizadoEm`. IDs automáticos.
- `setores/{id}`: `nome`, `gerentes` e `supervisores` (listas de IDs de colaboradores). ID tirado
  do nome sem acentos (`"recursos-humanos"`), para a importação nunca duplicar setor.
- `fornecedores/{id}`, `eletricistas/{id}`, `listas/{id}` com a subcoleção `presencas/{id}`
  (campos definidos nas próximas etapas).
- O app só grava os campos acima (as regras publicadas podem conferir os nomes).

## Colaboradores (Etapa 2)

Tela em `js/telas/colaboradores.js` (janelas em `js/telas/colaboradores/formularios.js`), regras em
`js/lib/colaboradores.js` e `js/lib/importacao.js` (com testes), gravação em
`js/dados/colaboradores.js`.

- Endereços: `#/colaboradores` (lista geral), `#/colaboradores/setores` (cartões),
  `#/colaboradores/setores/{id}` (setor aberto; `__sem-setor` para quem não tem setor) e
  `#/colaboradores/ficha/{id}`. Os filtros ficam guardados enquanto a pessoa navega.
- Lista: busca por nome; filtros setor, loja, liderança e situação (ativos por padrão).
- Setor do colaborador é texto; casa com `setores` pelo nome sem diferenciar maiúsculas e
  acentos. Setor novo é criado ao salvar ou importar.
- Liderança e setores andam juntos: mudar liderança ou setor no cadastro inclui ou tira o ID das
  listas do setor (`ajustesDeLideranca`, só quando muda). Definir responsáveis no setor (qualquer
  colaborador ativo, de qualquer setor) acerta a liderança das pessoas envolvidas
  (`liderancasAoDefinirResponsaveis`). Responsáveis desativados não aparecem nos cartões.
- Desativar em vez de apagar (confirmação). Nome repetido não é aceito no cadastro.
- Importação (`js/ui/importador.js`, a mesma janela serve para eletricistas): arquivo, aba e
  linha dos títulos achados sozinhos; a pessoa confere a coluna de cada campo (com exemplos);
  prévia com novos, já existentes (mesmo nome sem acentos), repetidos, sem nome e avisos por linha.
  Quem já existe só recebe os campos preenchidos ("Atualizar quem já existe" pode ser desmarcado).
  Datas do Excel chegam como número de série. Grava em lotes de 450.
- "Baixar lista" exporta o que está filtrado na tela (`Colaboradores [setor] [loja] DD-MM-AAAA.xlsx`),
  com colunas que voltam certinho na importação.
- SheetJS só grava a planilha (sem cor no cabeçalho: a versão gratuita não pinta células).

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

## Demonstração local (fora do repositório)

`.claude/demo/` (ignorada pelo git): `servidor.mjs` serve a pasta em `http://localhost:5180/` e
`/demo.html`, que é o `index.html` com `js/dados/banco.js` trocado (pelo import map) por
`banco-demo.js`, um banco de mentira no `localStorage` com dados de `semente.js`. Papel pela URL:
`/demo.html?papel=admin|organizador|semacesso|fora`; `?zerar` volta à semente. Nunca grava no
Firestore real.

## Pendências

- Regras: o pedido da Etapa 1 não trouxe o texto publicado no console. `firestore.rules` foi
  escrito a partir das permissões combinadas; comparar com o console e deixar os dois iguais.
- Arquivos da Klavika em `fontes/` quando chegarem.
