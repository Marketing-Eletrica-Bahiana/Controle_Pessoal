# Controle Pessoal | Elétrica Bahiana

App interno da Elétrica Bahiana para organizar, num lugar só:

- **Dashboard** (tela inicial): números gerais, listas abertas, aniversariantes do mês, setores,
  participação das marcas, presença nos treinamentos do CAE e do Comercial e nas ações de endomarketing e eventos.
- **Colaboradores**: quem trabalha em cada setor e loja, com gerentes, coordenadores e supervisores.
  A parte **Pais e mães** mostra quem é pai ou mãe na empresa, com os contatos, e a parte **Desligados**
  mostra quem saiu, com a data de desligamento. A ficha de cada pessoa tem as **Informações Pessoais** (pet,
  família, sonhos, time e hobby) para as ações internas, e a parte **Participação** mostra o ranking de quem mais
  participou das ações e dos aniversariantes.
- **Aniversariantes**: do mês (nascimento) e de empresa (tempo de casa), com o contato de cada pessoa. Quando o
  controle do mês existe, aparecem os cartões **Participou**, **Não participou** e **Outros** (quem não participou
  e tem observação, como férias ou atestado), e a tabela mostra a observação embaixo do status.
- **Fornecedores**: as marcas parceiras (Soprano, Legrand, Ledvance...), com os palestrantes, representantes e
  convidados de cada uma.
- **Eletricistas do CAE**: cadastro dos eletricistas, com o vendedor de cada um.
- **Listas**: listas de presença com check-in pelo celular nos treinamentos, eventos e ações
  internas, com planilha para usar no sorteador.
- **Ramal**: lugar reservado para a lista de ramais, que será preenchida no futuro.
- **Usuários** (só administração): quem pode entrar e com qual papel.

Endereço: https://marketing-eletrica-bahiana.github.io/Controle_Pessoal/

## Quem pode entrar

Só entra quem usa um e-mail `@eletricabahiana.com.br` **e** está cadastrado na aba Usuários com
o acesso ativo. Quem entra sem cadastro vê a mensagem "Seu acesso ainda não foi liberado. Fale com
a equipe de Marketing."

| Papel | O que pode fazer |
|---|---|
| Administração (`admin`) | Cadastra, edita e apaga tudo e gerencia os usuários. |
| Organização (`organizador`) | Vê tudo, faz check-in nas listas, cadastra eletricista novo e baixa as listas. Não edita nem apaga cadastros. |

A tela esconde os botões que a pessoa não pode usar, e as regras do Firestore garantem o mesmo
no banco de dados.

## Check-in no evento

1. Abra a aba **Listas** no celular e toque em **Fazer check-in** na lista do dia.
2. Busque o nome no campo grande do topo e toque em **Check-in**. Errou? Toque em **Desfazer**.
   Toque no **nome da pessoa** para marcar a situação (**Participou**, **Não participou**, **Outros** ou **Sem
   marcação**) e escrever uma **observação** (por exemplo, atestado ou férias). "Outros" não conta como falta. Depois
   que a lista é encerrada, só a administração muda a situação.
3. Chegou alguém que não estava na lista? **Adicionar participante não convocado**: busque o
   colaborador ou eletricista, cadastre um eletricista novo (com a autorização LGPD) ou anote um
   convidado só com o nome.
4. Duas pessoas podem fazer check-in ao mesmo tempo, cada uma no seu celular. Se a internet cair,
   os check-ins ficam guardados no aparelho e sobem sozinhos quando a conexão voltar (não saia do
   app antes disso).
5. No fim, **Baixar presentes** gera a planilha para o sorteador (a primeira coluna é "Nome").

## Subir uma planilha do Excel na lista

