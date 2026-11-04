import type { FotoParecida, TipoFoto } from '@everest/shared';
import type { PrismaService } from '../../prisma/prisma.service';
import { IndiceHashes } from '../fotos/hash-perceptual';

/** Foto com hash perceptual de um desafio (sinal de foto parecida para o embaixador, X20). */
export interface FotoComHash {
  id: string;
  hash: string;
  tipo: TipoFoto;
  numeroDia: number;
  participanteId: string;
  nome: string;
  /** O dia está na fila do embaixador: concluído, não invalidado e ainda não aprovado. */
  paraRevisar: boolean;
}

/**
 * Todas as fotos com hash do desafio (ENVIADA/CONFIRMADA, de qualquer participante), da mais antiga
 * para a mais nova, numa consulta só. A comparação é em memória (`IndiceHashes`): ≤ ~5 mil fotos.
 */
export function fotosComHash(prisma: PrismaService, desafioId: string): Promise<FotoComHash[]> {
  return prisma.$queryRaw<FotoComHash[]>`
    SELECT f.id, f."hashPerceptual" AS hash, f.tipo::text AS tipo, d."numeroDia", d."participanteId", u.nome,
           (d.concluido AND NOT d.invalidado AND d."conferidoEm" IS NULL) AS "paraRevisar"
    FROM "FotoProva" f
    JOIN "DiaDesafio" d ON d.id = f."diaId"
    JOIN "Participante" p ON p.id = d."participanteId"
    JOIN "Usuario" u ON u.id = p."usuarioId"
    WHERE p."desafioId" = ${desafioId}
      AND f.status IN ('ENVIADA', 'CONFIRMADA')
      AND f."hashPerceptual" IS NOT NULL
    ORDER BY f."criadoEm", f.id`;
}

/**
 * Comparador das fotos de um desafio. Empate de distância fica com a foto mais antiga (a "original"),
 * porque `fotos` vem do `fotosComHash` em ordem de envio.
 */
export class FotosParecidas {
  private readonly indice: IndiceHashes<FotoComHash>;
  private readonly porId: Map<string, FotoComHash>;

  constructor(private readonly fotos: readonly FotoComHash[]) {
    this.indice = new IndiceHashes(fotos);
    this.porId = new Map(fotos.map((f) => [f.id, f]));
  }

  /** A foto mais parecida com `fotoId` (outra, de qualquer participante), ou null. */
  daFoto(fotoId: string): FotoParecida | null {
    const foto = this.porId.get(fotoId);
    if (!foto) return null;
    const achada = this.indice.maisParecido(foto.hash, (o) => o.id !== foto.id);
    if (!achada) return null;
    const outra = achada.item;
    return {
      participanteId: outra.participanteId,
      nome: outra.nome,
      numeroDia: outra.numeroDia,
      tipo: outra.tipo,
      mesmaPessoa: outra.participanteId === foto.participanteId,
    };
  }

  /** Por participante, os dias para revisar com alguma foto parecida com outra (ordem crescente). */
  diasParaRevisar(): Map<string, number[]> {
    const dias = new Map<string, Set<number>>();
    for (const f of this.fotos) {
      if (!f.paraRevisar || dias.get(f.participanteId)?.has(f.numeroDia)) continue;
      if (!this.indice.maisParecido(f.hash, (o) => o.id !== f.id)) continue;
      const doParticipante = dias.get(f.participanteId) ?? new Set<number>();
      doParticipante.add(f.numeroDia);
      dias.set(f.participanteId, doParticipante);
    }
    return new Map([...dias].map(([id, ns]) => [id, [...ns].sort((a, b) => a - b)]));
  }
}
