import { Prisma, type Participante, type PrismaClient, type StatusPagamento } from '@prisma/client';
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
 * Menor número de vaga livre em 1..totalVagas (null = esgotado). Remover uma inscrição não paga
 * libera o número, então `count + 1` colidiria no índice único. Chamar dentro da transação,
 * depois do `FOR UPDATE` na linha do desafio (é o que serializa as inscrições concorrentes).
 */
export async function menorVagaLivre(
  tx: Prisma.TransactionClient,
  desafioId: string,
  totalVagas: number,
): Promise<number | null> {
  const [livre] = await tx.$queryRaw<{ n: number }[]>`
    SELECT g.n::int AS n
    FROM generate_series(1, ${totalVagas}::int) AS g(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM "Participante" p WHERE p."desafioId" = ${desafioId} AND p."vagaNumero" = g.n
    )
    ORDER BY g.n
    LIMIT 1`;
  return livre?.n ?? null;
}

/**
 * Inscrição com trava de vagas (seção 9.1). Usada pela API, pelo seed e pelos scripts.
 * - `FOR UPDATE` na linha do desafio serializa inscrições concorrentes.
 * - Índices únicos são a segunda linha de defesa (P2002 => já inscrito).
 * - Idempotente: quem já está inscrito recebe a inscrição existente.
 * - Embaixador (Q3): ocupa vaga só se `embaixadorOcupaVaga`; ignora inscrições fechadas.
 * - Pagamento (X12): nasce PENDENTE (vaga reservada); embaixador sempre CONFIRMADO (não paga).
 *   `pagamentoStatus` só vale para inscrições novas (o seed passa CONFIRMADO).
 */
export async function inscrever(
  prisma: PrismaClient,
  params: {
    slug: string;
    usuarioId: string;
    embaixador?: boolean;
    agora?: Date;
    pagamentoStatus?: StatusPagamento;
  },
): Promise<ResultadoInscricao> {
  const embaixador = params.embaixador ?? false;
  const pagamentoStatus: StatusPagamento = embaixador ? 'CONFIRMADO' : (params.pagamentoStatus ?? 'PENDENTE');
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
              data: {
                ehEmbaixador: true,
                ...(existente.pagamentoStatus === 'CONFIRMADO'
                  ? {}
                  : { pagamentoStatus: 'CONFIRMADO', pagamentoConfirmadoEm: agora }),
              },
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
          vagaNumero = await menorVagaLivre(tx, d.id, d.totalVagas);
          if (vagaNumero === null) throw new ErroApp('VAGAS_ESGOTADAS');
        }

        const participante = await tx.participante.create({
          data: {
            desafioId: d.id,
            usuarioId: params.usuarioId,
            vagaNumero,
            ehEmbaixador: embaixador,
            pagamentoStatus,
            pagamentoConfirmadoEm: pagamentoStatus === 'CONFIRMADO' ? agora : null,
          },
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
