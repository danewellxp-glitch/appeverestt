import { METROS_POR_DIA } from '@everest/shared';

/**
 * Banner vermelho "Dia concluído". `animar` só na passagem de não concluído → concluído
 * (check desenhado + escala); ao abrir um dia já concluído, aparece parado.
 */
export function BannerDiaConcluido({ animar, totalDias }: { animar: boolean; totalDias: number }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-[18px] bg-vermelho px-3.5 py-3 text-sobre-vermelho"
      style={animar ? { animation: 'revelar 420ms var(--ease-saida) both' } : undefined}
    >
      <svg viewBox="0 0 36 36" aria-hidden className="size-9 shrink-0">
        <circle cx="18" cy="18" r="16" fill="none" stroke="rgb(255 255 255 / 0.4)" strokeWidth="2" />
        <path
          d="M10.5 18.5l5 5 10-11"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="30"
          style={animar ? { animation: 'draw 600ms 150ms var(--ease-saida) both' } : undefined}
        />
      </svg>
      <div>
        <p className="font-bold">Dia concluído</p>
        <p className="text-[13px]">Mais {METROS_POR_DIA(totalDias)} m na sua escalada.</p>
      </div>
    </div>
  );
}
