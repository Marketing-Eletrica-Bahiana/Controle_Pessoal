# Controle Pessoal | Elétrica Bahiana

App interno da Elétrica Bahiana para organizar, num lugar só:

- **Dashboard** (tela inicial): números gerais, listas abertas, aniversariantes do mês, setores,
  participação das marcas, presença nos treinamentos do CAE e do Comercial.
- **Colaboradores**: quem trabalha em cada setor e loja, com gerentes, coordenadores e supervisores.
  A parte **Pais e mães** mostra quem é pai ou mãe na empresa, com os contatos.
- **Aniversariantes**: do mês (nascimento) e de empresa (tempo de casa).
- **Fornecedores**: as marcas parceiras (Soprano, Legrand, Ledvance...).
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
3. Chegou alguém que não estava na lista? **Adicionar participante não convocado**: busque o
   colaborador ou eletricista, cadastre um eletricista novo (com a autorização LGPD) ou anote um
   convidado só com o nome.
4. Duas pessoas podem fazer check-in ao mesmo tempo, cada uma no seu celular. Se a internet cair,
   os check-ins ficam guardados no aparelho e sobem sozinhos quando a conexão voltar (não saia do
   app antes disso).
5. No fim, **Baixar presentes** gera a planilha para o sorteador (a primeira coluna é "Nome").

## Pais e mães

A lista fica em **Colaboradores > Pais e mães** e só mostra quem está ativo e marcado no cadastro.
Quem tem acesso ao app vê os contatos; só a administração edita. Há dois jeitos de preencher:

1. **Uma pessoa de cada vez:** edite o cadastro, escolha **Pai** ou **Mãe** em "É pai ou mãe?" e
   preencha o telefone e o e-mail.
2. **Muitas de uma vez:** em **Importar planilha**, use a lista oficial de colaboradores: as colunas
   `Tem Filhos` (Sim ou Não) e `Gênero` dizem se a pessoa é pai ou mãe, e o gênero não fica guardado.
   Outra planilha também serve, com as colunas `Nome`, `Pai ou mãe` (`Pai`, `Mãe` ou `Não`), `Telefone` e
   `E-mail`. Quem já está cadastrado com o mesmo nome só recebe o que estiver preenchido na planilha.

Celular abre a conversa no WhatsApp; telefone fixo abre a ligação. **Baixar lista** gera a planilha
do que está filtrado na tela.

## Corrigir a lista de colaboradores sem duplicar

Se um nome foi corrigido na planilha, importar de novo cria um cadastro com o nome novo e o antigo continua
lá. Para evitar isso, importe a lista completa e marque, na prévia, **Substituir a lista atual pela planilha**:

- quem está na planilha é atualizado e, se estava desativado, volta a ficar ativo;
- quem está ativo no sistema e não está na planilha é **desativado**, não apagado. O histórico de listas e
  aniversários continua guardado, e dá para reativar depois (ou importar de novo a lista certa).

A prévia mostra quem vai ser desativado e avisa em vermelho se for mais da metade da equipe (sinal de planilha
ou aba errada). Antes de gravar, o app pede confirmação.

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