Em **Listas**, abra a lista e clique em **Importar planilha**: o botão fica no **Check-in** (ao lado de "Adicionar
participante não convocado") e em **Convocados**, e só aparece para a Administração. A planilha precisa de uma coluna com o
**nome** da pessoa; se tiver, também **Participou?** (Sim, Não ou Outros) e **Observação**. O app procura cada nome
nos colaboradores (inclusive os desligados, para listas antigas) e nos eletricistas, e mostra uma prévia antes de
gravar:

- **Entra na lista**: achou a pessoa. Nome parecido (por exemplo "Ana Santos" para "Ana Exemplo Santos") aparece com aviso.
- **Já está na lista**: recebe a situação e a observação da planilha (célula vazia não apaga nada).
- **Não achado**: o nome não está no cadastro. Confira a grafia, ou marque **Incluir quem não está no cadastro como
  convidado**.

Se a planilha é a lista de quem esteve na ação, deixe marcada **Quem está na planilha participou** (ela já vem marcada
quando a data da lista passou).

## Pessoas das marcas

Na ficha de cada marca (aba **Fornecedores**, clique na marca), a parte **Pessoas da marca** guarda os
palestrantes, representantes e convidados que ela costuma enviar. Clique em **Adicionar pessoa**, preencha o nome,
escolha a função (Palestrante, Representante ou Convidado) e, se quiser, o telefone e o e-mail. O lápis edita e a
lixeira tira a pessoa da marca (as listas já feitas continuam com o nome).

Ao montar uma lista de presença, em **Convocados > Adicionar pessoa de fornecedor**, escolha a marca e comece a
digitar: as pessoas da marca aparecem como sugestão, já com a função. Dá para digitar um nome novo também; nesse caso,
a caixa **Guardar também na ficha da marca** (já marcada) cadastra a pessoa para as próximas listas. A função aparece
junto da marca no check-in, no resumo e nas planilhas (por exemplo, "Soprano · Palestrante").

## Pais e mães

A lista fica em **Colaboradores > Pais e mães** e só mostra quem está ativo e marcado no cadastro.
Quem tem acesso ao app vê os contatos; só a administração edita. Há dois jeitos de preencher:

1. **Uma pessoa de cada vez:** edite o cadastro, escolha **Pai** ou **Mãe** em "É pai ou mãe?" e
   preencha o telefone e o e-mail.
2. **Muitas de uma vez:** em **Importar planilha**, use a lista oficial de colaboradores: as colunas
   `Tem Filhos` (Sim ou Não) e `Gênero` dizem se a pessoa é pai ou mãe, e o gênero não fica guardado.
   Quem já está cadastrado com o mesmo nome só recebe o que estiver preenchido na planilha.

Celular abre a conversa no WhatsApp; telefone fixo abre a ligação. **Baixar lista** gera a planilha
do que está filtrado na tela.

## Informações Pessoais

Na ficha de cada colaborador (clique no nome da pessoa), o quadro **Informações Pessoais** guarda o que ela conta
sobre si para as nossas ações internas: **Pet**, **Família**, **Sonhos**, **Time** e **Hobby**. Clique em
**Preencher** (ou **Editar**, se já houver algo) e escreva as respostas. Todos os espaços são opcionais, com até 300
letras cada: deixe em branco o que a pessoa não quiser contar. Quem tem acesso ao app vê o quadro; só a administração
preenche.

## Participação (ranking)

Em **Colaboradores > Participação** ficam dois rankings, só com colaboradores ativos:

1. **Quem mais participou das ações**: conta em quantas listas do tipo **Ação de Endomarketing** cada pessoa fez
   check-in (convocada ou não), em quantas foi convocada e em quantas faltou (convocada e sem check-in). Os controles
   de aniversariantes também são ações: "Participou" conta como check-in, "Não participou" como falta e "Pendente" não
   conta. Só contam as listas que já aconteceram. O filtro **Tipo de lista** troca para Eventos, Treinamentos ou todas
   as listas.
2. **Quem mais participou dos aniversariantes**: conta os meses marcados como "Participou" nos controles de
   aniversariantes (do mês e de empresa), com as **observações** escritas em cada mês.

Os números do topo mostram quantas listas entraram, quantos participaram e quantos ainda não participaram. O filtro
**Ano** vale para os dois rankings, a busca acha a pessoa sem mudar a posição dela, e **Baixar planilha** gera os dois
rankings em abas separadas.

Em **Aniversariantes > Histórico** também estão os rankings de quem mais participou e de quem mais deixou de
participar, com as observações, e a tabela "Por colaborador" mostra as observações de cada pessoa.

## Corrigir a lista de colaboradores sem duplicar

Se um nome foi corrigido na planilha, importar de novo cria um cadastro com o nome novo e o antigo continua
lá. Para evitar isso, importe a lista completa e marque, na prévia, **Substituir a lista atual pela planilha**:

- quem está na planilha é atualizado e, se estava em Desligados, volta a ficar ativo;
- quem está ativo no sistema e não está na planilha vai para **Desligados**, não é apagado. O histórico de listas
  e aniversários continua guardado, e dá para reativar depois (ou importar de novo a lista certa).

A prévia mostra quem vai para Desligados e avisa em vermelho se for mais da metade da equipe (sinal de planilha
ou aba errada). Antes de gravar, o app pede confirmação.

## Desligados

Quando alguém sair da empresa, há três jeitos de levar a pessoa para **Colaboradores > Desligados**:

1. Na lista de colaboradores, clique no ícone de pessoa com um X (**Desligar**) na linha dela.
2. Na ficha da pessoa, clique em **Desligar**.
3. Na parte **Desligados**, clique em **Desligar colaborador** e digite o nome.

A janela pede a data de desligamento (já vem com a de hoje). A pessoa sai dos setores, das novas listas e dos
aniversariantes, mas o histórico fica guardado. Para corrigir a data depois, use o ícone de calendário na linha
dela em Desligados (ou **Data de desligamento** na ficha). **Reativar** traz a pessoa de volta e apaga a data.

Para trazer a lista oficial, clique em **Importar desligados** e escolha o arquivo: a aba "Desligados" já vem
escolhida. Quem já está no cadastro vai para Desligados e recebe a data; quem não está entra só com o nome e a data.

Para tirar alguém do cadastro para sempre (um cadastro duplicado, por exemplo), use a lixeira na linha da pessoa
ou **Excluir de vez** na ficha. O botão só aparece para quem já está em Desligados, e não dá para desfazer. As
listas de presença e os controles de aniversário continuam mostrando o nome.

## Mudar a ordem das listas

Em qualquer tabela, clique no título de uma coluna para ordenar por ela; clique de novo para inverter. No
celular, use o campo **Ordenar por** acima da lista. A ordem escolhida fica guardada enquanto você navega.

## Como cadastrar um novo usuário

1. Entre no app com uma conta de administração.
2. Abra a aba **Usuários** e clique em **Novo usuário**.
3. Preencha o e-mail da pessoa (`@eletricabahiana.com.br`), o nome, o cargo e o papel.
4. Clique em **Cadastrar**. A pessoa já pode entrar com o Google.

O e-mail vira o identificador do cadastro (sempre em minúsculas) e não muda depois. Para tirar o
acesso de alguém, use o botão de desativar na linha da pessoa: nada é apagado, e dá para reativar
depois. Ninguém consegue desativar o próprio acesso nem mudar o próprio papel.

### Primeiro administrador

Se ainda não existe nenhum administrador, cadastre o primeiro direto no console do Firebase:

1. Abra https://console.firebase.google.com/ e o projeto `controle-pessoal-eb`.
2. Vá em **Firestore Database > Dados** e crie (ou abra) a coleção `usuarios`.
3. Crie um documento com o **ID igual ao e-mail em minúsculas** e os campos:
   - `nome` (string)
   - `cargo` (string)
   - `papel` (string): `admin`
   - `ativo` (boolean): `true`

## Como publicar novas regras do Firestore

As regras ficam no arquivo [`firestore.rules`](firestore.rules), que serve de registro do que está
publicado. Para publicar uma versão nova:

1. Abra https://console.firebase.google.com/ e o projeto `controle-pessoal-eb`.
2. Vá em **Firestore Database > Regras**.
3. Apague o texto que está lá, cole o conteúdo de `firestore.rules` e clique em **Publicar**.
4. Se mudou alguma coisa direto no console, copie o texto de volta para `firestore.rules` e faça
   o commit, para o arquivo continuar igual ao que está publicado.

Quem usa a linha de comando do Firebase também pode publicar com
`firebase deploy --only firestore:rules`.

## Índice para o histórico das pessoas (recomendado)

A ficha de cada colaborador e eletricista mostra o histórico de listas. Para essa consulta ficar
rápida e barata, o Firestore precisa de um índice de "grupo de coleções" no campo `pessoaId` das
presenças (registrado em [`firestore.indexes.json`](firestore.indexes.json)). Sem ele, o app
continua funcionando, mas lê lista por lista.

1. No console do Firebase, abra **Firestore Database > Índices > Campo único** (ou "Isenções").
2. Clique em **Adicionar isenção** e preencha: ID da coleção `presencas`, campo `pessoaId`, e
   marque **Grupo de coleções** com a ordem **Crescente**.
3. Salve e espere o índice ficar pronto (alguns minutos).

Pela linha de comando: `firebase deploy --only firestore:indexes`.

## Tecnologia

- Site estático, sem etapa de build: HTML, CSS e JavaScript em módulos (ES modules).
- Firebase 13 por CDN (gstatic): login com Google e Firestore.
- SheetJS para ler e gerar planilhas `.xlsx` e Chart.js para os gráficos, carregados só quando
  uma tela precisa.
- Identidade visual do Endomarketing #EnergiaBahiana (cores, fontes Lato e Klavika, logos,
  patterns e mascotes em `marca/` e `fontes/`).
