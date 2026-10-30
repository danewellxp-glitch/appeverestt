-- AlterTable
ALTER TABLE "DiaDesafio" ADD COLUMN     "conferidoEm" TIMESTAMP(3),
ADD COLUMN     "conferidoPorId" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "excluidoEm" TIMESTAMP(3),
ADD COLUMN     "firebaseUid" TEXT,
ADD COLUMN     "fotoUrl" TEXT,
ALTER COLUMN "senhaHash" DROP NOT NULL,
ALTER COLUMN "aceitouTermosEm" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_firebaseUid_key" ON "Usuario"("firebaseUid");

