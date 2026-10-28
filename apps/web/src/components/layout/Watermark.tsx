/** Logo fixa, centralizada e quase transparente atrás de todo o conteúdo. */
export function Watermark() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center opacity-5">
      <img
        src="/logo.webp"
        alt=""
        width={512}
        height={512}
        decoding="async"
        fetchPriority="high"
        className="h-auto w-[80vw] max-w-md select-none"
        draggable={false}
      />
    </div>
  );
}
