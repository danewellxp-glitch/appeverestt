/** Toggle acessível (role="switch") em linha, alvo de toque ≥ 44 px, texto visível como nome. */
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
      className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl bg-superficie-2 px-3.5 py-3 text-left text-base font-medium disabled:opacity-60"
    >
      <span>{rotulo}</span>
      <span
        aria-hidden
        className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-250 ${ligado ? 'bg-vermelho' : 'bg-borda-campo'}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] size-[26px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-transform duration-300 ease-[cubic-bezier(.3,.8,.3,1.3)] ${ligado ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </span>
    </button>
  );
}
