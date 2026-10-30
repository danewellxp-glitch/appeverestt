-- Pagamento da inscrição por Pix manual (X12) e feedback do participante (X13).
-- Gerado com `prisma migrate diff --from-migrations --to-schema-datamodel --script` e completado à mão
-- (backfill e CHECK, que o Prisma não gera).

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'INFORMADO', 'CONFIRMADO');

-- AlterTable
ALTER TABLE "Participante" ADD COLUMN     "pagamentoConfirmadoEm" TIMESTAMP(3),
ADD COLUMN     "pagamentoConfirmadoPorId" TEXT,
ADD COLUMN     "pagamentoInformadoEm" TIMESTAMP(3),
ADD COLUMN     "pagamentoStatus" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE';

-- Backfill (escrito à mão): quem se inscreveu antes de existir pagamento não pode ser bloqueado.
UPDATE "Participante" SET "pagamentoStatus" = 'CONFIRMADO', "pagamentoConfirmadoEm" = now();

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "oQueAchou" TEXT NOT NULL,
    "oQueMudou" TEXT NOT NULL,
    "autorizaDivulgacao" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_participanteId_key" ON "Feedback"("participanteId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK (escrito à mão; o Prisma não gera).
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_nota_check" CHECK ("nota" BETWEEN 1 AND 5);
