/** Toggle acessível (role="switch"), alvo de toque ≥ 44 px, texto visível como nome. */
export function Interruptor({
  ligado,
  rotulo,
  disabled,
  aoAlternar,
}: {
  ligado: boolean;
  rotulo: string;
  disabled?: boolean;
  aoAlternar: (ligado: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      disabled={disabled}
      onClick={() => aoAlternar(!ligado)}
      className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border border-borda bg-superficie-2 px-4 py-2 text-left text-base font-semibold disabled:opacity-60"
    >
      <span>{rotulo}</span>
      <span
        aria-hidden
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${ligado ? 'bg-vermelho' : 'bg-borda-campo'}`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </span>
    </button>
  );
}
