-- CHECK constraints e índice parcial (escritos à mão; o Prisma não gera estes).
ALTER TABLE "Participante" ADD CONSTRAINT "vaga_numero_positiva" CHECK ("vagaNumero" IS NULL OR "vagaNumero" >= 1);
ALTER TABLE "DiaDesafio"   ADD CONSTRAINT "numero_dia_valido"    CHECK ("numeroDia" BETWEEN 1 AND 365);
ALTER TABLE "DiaDesafio"   ADD CONSTRAINT "agua_valida"          CHECK ("aguaMl" BETWEEN 0 AND 20000);
ALTER TABLE "DiaDesafio"   ADD CONSTRAINT "paginas_validas"      CHECK ("paginasLidas" BETWEEN 0 AND 2000);
ALTER TABLE "Desafio"      ADD CONSTRAINT "total_vagas_valido"   CHECK ("totalVagas" BETWEEN 1 AND 10000);
CREATE UNIQUE INDEX "um_desafio_ativo" ON "Desafio" ("ativo") WHERE "ativo" = true;
