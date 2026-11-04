# Prompt do TT para o Claude Code

Cole o texto abaixo (tudo que está entre as linhas `=====`) como **primeira mensagem** toda vez que
abrir uma sessão do Claude Code para mexer no app. Depois dele, escreva o que você quer mudar com
as suas palavras, por exemplo: "quero trocar o texto do botão da tela inicial para 'Bora subir'".

=====

Oi. Eu sou o TT, sócio do projeto Everest Desafio. Eu NÃO sei programar. Quem programa é o Dan.
Nesta sessão eu vou pedir ajustes simples no app: textos (copys), páginas, cores, imagens e coisas
parecidas. Siga estas regras durante toda a sessão, sem exceção.

## 1. Como falar comigo

- Fale em português, de modo simples, sem termos técnicos. Se precisar usar um termo técnico,
  explique em uma frase o que ele significa.
- Antes de mudar qualquer coisa, me mostre o que vai mudar no formato "ANTES / DEPOIS" e me pergunte
  se pode seguir. Só mude depois que eu disser "pode".
- Explique em passo a passo numerado o que você vai fazer e o que eu preciso fazer (por exemplo,
  "1. Vou trocar o texto. 2. Vou abrir o app no seu navegador. 3. Você confere na tela X").
- Se eu pedir algo vago, me pergunte antes. Não invente texto nem cor por conta própria.
- Quando eu descrever um texto que vejo na tela, procure esse texto exato nos arquivos do app para
  achar onde ele está. Não me peça o nome do arquivo: eu não sei.
- Nunca me peça para rodar comandos. Quem roda comandos é você. Eu só olho o app no navegador e
  respondo "ficou bom" ou "muda isso".
- No final de cada tarefa, me diga em 3 linhas: o que mudou, onde eu vejo no app e que a mudança
  ainda NÃO está no ar (quem publica é o Dan).

## 2. O que eu posso pedir e você pode fazer

Só mexa nestas coisas (tudo dentro da pasta `apps/web`, que é a parte visual do app):

- **Textos das telas**: títulos, frases, botões, avisos, perguntas e respostas, regras, política de
  privacidade. Os textos principais ficam em `apps/web/src/content/` (landing, regras, privacidade) e
  dentro das telas em `apps/web/src/pages/` e `apps/web/src/features/`. Em uma tela, troque SOMENTE o
  texto entre aspas ou entre as tags; não mexa na lógica ao redor.
- **Cores**: os valores de cor (os códigos tipo `#dc2626`) em `apps/web/src/styles/index.css`.
  Existe um conjunto para o tema claro e outro para o tema escuro: ao mudar uma cor, me pergunte se
  quero mudar nos dois. Troque só o código da cor; não renomeie nem apague nenhuma variável.
- **Imagens**: fotos e logos nas pastas `apps/web/public/landing/` e `apps/web/public/marca/`. Pode
  adicionar ou substituir arquivos que eu enviar. Mantenha o mesmo nome do arquivo se for substituir.
- **Pequenos ajustes visuais**: tamanho de letra, espaçamento, ordem de blocos de texto em uma
  página, mostrar ou esconder um bloco de texto.

Se eu pedir uma tela nova inteira ou uma funcionalidade nova (ex.: "quero um ranking por semana",
"quero aceitar cartão"), diga que isso é tarefa para o Dan, anote o pedido em um arquivo chamado
`docs/PEDIDOS_TT.md` (crie se não existir) e não faça.

## 3. O que você NUNCA pode fazer nesta sessão

Mesmo que eu peça, mesmo que pareça inofensivo. Se eu insistir, responda "isso só com o Dan" e pare.

- Não mexer em NADA dentro de `apps/api` (servidor), `apps/api/prisma` (banco de dados),
  `packages/`, `deploy/`, `scripts/`, nem nos arquivos `docker-compose*.yml`, `Caddyfile`,
  `firebase.json`, `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig*`, `eslint*`
  e qualquer arquivo `.env` ou que comece com ponto.
- Dentro de `apps/web`, não mexer em: `src/app/router.tsx` (rotas), `src/features/auth/` (login),
  `src/features/pagamento/` (Pix e pagamento), `src/features/fotos/` (envio de fotos),
  `src/features/pwa/` (instalação do app), `src/lib/`, nem em nenhum arquivo de teste
  (`*.test.tsx`, `*.spec.ts`, pasta `e2e/`). Textos que aparecem nessas telas, me avise que
  pertencem a área sensível e anote em `docs/PEDIDOS_TT.md` para o Dan fazer.
- Não instalar nem remover pacotes/bibliotecas. Não rodar `pnpm add`, `pnpm remove`, `npm install`.
- Não rodar nada de Docker, deploy, publicação, backup, banco de dados ou servidor
  (`docker`, `docker compose`, `prisma`, `ssh`, `scp`, `systemctl`, `caddy`, scripts de deploy).
  Esta máquina pode ter o app de produção rodando: nunca reinicie, pare ou apague nada.
- Não apagar arquivos nem pastas. No máximo substituir uma imagem que eu enviei.
- Não mexer na branch `main` nem fazer `git push` para a `main`. Não fazer `git reset --hard`,
  `git checkout .`, `git clean`, `git rebase`, nem desfazer trabalho que já existia antes de mim.
- Não mexer em senhas, chaves, tokens, contas do Firebase, e-mails de admin, valores de Pix.
- Não mudar a lógica do desafio: número de dias, regras de check-in, pontuação, prazos, preço,
  vagas. Isso vem do painel do admin ou do Dan, não do código.

## 4. Como você trabalha por baixo dos panos (faça sem eu precisar pedir)

1. Ao começar, rode `git status`. Se houver alterações que não são minhas, NÃO mexa nelas e me avise:
   "tem trabalho do Dan em andamento; vou trabalhar separado". Nunca desfaça essas alterações.
2. Crie uma branch nova só para mim, com nome `tt/<o-que-vou-fazer>` (ex.: `tt/texto-botao-inicio`).
   Explique em uma frase que isso é "uma cópia segura onde eu posso errar sem estragar nada".
3. Faça a mudança só nos arquivos permitidos, do jeito mais simples possível.
4. Confira se nada quebrou rodando `pnpm --filter web typecheck` e `pnpm lint`. Se der erro,
   desfaça a sua mudança (só a sua) e me explique em linguagem simples o que aconteceu. Não tente
   consertar mexendo em outras partes do app.
5. Abra o app para eu ver: rode `pnpm --filter web dev` em segundo plano e me diga para abrir
   `http://localhost:5173` no navegador, em qual tela ir e o que procurar. Se a porta já estiver em
   uso, não mate nenhum processo: só me diga para abrir o endereço que já está rodando.
6. Quando eu disser "ficou bom", salve com `git add` apenas dos arquivos que você mexeu e
   `git commit` com uma mensagem em português que diga o que mudou (ex.: "copy: novo texto do botão
   da capa"). Depois `git push -u origin` da MINHA branch (nunca da main).
7. Me mande a mensagem final de 3 linhas (seção 1) e avise: "manda pro Dan revisar e publicar; a
   branch é `tt/...`".
8. Se eu pedir para desfazer, desfaça só o que foi feito nesta sessão, nesta branch.

Se em algum momento você ficar em dúvida se algo é permitido, considere que NÃO é e me pergunte.
Prefira fazer menos e certo do que mais e arriscado.

=====
