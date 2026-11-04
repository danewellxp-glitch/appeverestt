import type { DiaResumo, MeuProgresso } from '@everest/shared';
import { AlertTriangle, Check } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../components/ui/Toast';
import { abrirComTransformacao, reduzirMovimento } from '../../lib/transicoes';
import { caminhoDoDia, preCarregarDia } from './navegacao';

type EstadoChip = 'concluido' | 'hoje' | 'hoje-concluido' | 'perdido' | 'invalidado' | 'futuro';

function estadoDoChip(d: DiaResumo, diaAtual: number | null): EstadoChip {
  const hoje = d.numeroDia === diaAtual;
  if (d.situacao === 'INVALIDADO') return 'invalidado';
  if (d.situacao === 'CONCLUIDO' || d.situacao === 'AGUARDANDO_CONFERENCIA') return hoje ? 'hoje-concluido' : 'concluido';
  if (d.situacao === 'HOJE') return 'hoje';
  if (d.situacao === 'FUTURO') return 'futuro';
  return 'perdido';
}

const DESCRICAO: Record<EstadoChip, string> = {
  concluido: 'concluído',
  'hoje-concluido': 'hoje, concluído',
  hoje: 'hoje',
  perdido: 'não concluído',
  invalidado: 'invalidado pelo embaixador',
  futuro: 'ainda não abriu',
};

const ESTILO: Record<EstadoChip, string> = {
  concluido: 'bg-vermelho text-sobre-vermelho',
  'hoje-concluido': 'bg-vermelho text-sobre-vermelho shadow-[inset_0_0_0_2px_var(--pop-texto)]',
  hoje: 'shadow-[inset_0_0_0_2px_var(--vermelho)]',
  perdido: 'text-pop-texto-2',
  invalidado: 'text-vermelho-texto',
  futuro: 'opacity-40',
};

function marcaSuperior(e: EstadoChip) {
  if (e === 'concluido' || e === 'hoje-concluido') return <Check className="size-3" aria-hidden />;
  if (e === 'hoje') return 'hoje';
  if (e === 'perdido') return '×';
  if (e === 'invalidado') return <AlertTriangle className="size-3" aria-hidden />;
  return '';
}

/** Quantos dias faltam para um dia futuro abrir. */
function diasAteAbrir(numeroDia: number, progresso: MeuProgresso, diasParaInicio: number): number {
  if (progresso.status === 'NAO_INICIADO') return diasParaInicio + numeroDia - 1;
  return numeroDia - (progresso.diaAtual ?? 0);
}

/**
 * Card "pop" com os 30 dias em scroll horizontal, centralizando o dia atual no mount.
 * Dia passado/atual abre o check-in (container transform `abrir-dia`); dia futuro treme e avisa.
 */
export function FaixaDias({ progresso, diasParaInicio }: { progresso: MeuProgresso; diasParaInicio: number }) {
  const navegar = useNavigate();
  const { toast } = useToast();
  const trilho = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const el = trilho.current;
    const atual = el?.querySelector<HTMLElement>('[data-atual="true"]');
    if (!el || !atual) return;
    el.scrollLeft = atual.offsetLeft - el.clientWidth / 2 + atual.offsetWidth / 2;
  }, [progresso.diaAtual]);

  function tocar(d: DiaResumo, estado: EstadoChip, botao: HTMLButtonElement) {
    if (estado === 'futuro') {
      if (!reduzirMovimento()) botao.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 300, easing: 'linear' },
      );
      const n = diasAteAbrir(d.numeroDia, progresso, diasParaInicio);
      toast(
        n <= 1 ? `O dia ${d.numeroDia} abre amanhã, à meia-noite.` : `O dia ${d.numeroDia} abre em ${n} dias, à meia-noite.`,
      );
      return;
    }
    abrirComTransformacao(botao, 'abrir-dia', () =>
      void navegar(caminhoDoDia(d.numeroDia), { viewTransition: true, state: { vt: 'abrir-dia' } }),
    );
  }

  return (
    <section aria-label="Seus 30 dias" className="flex flex-col gap-2.5 rounded-[30px] bg-pop px-3 pt-3.5 pb-3 text-pop-texto">
      <div className="flex justify-between px-1.5 text-[11px] font-semibold tracking-[0.16em] text-pop-texto-2 uppercase">
        <span>Sua jornada</span>
        <span>
          {progresso.diasConcluidos} de {progresso.totalDias} concluídos
        </span>
      </div>
      {/* `relative`: os textos sr-only (position:absolute) ficam presos ao trilho. Sem isso eles
          escapavam do recorte, a página ganhava ~1.500 px de largura e, no Chrome do celular, a
          barra de abas e o botão de check-in saíam da tela. Também faz do trilho o offsetParent
          dos chips, que é a referência certa para centralizar o dia atual. */}
      <ol
        ref={trilho}
        className="relative flex snap-x snap-proximity gap-1.5 overflow-x-auto p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {progresso.dias.map((d) => {
          const estado = estadoDoChip(d, progresso.diaAtual);
          return (
            <li key={d.numeroDia} className="shrink-0 snap-center" data-atual={d.numeroDia === progresso.diaAtual}>
              <button
                type="button"
                aria-disabled={estado === 'futuro' || undefined}
                onPointerDown={estado === 'futuro' ? undefined : preCarregarDia}
                onClick={(e) => tocar(d, estado, e.currentTarget)}
                className={`flex h-[62px] w-[46px] flex-col items-center justify-center gap-[3px] rounded-[18px] text-[17px] font-bold tabular-nums transition-transform duration-[220ms] ease-mola active:scale-[0.92] ${ESTILO[estado]}`}
              >
                <small
                  aria-hidden
                  className={`flex h-[13px] items-center text-[10px] font-semibold tracking-[0.06em] uppercase ${estado === 'concluido' || estado === 'hoje-concluido' ? '' : 'text-pop-texto-2'}`}
                >
                  {marcaSuperior(estado)}
                </small>
                <span className="sr-only">Dia </span>
                {d.numeroDia}
                <span className="sr-only">, {DESCRICAO[estado]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