- Publicação automática no GitHub Pages a cada envio na branch `main`
  (`.github/workflows/publicar.yml`). Em **Settings > Pages**, a origem precisa estar em
  **GitHub Actions**.

## Para quem mexe no código

- `index.html`: página única do app.
- `js/app.js`: login, conferência do cadastro e troca de telas (endereços com `#/`).
- `js/dados/`: leitura e gravação no Firestore. Só `js/dados/banco.js` fala com o Firebase.
- `js/lib/`: regras e cálculos puros, com testes em `tests/`.
- `js/telas/`: uma tela por aba.
- `js/ui/`: componentes visuais, logos e ícones.

Para testar em casa, sirva a pasta com qualquer servidor estático (por exemplo
`python -m http.server 8000`) e abra `http://localhost:8000/`. Os testes rodam com Node 24:
`npm test`.

### Editar em mais de um computador

O site é editado em dois computadores. O GitHub é o lugar que junta tudo: o que fica só em um computador o outro
não vê.

1. **Antes de começar qualquer alteração**, puxe o que foi feito no outro computador (`git pull` na pasta do projeto)
   e leia o **Histórico de alterações** logo abaixo.
2. **Ao terminar**, escreva a alteração no histórico, faça o commit e envie para a `main` (`git push`).

Para preparar um computador novo: copie a pasta do projeto (ou clone o repositório), instale o Git e o Node 24 e
entre no GitHub com uma conta que tenha acesso à organização Marketing-Eletrica-Bahiana. A demonstração local
(`.claude/demo/`) e a pasta `Fonte - Klavika` ficam fora do repositório: vão junto só quando a pasta é copiada.

