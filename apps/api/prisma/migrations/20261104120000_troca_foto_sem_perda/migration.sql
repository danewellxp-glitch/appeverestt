-- Trocar uma foto não apaga a anterior antes de a nova chegar (R17).
-- A foto nova nasce PENDENTE ao lado da antiga; na confirmação, a antiga sai e a nova vira ENVIADA.
-- Por isso a unicidade (dia, tipo) passa a valer só para fotos que já chegaram (não PENDENTE).
-- O índice parcial vive só no SQL (como "um_desafio_ativo"); o schema.prisma tem o índice comum.
DROP INDEX "FotoProva_diaId_tipo_key";
CREATE UNIQUE INDEX "FotoProva_diaId_tipo_recebida_key" ON "FotoProva" ("diaId", "tipo") WHERE "status" <> 'PENDENTE';
CREATE INDEX "FotoProva_diaId_tipo_idx" ON "FotoProva" ("diaId", "tipo");
