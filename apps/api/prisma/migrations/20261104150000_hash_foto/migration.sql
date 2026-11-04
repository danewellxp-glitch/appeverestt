-- Sinal de foto repetida para o embaixador (R20, X20): dHash de 64 bits (16 hex) da versão processada.
-- Nulo nas fotos antigas até rodar `node dist/cli/scripts/hash-fotos.js`. Sem índice: a comparação é
-- feita em memória (≤ ~5 mil fotos por desafio).
ALTER TABLE "FotoProva" ADD COLUMN "hashPerceptual" TEXT;