## Histórico de alterações

A mais recente primeiro. Cada alteração entra aqui no mesmo envio em que vai para o site.

- **27/11/2026**: em Aniversariantes, cada controle do mês ganhou os cartões **Participou**, **Não participou** e
  **Outros** (como os do Dashboard). "Outros" é quem não participou, ou ficou pendente, e tem observação; quem
  participou continua em Participou mesmo com observação. A tabela mostra "Outros" e a observação no status, e a tela
  do controle ganhou o cartão e o filtro "Outros".
- **27/11/2026**: o botão **Importar planilha** também fica no **Check-in** da lista, ao lado de "Adicionar participante
  não convocado" (só para a Administração). É a mesma janela de Convocados.
- **27/11/2026**: em Listas > Convocados, **Importar planilha**: sobe um Excel com os nomes (e, se tiver, se participou
  e a observação) direto na lista, com prévia antes de gravar.
- **27/11/2026**: correção do erro "Algo deu errado" na aba Listas logo depois de uma atualização (o navegador juntava
  um arquivo antigo com um novo). Agora cada publicação tem a sua versão nos endereços dos arquivos, e se a página
  aberta perceber a mistura, ela se recarrega sozinha.
- **27/11/2026**: no check-in, tocar no **nome da pessoa** abre a situação (**Participou**, **Não participou**,
  **Outros** ou **Sem marcação**) e a **observação**. Quem não fez check-in na lista encerrada aparece como "Não
  participou" (antes, "Não veio"). O resumo, a ficha da pessoa e a planilha completa mostram a situação e a
  observação. "Outros" não conta como falta.
