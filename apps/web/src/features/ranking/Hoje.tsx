import type { PessoaHoje } from '@everest/shared';
import { BellRing, Check, PartyPopper, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/ui/Avatar';
import { Alerta, Skeleton } from '../../components/ui/basicos';
import { Barra } from '../../components/ui/Barra';
import { Botao } from '../../components/ui/Botao';
import { Contador } from '../../components/ui/Contador';
import { formatarHora } from '../../lib/datas';
import { useDesafioAtual, useMe, useTurmaHoje } from '../../lib/queries';
import { useCutucar } from './useCutucar';

function Vazio({ icone, titulo, texto }: { icone: ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-superficie px-6 py-10 text-center shadow-[inset_0_0_0_1px_var(--borda)]">
      {icone}
      <p className="font-semibold">{titulo}</p>
      <p className="text-sm text-texto-2">{texto}</p>
    </div>
  );
}

function Linha({ pessoa, souEu, children }: { pessoa: PessoaHoje; souEu: boolean; children?: ReactNode }) {
  return (
    <li
      className={`flex min-h-[60px] items-center gap-3 rounded-[20px] bg-superficie py-2 pr-2.5 pl-2.5 ${souEu ? 'shadow-[inset_0_0_0_2px_var(--vermelho)]' : 'shadow-[inset_0_0_0_1px_var(--borda)]'}`}
    >
      <Avatar nome={pessoa.nomeExibicao} fotoUrl={pessoa.fotoUrl} />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {pessoa.nomeExibicao}
        {souEu && <span className="font-normal text-texto-2"> (você)</span>}
      </span>
      {children}
    </li>
  );
}

/**
 * Aba "Hoje" (R23): barra coletiva do dia, quem já fechou (com a hora) e quem falta, com o
 * botão "Cutucar" (uma notificação por pessoa por dia).
 */
export function Hoje() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const meuId = me?.participacao?.participanteId;
  const hojeQ = useTurmaHoje(slug);
  const desafioQ = useDesafioAtual();
  const cutucar = useCutucar(slug);
  const timezone = desafioQ.data?.timezone;

  if (hojeQ.isPending) {
    return (
      <div role="status" aria-label="Carregando o dia da turma" className="flex flex-col gap-2">
        <Skeleton className="h-32 rounded-[28px]" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-[20px]" />
        ))}
      </div>
    );
  }
  if (hojeQ.isError) {
    return (
      <Alerta
        tipo="erro"
        acao={
          <Botao variante="secundario" tamanho="sm" onClick={() => void hojeQ.refetch()}>
            Tentar de novo
          </Botao>
        }
      >
        {hojeQ.error.message}
      </Alerta>
    );
  }

  const t = hojeQ.data;
  if (t.status === 'NAO_INICIADO') {
    return (
      <Vazio
        icone={<Sun className="size-8 text-texto-2" aria-hidden />}
        titulo="O desafio ainda não começou"
        texto="No primeiro dia, você acompanha aqui quem já fechou o dia e quem ainda falta."
      />
    );
  }
  if (t.status === 'ENCERRADO' || t.diaAtual === null) {
    return (
      <Vazio
        icone={<PartyPopper className="size-8 text-texto-2" aria-hidden />}
        titulo="O desafio terminou"
        texto="Não há mais dias para fechar. Confira o resultado final na aba Ranking."
      />
    );
  }

  const total = Math.max(t.totalParticipantes, t.fecharam.length + t.faltam.length);
  const cutucados = new Set(t.minhasCutucadasHoje);
  const cutucando = cutucar.isPending ? cutucar.variables?.participanteId : undefined;

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="A turma hoje"
        className="surgir grid gap-2 rounded-[28px] bg-pop p-4 text-pop-texto"
      >
        <p className="flex items-baseline gap-2">
          <Contador valor={t.fecharam.length} className="font-display text-[52px] leading-[0.9] font-extrabold" />
          <span className="text-[13px]">
            de {total} {t.fecharam.length === 1 ? 'fechou' : 'fecharam'} hoje · dia {t.diaAtual}
          </span>
        </p>
        <Barra valor={t.fecharam.length} maximo={total} rotulo="Participantes que fecharam o dia" tom="pop" />
      </section>

      <section aria-labelledby="titulo-fecharam" className="grid gap-2">
        <h2 id="titulo-fecharam" className="rotulo">
          Fecharam o dia · {t.fecharam.length}
        </h2>
        {t.fecharam.length === 0 ? (
          <Vazio
            icone={<Sun className="size-8 text-texto-2" aria-hidden />}
            titulo="Ninguém fechou o dia ainda"
            texto="Seja a primeira pessoa da turma a fechar o dia de hoje."
          />
        ) : (
          <ul className="grid gap-2">
            {t.fecharam.map((p) => (
              <Linha key={p.participanteId} pessoa={p} souEu={p.participanteId === meuId}>
                {p.concluidoEm && (
                  <time dateTime={p.concluidoEm} className="shrink-0 px-1.5 text-sm text-texto-2 tabular-nums">
                    às {formatarHora(p.concluidoEm, timezone)}
                  </time>
                )}
              </Linha>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-faltam" className="grid gap-2">
        <h2 id="titulo-faltam" className="rotulo">
          Ainda não fecharam · {t.faltam.length}
        </h2>
        {t.faltam.length === 0 ? (
          <Vazio
            icone={<PartyPopper className="size-8 text-vermelho-texto" aria-hidden />}
            titulo="Todo mundo fechou o dia!"
            texto="A turma inteira já cumpriu o dia de hoje."
          />
        ) : (
          <ul className="grid gap-2">
            {t.faltam.map((p) => {
              const souEu = p.participanteId === meuId;
              const jaCutucou = cutucados.has(p.participanteId);
              return (
                <Linha key={p.participanteId} pessoa={p} souEu={souEu}>
                  {souEu ? (
                    <Link to="/hoje" className="press shrink-0 rounded-full bg-vermelho px-3.5 py-2.5 text-sm font-semibold text-sobre-vermelho">
                      Fechar meu dia
                    </Link>
                  ) : jaCutucou ? (
                    <span className="inline-flex shrink-0 items-center gap-1 px-2 text-sm font-semibold text-texto-2">
                      Cutucado <Check className="size-4" aria-hidden />
                    </span>
                  ) : !p.aceitaCutucadas ? (
                    <span className="max-w-[7.5rem] shrink-0 text-right text-xs text-texto-2">não recebe cutucadas</span>
                  ) : (
                    <Botao
                      variante="secundario"
                      tamanho="sm"
                      className="shrink-0"
                      icone={<BellRing className="size-4" aria-hidden />}
                      carregando={cutucando === p.participanteId}
                      disabled={cutucar.isPending}
                      aria-label={`Cutucar ${p.nomeExibicao}`}
                      onClick={() => cutucar.mutate(p)}
                    >
                      Cutucar
                    </Botao>
                  )}
                </Linha>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs leading-relaxed text-texto-2">
        A cutucada é uma notificação no celular da pessoa. Dá para cutucar cada pessoa uma vez por dia. Quem não quiser
        receber pode desligar no Perfil.
      </p>
    </div>
  );
}
