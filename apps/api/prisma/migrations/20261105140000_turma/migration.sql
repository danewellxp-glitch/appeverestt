-- Hub da turma (R23): hora real do fechamento do dia (`concluidoEm`, X22), opt-out das cutucadas,
-- cutucadas (uma por remetente/destinatário/dia, X21), foto do treino visível para a turma por padrão
-- (X24) e pose do dia (uma por dia do desafio, X25). Gerado com
-- `prisma migrate diff --from-migrations --to-schema-datamodel --script` + backfill de `concluidoEm`.
-- O índice parcial "FotoProva_diaId_tipo_recebida_key" (R17) não é tocado.

-- AlterTable
ALTER TABLE "DiaDesafio" ADD COLUMN     "concluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FotoProva" ADD COLUMN     "visivelTurma" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "aceitaCutucadas" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Cutucada" (
    "id" TEXT NOT NULL,
    "deId" TEXT NOT NULL,
    "paraId" TEXT NOT NULL,
    "numeroDia" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cutucada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoseDia" (
    "id" TEXT NOT NULL,
    "desafioId" TEXT NOT NULL,
    "numeroDia" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoseDia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cutucada_paraId_numeroDia_idx" ON "Cutucada"("paraId", "numeroDia");

-- CreateIndex
CREATE UNIQUE INDEX "Cutucada_deId_paraId_numeroDia_key" ON "Cutucada"("deId", "paraId", "numeroDia");

-- CreateIndex
CREATE UNIQUE INDEX "PoseDia_desafioId_numeroDia_key" ON "PoseDia"("desafioId", "numeroDia");

-- AddForeignKey
ALTER TABLE "Cutucada" ADD CONSTRAINT "Cutucada_deId_fkey" FOREIGN KEY ("deId") REFERENCES "Participante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cutucada" ADD CONSTRAINT "Cutucada_paraId_fkey" FOREIGN KEY ("paraId") REFERENCES "Participante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoseDia" ADD CONSTRAINT "PoseDia_desafioId_fkey" FOREIGN KEY ("desafioId") REFERENCES "Desafio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoseDia" ADD CONSTRAINT "PoseDia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Participante"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: dias já fechados ganham a última edição como hora do fechamento (melhor aproximação).
UPDATE "DiaDesafio" SET "concluidoEm" = "atualizadoEm" WHERE "concluido";