- **27/11/2026**: os controles de **aniversariantes** (do mês e de empresa) passam a contar como **Ações de
  Endomarketing**: no filtro de tipo da aba Listas, no ranking de Colaboradores > Participação e no bloco Endomarketing
  e eventos do Dashboard.
- **27/11/2026**: em Convocados > Adicionar colaboradores, a opção **Pais e mães** puxa de uma vez quem está marcado
  como pai ou mãe no cadastro: os dois, só os pais ou só as mães.
- **27/11/2026**: na lista de presença, a loja pode ser **Todas as lojas** (para ações e eventos das três lojas). Em
  Convocados > Adicionar colaboradores > Loja inteira, **Todas as lojas** convoca todos os colaboradores ativos de uma
  vez.
- **27/11/2026**: no Dashboard, o bloco **Endomarketing e eventos**, com as listas do tipo Ação de Endomarketing e
  Evento do período: quantas foram, quantos participaram, a presença dos convocados, um gráfico e a tabela de cada uma.
- **27/11/2026**: em Colaboradores, a parte **Participação**, com o ranking de quem mais participou das ações de
  endomarketing (ou de outro tipo de lista) e dos aniversariantes. Em Aniversariantes > Histórico, o ranking de quem
  mais participou e as **observações** nos rankings e na tabela por colaborador.
- **26/11/2026**: na ficha do colaborador, o quadro **Informações Pessoais** (Pet, Família, Sonhos, Time e Hobby),
  para as ações internas. Só a administração preenche.
- **26/11/2026**: o site passa a ser editado em dois computadores. Criados este histórico e o passo a passo acima.
- **24/11/2026**: na ficha do fornecedor, **Pessoas da marca** (palestrantes, representantes e convidados). Elas
  aparecem como sugestão em Convocados > Adicionar pessoa de fornecedor, e a função aparece junto da marca na lista.
- **24/11/2026**: em Colaboradores, **Desativar** virou **Desligar**, com a data de desligamento. A pessoa vai para
  Desligados, e a data pode ser corrigida depois pelo ícone de calendário.
- **06/11/2026**: parte **Desligados** (com a importação da aba "Desligados" da lista oficial), **Excluir de vez**,
  ordem das tabelas pelo título das colunas e contato nos aniversariantes.
- **06/11/2026**: importação de colaboradores com a opção **Substituir a lista atual pela planilha**, sem duplicar.
- **04/11/2026**: a importação reconhece "Tem Filhos" e "Gênero" para marcar pai ou mãe, e o CSV mantém os acentos.
- **04/11/2026**: parte **Pais e mães**, contatos dos colaboradores e aba **Ramal** (ainda vazia).
- **02/11/2026**: a liderança ganhou o nível **Coordenador**.
- **31/10/2026**: primeira versão: login com Google, Usuários, Colaboradores, Fornecedores, Eletricistas do CAE,
  Listas com check-in, Aniversariantes e Dashboard.
