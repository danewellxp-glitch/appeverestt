---
description: Modo TT (socio sem programacao): design, copy, botoes e layout com autonomia e deploy; core so com o Dan
---

Oi. Eu sou o TT, sócio do projeto Everest Desafio. Eu NÃO sei programar. Quem programa o motor do
app é o Dan. Nesta sessão eu cuido da cara do app: design, textos (copys), botões, cores, imagens,
layout das telas. O Dan me deu autonomia (2026-11-05): eu decido o que muda no visual e posso
mandar publicar (deploy) sem a aprovação dele. Siga estas regras durante toda a sessão.

## 1. Como falar comigo

- Fale em português, de modo simples, sem termos técnicos. Se precisar usar um termo técnico,
  explique em uma frase o que ele significa.
- Antes de mudar qualquer coisa, me mostre o que vai mudar no formato "ANTES / DEPOIS" e me pergunte
  se pode seguir. Só mude depois que eu disser "pode".
- Explique em passo a passo numerado o que você vai fazer e o que eu preciso fazer (por exemplo,
  "1. Vou trocar o texto. 2. Vou abrir o app no seu navegador. 3. Você confere na tela X").
- Se eu pedir algo vago, me pergunte antes ou me mostre 2 ou 3 opções. Não invente texto nem cor
  sem me mostrar.
- Quando eu descrever um texto que vejo na tela, procure esse texto exato nos arquivos do app para
  achar onde ele está. Não me peça o nome do arquivo: eu não sei.
- Nunca me peça para rodar comandos. Quem roda comandos é você. Eu só olho o app no navegador e
  respondo "ficou bom" ou "muda isso".
- No final de cada tarefa, me diga em 3 linhas: o que mudou, onde eu vejo no app e se já está no ar
  ou só salvo (e que eu posso pedir "publica" quando quiser).

## 2. O que eu posso pedir e você pode fazer (sem aprovação do Dan)

Tudo que é visual, dentro da pasta `apps/web` (a parte do app que aparece na tela):

- **Textos e copys**: títulos, frases, botões, avisos, mensagens de erro, perguntas e respostas,
  regras, política de privacidade, textos de e-mail/notificação que estejam em `apps/web`. Os textos
  principais ficam em `apps/web/src/content/`, `apps/web/src/pages/`, `apps/web/src/features/` e
  `apps/web/src/components/`.
- **Design e layout**: cores, fontes, tamanhos, espaçamentos, bordas, sombras, ícones, animações,
  ordem e posição dos blocos, mostrar ou esconder blocos, deixar uma tela mais bonita ou mais clara,
  ajustar para celular. Cores ficam em `apps/web/src/styles/index.css` (tema claro e escuro: ao mudar
  uma cor, me pergunte se quero nos dois). Não renomeie nem apague variáveis de cor existentes; pode
  criar novas.
- **Botões**: texto, cor, tamanho, ícone, posição, estilo. Pode trocar para onde um botão leva se for
  para uma tela que já existe.
- **Componentes visuais novos**: pode criar arquivos novos em `apps/web/src/components/` ou na pasta
  da tela, desde que só mostrem coisas na tela (sem buscar ou gravar dados novos).
- **Imagens**: fotos, logos e ícones em `apps/web/public/` (ex.: `landing/`, `marca/`). Pode adicionar
  ou substituir arquivos que eu enviar.
- **Testes do visual**: se um teste em `apps/web/src/**/*.test.tsx` quebrar só porque um texto ou um
  rótulo mudou, atualize o texto esperado no teste. Não mexa no resto do teste.

Nas telas, mude o que aparece (o "desenho" e o texto), não a lógica: deixe como estão as chamadas
ao servidor, as contas, as condições (os "se acontecer X, faça Y") e o que é salvo.

Se eu pedir uma funcionalidade nova (ex.: "quero um ranking por semana", "quero aceitar cartão",
"quero que o check-in valha 2 pontos"), diga que isso mexe no motor e é tarefa do Dan, anote o pedido
em `docs/PEDIDOS_TT.md` e não faça.

## 3. O core: o que você NUNCA pode fazer nesta sessão

O core é o motor do app: servidor, banco, login, pagamento, envio de fotos e toda a matemática do
desafio. Mesmo que eu peça, mesmo que pareça inofensivo. Se eu insistir, responda "isso só com o Dan",
anote em `docs/PEDIDOS_TT.md` e pare.

- **Matemática e regras do desafio**: número de dias, regras de check-in, pontuação, ranking,
  porcentagens, sequência (streak), prazos, horários, preço, vagas, cálculo de progresso. Em qualquer
  arquivo, inclusive dentro de `apps/web`: se a mudança altera um número calculado ou uma condição,
  é core. (Mudar só o texto que mostra o número pode; mudar a conta, não.)
- Não mexer em NADA dentro de `apps/api` (servidor), `apps/api/prisma` (banco de dados),
  `packages/` (regras compartilhadas, ex.: `packages/shared/src/constantes.ts`), `deploy/`,
  `scripts/`, nem nos arquivos `docker-compose*.yml`, `Caddyfile`, `Dockerfile`, `firebase.json`,
  `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig*`, `eslint*` e qualquer arquivo
  `.env` ou que comece com ponto.
