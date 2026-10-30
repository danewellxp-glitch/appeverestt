import { useMemo } from 'react';
import { renderSVG } from 'uqr';
import { formatarReais } from '../../lib/moeda';

/**
 * QR code do Pix (BR Code "copia e cola"), gerado no cliente. Fundo branco literal e módulos
 * pretos em qualquer tema (apps de banco leem mal QR invertido), com margem branca ≥ 16 px.
 * O SVG é decorativo para leitores de tela; o contêiner tem role="img" e um rótulo que aponta
 * para o botão "Copiar código Pix".
 */
export function QrPix({ payload, valorCentavos }: { payload: string; valorCentavos: number }) {
  const svg = useMemo(
    () =>
      renderSVG(payload, { ecc: 'M', border: 2, blackColor: '#000', whiteColor: '#fff' }).replace(
        '<svg',
        '<svg aria-hidden="true" focusable="false"',
      ),
    [payload],
  );
  return (
    <div
      role="img"
      aria-label={`QR code do Pix de ${formatarReais(valorCentavos)}. Se não conseguir ler, use o botão Copiar código Pix.`}
      className="mx-auto w-full max-w-[260px] rounded-2xl bg-white p-4 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      // O SVG vem do uqr a partir do payload (texto), sem HTML de terceiros.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
