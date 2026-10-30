-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "aceitouMarketingEm" TIMESTAMP(3),
ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "dataNascimento" DATE,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "uf" CHAR(2),
ADD COLUMN     "whatsapp" TEXT;

