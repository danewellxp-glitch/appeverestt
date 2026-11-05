-- Notificações push (R22): uma linha por aparelho/navegador com o push ativo. O endpoint é único; se
-- outra pessoa entrar no mesmo aparelho, a linha muda de dono. Some junto com o usuário (CASCADE) e é
-- apagada na exclusão da conta (X5). Gerado com `prisma migrate diff --from-migrations --to-schema-datamodel --script`.

-- CreateTable
CREATE TABLE "PushInscricao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoEnvioEm" TIMESTAMP(3),
    "falhas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushInscricao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushInscricao_endpoint_key" ON "PushInscricao"("endpoint");

-- CreateIndex
CREATE INDEX "PushInscricao_usuarioId_idx" ON "PushInscricao"("usuarioId");

-- AddForeignKey
ALTER TABLE "PushInscricao" ADD CONSTRAINT "PushInscricao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

