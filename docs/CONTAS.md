# O que o dono do app precisa deixar pronto

Este guia é para quem vai **ser o dono das contas** do Everest Desafio (o Tt ou quem ele indicar).
Não precisa saber programar. Cada passo diz **o que criar** e **o que me entregar**.
O manual técnico do deploy continua em `docs/DEPLOY.md`; quem faz aquela parte sou eu.

> **Regra de ouro:** nada marcado como **SEGREDO** vai por chat, e-mail, WhatsApp ou print.
> Segredo é colado **só** no painel de variáveis do provedor (Railway, Vercel), por você.

Tempo estimado: 1 a 2 horas, com calma.

---

## Resumo: o que eu preciso receber de você

| # | Item | Onde você pega | Segredo? |
|---|---|---|---|
| 1 | Domínio escolhido (ex.: `desafio.everest.com.br`) | Registro.br | não |
| 2 | Os 4 valores do app web do Firebase (`apiKey`, `authDomain`, `projectId`, `appId`) | Firebase, passo 4 | não |
| 3 | O id do projeto Firebase | Firebase, passo 4 | não |
| 4 | Acesso de membro aos projetos da Railway e da Vercel (me convidar pelo e-mail) | Railway e Vercel | não |
| 5 | O e-mail Google que será o admin (embaixador) no app | você decide | não |
| 6 | O "Pix copia e cola" do QR de R$ 50 (o mesmo do PDF do banco) | app do banco | não* |
| — | Chave da conta de serviço do Firebase (arquivo JSON) | Firebase, passo 5 | **SEGREDO** |
| — | Chaves do Cloudflare R2 | Cloudflare | **SEGREDO** |

\* O copia e cola é público (qualquer pessoa que lê o QR vê), mas mesmo assim cole você mesmo na Railway.

---

## 1. Conta Google "dona" do projeto

Use **uma conta Google da marca** (ex.: `everestdesafio@gmail.com`) ou a do Tt. Ela vai ser dona do
Firebase e do login com Google. Evite usar uma conta pessoal de outra pessoa: se ela sair, o login
do app fica preso a ela.

Ative a **verificação em duas etapas** nessa conta (myaccount.google.com → Segurança).

---

## 2. Firebase (login por e-mail e por Google)

O Firebase cuida das senhas e do botão "Continuar com Google". É gratuito para o nosso tamanho.

1. Entre em **console.firebase.google.com** com a conta do item 1.
2. **Adicionar projeto** → nome `everest-desafio` → pode **desligar** o Google Analytics → Criar.
3. No menu da esquerda: **Criação (Build) → Authentication → Vamos começar**.
   - Aba **Método de login (Sign-in method)**:
     - **E-mail/senha** → Ativar (só a primeira chave; "link por e-mail" fica desligado) → Salvar.
     - **Google** → Ativar → escolha o **e-mail de suporte** (a conta do item 1) → Salvar.
   - Aba **Configurações (Settings)**:
     - **Domínios autorizados** → Adicionar domínio → o domínio do app (ex.: `desafio.everest.com.br`).
       `localhost` já vem na lista; deixe.
     - **Proteção contra enumeração de e-mail**: deixe **ativada**.
   - Aba **Modelos (Templates)**: em "Redefinição de senha", troque o idioma para **Português (Brasil)** e
     o nome do remetente para "Everest Desafio".
4. **Engrenagem (Configurações do projeto) → Geral → Seus apps → ícone `</>` (Web)**:
   - Apelido: `Everest Web`. **Não** marque "Firebase Hosting". Registrar app.
   - Aparece um bloco `firebaseConfig`. Copie e me mande **só estes 4 valores**:
     `apiKey`, `authDomain`, `projectId`, `appId`. (Não são segredos: vão dentro do app.)
5. **Engrenagem → Configurações do projeto → Contas de serviço → Gerar nova chave privada**.
   - Baixa um arquivo `.json`. **Isto é SEGREDO.** Não mande para ninguém.
   - Você mesmo vai colar o conteúdo convertido na Railway (passo 4.4). Para converter:
     - Windows (PowerShell, na pasta do arquivo):
       `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\nome-do-arquivo.json")) | Set-Clipboard`
       (o resultado vai para a área de transferência).
     - Mac/Linux: `base64 -w0 nome-do-arquivo.json` (Mac: `base64 -i nome-do-arquivo.json`).
   - Depois de colar na Railway, **apague o arquivo** do computador e da lixeira.

## 3. Google (login com Google)

Não precisa criar nada no Google Cloud: o passo 2.3 já cria o cliente de login.
Um ajuste vem depois do domínio pronto, e eu te guio na hora: em
**console.cloud.google.com → APIs e serviços → Credenciais → "Web client (auto created by Google Service)"**,
adicionar `https://<domínio-do-app>/__/auth/handler` em **URIs de redirecionamento autorizados**.
É isso que faz o login com Google funcionar no **iPhone com o app instalado**.

