import type { FotoTreinoTurma, TreinosTurmaResposta } from '@everest/shared';
import { Camera, ChevronLeft, ChevronRight, Dumbbell, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Alerta, Skeleton } from '../../components/ui/basicos';
import { Botao } from '../../components/ui/Botao';
import { FolhaInferior } from '../../components/ui/FolhaInferior';
import { useDesafioAtual, useMe, useTreinosTurma } from '../../lib/queries';
import { FolhaPose, textoAutorPose } from './pose';

function CardPose({
  dados,
  ehHoje,
  aoSugerir,
}: {
  dados: TreinosTurmaResposta;
  ehHoje: boolean;
  aoSugerir: () => void;
}) {
  const { pose } = dados;
  if (pose) {
    return (
      <section aria-label="Pose do dia" className="grid gap-1 rounded-[28px] bg-pop p-4 text-pop-texto">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-pop-texto-2 uppercase">Pose do dia</span>
        <p className="font-display text-[26px] leading-[1.05] font-extrabold">{pose.texto}</p>
        <span className="flex items-center gap-1.5 text-[13px] text-pop-texto-2">
          <Avatar nome={pose.autor.nomeExibicao} fotoUrl={pose.autor.fotoUrl} tamanho="sm" />
          {textoAutorPose(pose.autor.nomeExibicao)}
        </span>
      </section>
    );
  }
  if (!ehHoje) return null;
  if (dados.possoSugerirPose) {
    return (
      <section aria-label="Pose do dia" className="grid gap-2 rounded-[28px] bg-pop p-4 text-pop-texto">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-pop-texto-2 uppercase">Pose do dia</span>
        <p className="text-[15px] font-semibold">Ninguém sugeriu a pose de hoje. Você já mandou o treino: sugira a pose da turma!</p>
        <Botao tamanho="sm" icone={<Sparkles className="size-4" aria-hidden />} onClick={aoSugerir} aria-haspopup="dialog">
          Sugerir a pose do dia
        </Botao>
      </section>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-superficie-2 px-3.5 py-3 text-[13px] text-texto-2">
      <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
      Ninguém sugeriu a pose de hoje ainda. Quem mandar a foto do treino primeiro escolhe.
    </p>
  );
}

/**
 * Aba "Treinos" (R23): fotos de treino da turma por dia (hoje por padrão, setas até o dia atual),
 * a pose do dia e a foto cheia numa folha ao tocar.
 */
export function Treinos() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  // null = o dia atual (mesma chave de cache usada no check-in).
  const [dia, setDia] = useState<number | null>(null);
  const treinosQ = useTreinosTurma(slug, dia);
  const desafioQ = useDesafioAtual();
  const [aberta, setAberta] = useState<FotoTreinoTurma | null>(null);
  const [sugerindo, setSugerindo] = useState(false);

  if (treinosQ.isPending) {
    return (
      <div role="status" aria-label="Carregando os treinos" className="flex flex-col gap-3">
        <Skeleton className="h-12 rounded-full" />
        <Skeleton className="h-24 rounded-[28px]" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-[20px]" />
          ))}
        </div>
      </div>
    );
  }
  if (treinosQ.isError) {
    return (
      <Alerta
        tipo="erro"
        acao={
          <Botao variante="secundario" tamanho="sm" onClick={() => void treinosQ.refetch()}>
            Tentar de novo
          </Botao>
        }
      >
        {treinosQ.error.message}
      </Alerta>
    );
  }

  const d = treinosQ.data;
  if (d.status === 'NAO_INICIADO' || d.dia === null) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-superficie px-6 py-10 text-center shadow-[inset_0_0_0_1px_var(--borda)]">
        <Dumbbell className="size-8 text-texto-2" aria-hidden />
        <p className="font-semibold">O desafio ainda não começou</p>
        <p className="text-sm text-texto-2">As fotos de treino da turma aparecem aqui a partir do primeiro dia.</p>
      </div>
    );
  }

  const mostrado = d.dia;
  // Encerrado: diaAtual é null e o padrão do servidor é o último dia do desafio.
  const ultimo = d.diaAtual ?? desafioQ.data?.totalDias ?? mostrado;
  const ehHoje = d.status === 'EM_ANDAMENTO' && mostrado === d.diaAtual;
  const irPara = (n: number) => setDia(n >= ultimo ? null : n);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Escolher o dia" className="flex items-center justify-between gap-2 rounded-full bg-superficie-2 p-1">
        <button
          type="button"
          onClick={() => irPara(mostrado - 1)}
          disabled={mostrado <= 1}
          aria-label="Dia anterior"
          className="press grid size-11 place-items-center rounded-full text-texto disabled:opacity-35"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p aria-live="polite" className="text-[15px] font-semibold">
          {ehHoje ? `Hoje · dia ${mostrado}` : `Dia ${mostrado}`}
        </p>
        <button
          type="button"
          onClick={() => irPara(mostrado + 1)}
          disabled={mostrado >= ultimo}
          aria-label="Próximo dia"
          className="press grid size-11 place-items-center rounded-full text-texto disabled:opacity-35"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </nav>

      <CardPose dados={d} ehHoje={ehHoje} aoSugerir={() => setSugerindo(true)} />

      {d.fotos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-superficie px-6 py-10 text-center shadow-[inset_0_0_0_1px_var(--borda)]">
          <Camera className="size-8 text-texto-2" aria-hidden />
          <p className="font-semibold">{ehHoje ? 'Nenhum treino postado hoje ainda' : 'Nenhum treino postado neste dia'}</p>
          <p className="text-sm text-texto-2">
            {ehHoje ? 'Mande a foto do treino no check-in e ela aparece aqui para a turma.' : 'Use as setas para ver outros dias.'}
          </p>
        </div>
      ) : (
        <ul aria-label={`Treinos do dia ${mostrado}`} className="grid grid-cols-2 gap-3">
          {d.fotos.map((f) => (
            <li key={f.participanteId}>
              <button
                type="button"
                onClick={() => setAberta(f)}
                aria-haspopup="dialog"
                aria-label={f.minha ? 'Ver o seu treino' : `Ver o treino de ${f.nomeExibicao}`}
                className={`press relative block aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-superficie-2 ${f.minha ? 'shadow-[inset_0_0_0_2px_var(--vermelho)]' : ''}`}
              >
                <img
                  src={f.thumbUrl ?? f.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-linear-to-t from-black/75 to-transparent px-2 pt-6 pb-2 text-left text-[13px] font-semibold text-white">
                  <Avatar nome={f.nomeExibicao} fotoUrl={f.fotoUrl} tamanho="sm" />
                  <span className="min-w-0 truncate">{f.minha ? 'Você' : f.nomeExibicao}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-texto-2">
        Só a foto do treino aparece para a turma. Água e leitura ficam só com o embaixador. Para esconder a sua, use
        o interruptor no check-in do dia.
      </p>

      <FolhaInferior aberta={aberta !== null} aoFechar={() => setAberta(null)} titulo={aberta?.minha ? 'Seu treino' : `Treino de ${aberta?.nomeExibicao ?? ''}`}>
        {aberta && (
          <>
            <img src={aberta.url} alt={`Foto do treino de ${aberta.nomeExibicao}, dia ${mostrado}`} className="max-h-[62dvh] w-full rounded-[20px] bg-superficie-2 object-contain" />
            <Botao variante="secundario" larguraTotal onClick={() => setAberta(null)}>
              Fechar
            </Botao>
          </>
        )}
      </FolhaInferior>
      <FolhaPose slug={slug} aberta={sugerindo} aoFechar={() => setSugerindo(false)} />
    </div>
  );
}
