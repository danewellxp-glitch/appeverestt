import { Prisma, type Participante, type PrismaClient } from '@prisma/client';
import { calcularDiaAtual } from '@everest/shared';
import { ErroApp } from '../../common/erros';

export interface ResultadoInscricao {
  participante: Participante;
  desafioId: string;
  criada: boolean;
}

interface LinhaDesafio {
  id: string;
  totalVagas: number;
  totalDias: number;
  inscricoesAbertas: boolean;
  embaixadorOcupaVaga: boolean;
  dataInicio: Date;
  timezone: string;
}

/**
 * Inscrição com trava de vagas (seção 9.1). Usada pela API, pelo seed e pelos scripts.
 * - `FOR UPDATE` na linha do desafio serializa inscrições concorrentes.
 * - Índices únicos são a segunda linha de defesa (P2002 => já inscrito).
 * - Idempotente: quem já está inscrito recebe a inscrição existente.
 * - Embaixador (Q3): ocupa vaga só se `embaixadorOcupaVaga`; ignora inscrições fechadas.
 */
export async function inscrever(
  prisma: PrismaClient,
  params: { slug: string; usuarioId: string; embaixador?: boolean; agora?: Date },
): Promise<ResultadoInscricao> {
  const embaixador = params.embaixador ?? false;
  const agora = params.agora ?? new Date();
  try {
    return await prisma.$transaction(
      async (tx) => {
        const [d] = await tx.$queryRaw<LinhaDesafio[]>`
          SELECT id, "totalVagas", "totalDias", "inscricoesAbertas", "embaixadorOcupaVaga", "dataInicio", timezone
          FROM "Desafio" WHERE slug = ${params.slug} AND ativo = true FOR UPDATE`;
        if (!d) throw new ErroApp('NAO_ENCONTRADO', 'Desafio não encontrado ou inativo.');

        const existente = await tx.participante.findUnique({
          where: { desafioId_usuarioId: { desafioId: d.id, usuarioId: params.usuarioId } },
        });
        if (existente) {
          if (embaixador && !existente.ehEmbaixador) {
            const atualizado = await tx.participante.update({
              where: { id: existente.id },
              data: { ehEmbaixador: true },
            });
            return { participante: atualizado, desafioId: d.id, criada: false };
          }
          return { participante: existente, desafioId: d.id, criada: false };
        }

        if (!embaixador) {
          const { status } = calcularDiaAtual(
            d.dataInicio.toISOString().slice(0, 10),
            agora,
            d.timezone,
            d.totalDias,
          );
          if (status === 'ENCERRADO') throw new ErroApp('DESAFIO_ENCERRADO');
          if (!d.inscricoesAbertas) throw new ErroApp('INSCRICOES_FECHADAS');
        }

        const ocupaVaga = !embaixador || d.embaixadorOcupaVaga;
        let vagaNumero: number | null = null;
        if (ocupaVaga) {
          const ocupadas = await tx.participante.count({
            where: { desafioId: d.id, vagaNumero: { not: null } },
          });
          if (ocupadas >= d.totalVagas) throw new ErroApp('VAGAS_ESGOTADAS');
          vagaNumero = ocupadas + 1;
        }

        const participante = await tx.participante.create({
          data: { desafioId: d.id, usuarioId: params.usuarioId, vagaNumero, ehEmbaixador: embaixador },
        });
        return { participante, desafioId: d.id, criada: true };
      },
      { maxWait: 15_000, timeout: 15_000 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const existente = await prisma.participante.findFirst({
        where: { usuarioId: params.usuarioId, desafio: { slug: params.slug } },
      });
      if (existente) return { participante: existente, desafioId: existente.desafioId, criada: false };
    }
    throw e;
  }
}