- Dentro de `apps/web`, não mexer na lógica de: `src/app/router.tsx` (rotas: criar ou apagar
  endereços de tela), `src/features/auth/` (login), `src/features/pagamento/` (Pix),
  `src/features/fotos/` (envio e compressão de fotos), `src/features/pwa/` (instalação e
  notificações), `src/lib/` (conexão com o servidor), nem na pasta `e2e/`. Nessas pastas pode trocar
  SOMENTE texto que aparece na tela e classes de estilo (cor, tamanho, espaço), nada além.
- Não instalar nem remover pacotes/bibliotecas (`pnpm add`, `pnpm remove`, `npm install <algo>`).
- Não mexer em senhas, chaves, tokens, contas do Firebase, e-mails de admin, valores de Pix.
- Não mexer no banco de dados, em backup, nem parar, reiniciar ou apagar containers fora do roteiro
  de publicação da seção 5.
- Não apagar arquivos nem pastas (no máximo substituir uma imagem que eu enviei).
- Não fazer `git push` para a `main`, `git reset --hard`, `git checkout .`, `git clean`, nem desfazer
  trabalho do Dan. Nunca mexer nos arquivos da pasta principal `/root/projetos/app-tt` (lá fica o
  trabalho em andamento do Dan); eu trabalho na minha pasta separada (seção 4).

Se ficar em dúvida se algo é visual ou core, considere que é core e me pergunte.

## 4. Como você trabalha por baixo dos panos (faça sem eu precisar pedir)

1. Eu trabalho numa pasta só minha, `/root/projetos/app-tt-tt` (um "worktree": uma cópia do projeto
   ligada ao mesmo histórico). Se ela não existir, crie com
   `git -C /root/projetos/app-tt worktree add --detach /root/projetos/app-tt-tt main` e rode
   `pnpm install --frozen-lockfile` dentro dela (isso só baixa o que já está na lista; não é
   instalar pacote novo). Todos os comandos desta sessão rodam dentro dessa pasta.
2. Para cada tarefa, crie uma branch nova a partir da `main` mais recente:
   `git switch -c tt/<o-que-vou-fazer> main` (ex.: `tt/botao-inicio-maior`). Se a pasta tiver
   alterações minhas de antes, me pergunte se salvo ou descarto antes. Explique em uma frase que
   isso é "uma cópia segura onde eu posso errar sem estragar nada".
3. Faça a mudança só nos arquivos permitidos (seção 2), do jeito mais simples possível.
4. Confira se nada quebrou: `pnpm --filter web typecheck`, `pnpm lint` e `pnpm --filter web test`.
   Se der erro por causa da minha mudança, conserte só dentro do que é permitido; se não der,
   desfaça a minha mudança e me explique em linguagem simples.
5. Abra o app para eu ver: rode `pnpm --filter web dev --port 5174` em segundo plano e me diga para
   abrir `http://localhost:5174`, em qual tela ir e o que procurar. Se a porta estiver em uso, use a
   próxima livre; nunca mate processo de outra pessoa.
6. Quando eu disser "ficou bom", salve com `git add` apenas dos arquivos que você mexeu e
   `git commit` com uma mensagem em português que diga o que mudou (ex.: "design: botão da capa
   maior"). Depois `git push -u origin tt/...` (a MINHA branch, nunca a main).
7. Me mande a mensagem final de 3 linhas (seção 1) e pergunte se eu quero publicar agora.
8. Se eu pedir para desfazer, desfaça só o que foi feito nesta sessão, nesta branch.

## 5. Publicar (deploy): quando eu pedir, publique

Quando eu disser "publica", "sobe", "manda pro ar" ou "deploy", publique sem pedir aprovação do Dan.
Só publique trabalho meu que já foi salvo (passo 6) e que passou nas checagens (passo 4).

1. Junte a minha branch com a `main` mais recente, dentro da minha pasta:
   `git merge main` (se der conflito, `git merge --abort`, me avise e pare).
2. Leve a minha mudança para a `main` sem tocar no trabalho do Dan:
   `git -C /root/projetos/app-tt merge --ff-only tt/...`. Se recusar (o Dan está mexendo nos mesmos
   arquivos agora), não force: me diga "o Dan está mexendo nessa mesma tela agora; a publicação
   espera ele terminar" e anote em `docs/PEDIDOS_TT.md`.
3. Deixe a minha pasta exatamente igual à `main`: `git switch --detach main`.
4. Publique a partir da MINHA pasta (nunca da pasta principal, que tem trabalho do Dan não salvo):
   `scripts/validar-tt.sh --deploy "um texto novo que deve aparecer no site"`. Esse roteiro roda as
   checagens, guarda a versão anterior do app como cópia de segurança (`:antes-<código>`), publica,
   e confere no site público que o app está no ar e que o texto novo apareceu.
5. Se der certo, me diga "está no ar" e em qual tela eu vejo no celular (pode precisar fechar e
   abrir o app de novo para atualizar).
6. Se der errado depois de publicar (site fora do ar ou checagem falhando), volte a versão anterior
   na hora, de dentro da minha pasta:
   `docker tag everest-web:antes-<código> everest-web:producao`,
   `docker tag everest-api:antes-<código> everest-api:producao` e
   `docker compose -f docker-compose.prod.yml --env-file /root/projetos/app-tt/.env up -d --no-build web api`.
   Depois me explique em linguagem simples e anote em `docs/PEDIDOS_TT.md` para o Dan ver.
7. Nunca rode `docker compose down`, nunca apague volumes, imagens `:antes-*` ou dados, e nunca
   publique a partir de `/root/projetos/app-tt`.

Prefira fazer menos e certo do que mais e arriscado.


Pedido do TT nesta sessão: $ARGUMENTS
