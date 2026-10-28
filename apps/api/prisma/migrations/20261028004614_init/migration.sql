-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('USUARIO', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoFoto" AS ENUM ('AGUA', 'EXERCICIO', 'LEITURA');

-- CreateEnum
CREATE TYPE "StatusFoto" AS ENUM ('PENDENTE', 'ENVIADA', 'CONFIRMADA', 'REJEITADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'USUARIO',
    "tokenVersao" INTEGER NOT NULL DEFAULT 0,
    "aceitouTermosEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Desafio" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataInicio" DATE NOT NULL,
    "totalDias" INTEGER NOT NULL DEFAULT 30,
    "totalVagas" INTEGER NOT NULL DEFAULT 50,
    "embaixadorOcupaVaga" BOOLEAN NOT NULL DEFAULT true,
    "inscricoesAbertas" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "instagramHandle" TEXT NOT NULL,
    "hashtag" TEXT NOT NULL DEFAULT 'DESAFIO30EVEREST',
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Desafio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participante" (
    "id" TEXT NOT NULL,
    "desafioId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "vagaNumero" INTEGER,
    "ehEmbaixador" BOOLEAN NOT NULL DEFAULT false,
    "dataInscricao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaDesafio" (
    "id" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "numeroDia" INTEGER NOT NULL,
    "aguaMl" INTEGER NOT NULL DEFAULT 0,
    "exercicio" BOOLEAN NOT NULL DEFAULT false,
    "paginasLidas" INTEGER NOT NULL DEFAULT 0,
    "storyPostado" BOOLEAN NOT NULL DEFAULT false,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "invalidado" BOOLEAN NOT NULL DEFAULT false,
    "motivoInvalidacao" TEXT,
    "invalidadoPorId" TEXT,
    "invalidadoEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaDesafio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FotoProva" (
    "id" TEXT NOT NULL,
    "diaId" TEXT NOT NULL,
    "tipo" "TipoFoto" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "status" "StatusFoto" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoProva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Desafio_slug_key" ON "Desafio"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Participante_desafioId_usuarioId_key" ON "Participante"("desafioId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Participante_desafioId_vagaNumero_key" ON "Participante"("desafioId", "vagaNumero");

-- CreateIndex
CREATE INDEX "DiaDesafio_participanteId_concluido_idx" ON "DiaDesafio"("participanteId", "concluido");

-- CreateIndex
CREATE UNIQUE INDEX "DiaDesafio_participanteId_numeroDia_key" ON "DiaDesafio"("participanteId", "numeroDia");

-- CreateIndex
CREATE INDEX "FotoProva_status_criadoEm_idx" ON "FotoProva"("status", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "FotoProva_diaId_tipo_key" ON "FotoProva"("diaId", "tipo");

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_desafioId_fkey" FOREIGN KEY ("desafioId") REFERENCES "Desafio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaDesafio" ADD CONSTRAINT "DiaDesafio_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoProva" ADD CONSTRAINT "FotoProva_diaId_fkey" FOREIGN KEY ("diaId") REFERENCES "DiaDesafio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
