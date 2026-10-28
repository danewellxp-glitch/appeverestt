# Prompt de operação: Frontend v2 (Cursor)

> **Para o humano.** Este arquivo diz como tocar a migração do frontend com o Cursor. O plano completo está em `docs/FRONTEND.md`, e a referência visual em `docs/prototipo/everest-prototipo.html` (abra no navegador; o painel lateral navega pelas 14 telas).

## Antes de começar

1. Confira se estes arquivos estão no projeto (vieram no zip `everest-frontend-v2.zip`):
   - `docs/FRONTEND.md`: o plano (fases R0 a R12)
   - `docs/PROMPT_FRONTEND.md`: este arquivo
   - `docs/prototipo/everest-prototipo.html`: o protótipo navegável
   - `docs/FRONTEND-ESTADO-ATUAL.md`: o retrato do código atual (era o antigo `FRONTEND.md`)
2. Suba a infra local: `docker compose up -d`.
3. A partir da R1, mantenha também o emulador do Firebase rodando num terminal separado: `pnpm emu`.
4. Use o Cursor em **modo Agent**, com o modelo mais forte disponível.
5. **Um chat novo por fase.** Contexto limpo é o que mais evita alucinação.
6. Antes de mandar a fase seguinte, rode você mesmo os comandos da "DoD" da fase. Se algo falhar, cole o erro **no mesmo chat** e peça a correção.
7. Faça commit ao fim de cada fase. Se o agente bagunçar, `git reset --hard` volta ao último commit.

---

## Mensagem da fase R0 (primeiro chat)

```
Você vai executar a migração "Frontend v2" deste monorepo.

Leia por inteiro, nesta ordem:
@docs/FRONTEND.md
@docs/FRONTEND-ESTADO-ATUAL.md
@docs/PROGRESSO.md
@docs/DECISOES.md
@docs/PROMPT_CURSOR.md (só as seções 2, 5, 9 e 14)

Abra também docs/prototipo/everest-prototipo.html para entender o visual (é um protótipo HTML com dados falsos; não copie o JS dele).

Execute SOMENTE a fase R0 da seção 12 do FRONTEND.md.
Regras: siga a seção 0 do FRONTEND.md; liste os arquivos que vai tocar antes de começar; rode os comandos de verdade; não avance para a R1.
Ao terminar, entregue o relatório no formato da seção 14 e PARE.
```

## Mensagem das fases seguintes (troque o N)

```
Continuação da migração "Frontend v2".

Leia: @docs/FRONTEND.md @docs/PROGRESSO.md @docs/DECISOES.md
Consulte @docs/FRONTEND-ESTADO-ATUAL.md nas seções que a fase citar.
Referência visual: docs/prototipo/everest-prototipo.html (tela correspondente pelo hash, ex.: #desafio, #dia).

Execute SOMENTE a fase RN da seção 12 do FRONTEND.md.
- Siga a seção 0 (regras de trabalho).
- Antes de codar, liste os arquivos que vai criar, alterar ou remover.
- Rode typecheck, lint, testes e build relevantes e mostre o resultado real.
- Atualize docs/PROGRESSO.md marcando [x] só o que foi verificado.
- Entregue o relatório da seção 14 e PARE. Não comece a fase seguinte.
```

## Mensagens de correção (use no mesmo chat da fase)

**Quando um comando falhar:**
```
Rodei <comando> e deu este erro:
<cole o erro>
Corrija sem mexer em arquivos fora do escopo da fase RN. Rode o comando de novo e me mostre a saída.
```

**Quando a tela ficar diferente do protótipo:**
```
A tela <rota> está diferente do protótipo (#<hash>) nestes pontos:
- <ex.: o card de destaque não tem a borda em gradiente>
- <ex.: o título deveria ser Big Shoulders 38px em caixa alta>
Ajuste usando só os tokens da seção 6 do FRONTEND.md. Confira nos dois temas.
```

**Quando o agente quiser inventar:**
```
Pare. Isso não está no FRONTEND.md. Registre como pendência em docs/DECISOES.md (com TODO_DECISAO) e siga com o que está especificado.
```

**Quando o agente travar (mesmo erro 3 vezes):**
```
Descreva o erro, suas hipóteses e o que já tentou. Não tente mais nada até eu responder.
```

---

## Ordem e o que conferir em cada fase

| Fase | Entrega | Confira você mesmo antes de seguir |
|---|---|---|
| R0 | Linha de base, decisões, regras do Cursor | `pnpm --filter web build` passa |
| R1 | Backend: Firebase, perfil, feed, conferência | `pnpm --filter api test:e2e` todo verde |
| R2 | Tipos, schemas e altitude no shared | `pnpm --filter @everest/shared test` |
| R3 | Tema claro/escuro, tokens, fontes | Troque o tema e recarregue: sem flash, nada ilegível |
| R4 | Componentes base + transições | `pnpm --filter web test` |
| R5 | Telas de auth + Firebase | Login por e-mail, Google no emulador, `/login` → `/entrar` |
| R6 | Home `/desafio` | O card "Seu dia" expande para a tela do dia |
| R7 | Check-in | Completar os 5 requisitos mostra o banner e o toast |
| R8 | Progresso, Ranking, Regras, Privacidade | A montanha anima; a sua posição aparece certa |
| R9 | Perfil + Admin | Tema persiste; excluir conta; aprovar e invalidar dia |
| R10 | PWA + polimento | `build` + `preview`; o app instala; as transições funcionam |
| R11 | Playwright, axe, Lighthouse | Números no relatório dentro da meta |
| R12 | Produção | Login Google no iPhone (app instalado) e no Android |

## O que precisa vir de você (não é trabalho do agente)

- **Projeto no Firebase Console** (R12): ativar os provedores Google e E-mail/senha, autorizar o domínio, gerar a conta de serviço e preencher as envs.
- **Domínio final** (Q15). Ele também vira o `VITE_FIREBASE_AUTH_DOMAIN`.
- **Respostas do Anderson:** @ do Instagram (Q1), link (Q2), texto de privacidade (Q8), logo final e tema padrão (X7).
