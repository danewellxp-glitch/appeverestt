# Pedidos do TT para o Dan

Pedidos que ficam fora do que o TT pode mudar sozinho (área sensível, testes ou lógica do app).

## 2026-11-04 · branch `tt/textos-desafio-premio`

Contexto: o desafio passa a ser comunicado como **3 hábitos** (água, treino, leitura). Prova do dia
(fotos) e story continuam obrigatórios, mas como forma de comprovar os 3 hábitos. O TT disse que o
Dan já está ciente.

- [x] **Teste E2E desatualizado:** `apps/web/e2e/smoke.spec.ts` (linha ~68) procura o título
      `'5 hábitos. Todo dia.'` na landing. O título novo é "3 hábitos simples, todos os dias!".
      Atualizar o teste.
- [x] **Revisar o "3 requisitos" x 5 itens no app:** a nota "O dia só conta quando os 3 requisitos
      estão cumpridos" (landing e /regras) convive com a lista "Todo dia" de 5 itens e com o
      check-in, que mostra "k de 5 requisitos". Decidir se a lista e o check-in mudam de texto
      (ex.: separar "3 hábitos" de "2 provas") — mexe em `features/checkin` e `features/desafio`.

Resolvido em 2026-11-04: o teste usa o título novo. A nota diária passou a dizer "O dia só conta com
os 3 hábitos feitos e comprovados, com as fotos e o story", o que bate com a lista de 5 itens e o
contador do check-in sem mexer em lógica. Validação e deploy: `scripts/validar-tt.sh --deploy "texto"`.