---

## 4. Hospedagem

Caminho recomendado (o `docs/DEPLOY.md` explica cada tela):

| Peça | Provedor | Custo aproximado |
|---|---|---|
| App (o que as pessoas abrem) | **Vercel** (plano Hobby) | grátis |
| API + banco + fila | **Railway** (plano Hobby) | ~US$ 5 a 10/mês |
| Fotos de prova | **Cloudflare R2** | grátis até 10 GB |

### 4.1 Vercel
1. Crie a conta em **vercel.com** entrando com o GitHub (o código precisa estar num repositório do GitHub).
2. Me convide como membro do time (Settings → Members), ou me diga o usuário do GitHub dono do repositório.

### 4.2 Railway
1. Crie a conta em **railway.com** (pode entrar com o GitHub) e assine o plano **Hobby** (precisa de cartão).
2. Crie um projeto vazio chamado `everest` e me convide (Project Settings → Members).

### 4.3 Cloudflare R2 (fotos)
1. Crie a conta em **dash.cloudflare.com** → R2 → ative o R2 (pede cartão, mas o uso cabe na faixa grátis).
2. Crie o bucket `everest-provas` (**privado**, que é o padrão).
3. **Manage R2 API Tokens → Create API token** → permissão "Object Read & Write" só nesse bucket.
   Aparecem `Access Key ID` e `Secret Access Key` (**SEGREDO**) e o endpoint
   `https://<id-da-conta>.r2.cloudflarestorage.com`. Você vai colar esses três na Railway (passo 4.4).

### 4.4 Variáveis que **você** cola na Railway (serviço da API → Variables)
Eu deixo o resto preenchido. Você cola só estas:

| Variável | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | o texto gerado no passo 2.5 (**SEGREDO**) |
| `S3_ACCESS_KEY_ID` | do passo 4.3 (**SEGREDO**) |
| `S3_SECRET_ACCESS_KEY` | do passo 4.3 (**SEGREDO**) |
| `PIX_COPIA_E_COLA` | o "Pix copia e cola" do QR de R$ 50 (o texto longo que começa com `000201`) |

O `PIX_COPIA_E_COLA` é o que vira o QR code da tela de pagamento. Se um dia mudar o valor ou a conta,
basta trocar essa variável (o app confere o código ao iniciar e avisa se estiver errado).

---

## 5. Domínio

1. Registre o domínio no **registro.br** (para `.com.br`), se ainda não tiver.
2. Escolha o endereço do app. Sugestão: `desafio.<seu-dominio>.com.br`.
3. Quando a Vercel estiver pronta, ela mostra um registro DNS (tipo `CNAME`) para criar.
   No registro.br: **Domínios → seu domínio → DNS → Editar zona** → criar o registro que a Vercel pedir.
   Eu te digo o valor exato na hora.

---

## 6. Quem é o admin (embaixador)

O painel do embaixador (confirmar pagamentos, ver fotos e dados, exportar a planilha) só abre para
contas com papel de admin. Para isso:

1. Me diga o **e-mail Google** do embaixador (item 5 do resumo).
2. Eu crio o admin no banco com esse e-mail.
3. O embaixador entra no app com **"Continuar com Google" usando exatamente esse e-mail**.
   (Com e-mail e senha não funciona para o admin, porque o app só liga a conta a um e-mail verificado,
   e o Google já vem verificado.)

---

## 7. Como funciona o pagamento (para o embaixador)

1. A pessoa cria a conta, preenche os dados e garante a vaga. A vaga fica **reservada**.
2. Ela vê o QR do Pix de R$ 50, paga no app do banco e toca em **"Já fiz o pagamento"**.
3. No app, em **Perfil → Painel do embaixador**, aparece a lista **"Pagamentos a confirmar"**.
4. Confira o Pix no extrato do banco e toque em **Confirmar**. Na hora, o acesso dela é liberado.
   - Não achou o Pix? Toque em **Não recebi**: ela vê o aviso "Não localizamos seu pagamento" e pode avisar de novo.
   - Inscrição que nunca pagou e está ocupando vaga? Abra a pessoa e toque em **Remover inscrição**
     (só funciona para quem não foi confirmado). A vaga volta a ficar livre.
5. A qualquer momento: **Baixar CSV** gera a planilha com os dados de todos (abre no Excel).

> O app **não** confere o pagamento sozinho: quem confirma é o embaixador, olhando o extrato.

---

## 8. Conteúdo que ainda falta (não é conta, mas bloqueia o lançamento)

- **@ do Instagram** do desafio (aparece nas regras e no story).
- **Texto da política de privacidade** (o rascunho está no app; precisa ser revisado).
- **Prêmio**: confirmar o texto "camiseta de treino, whey e creatina".
- **Data de início** do desafio e **idade mínima** (hoje 18 anos).
