import { Play } from 'lucide-react';
import { videoDesafio } from '../../content/regras';

/** ID do vídeo em links do YouTube (watch?v=, youtu.be/, /shorts/, /embed/, /live/). */
export function idDoYoutube(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null; // caminho relativo (ex.: /video/desafio.mp4): não é YouTube
  }
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.pathname === '/watch' ? u.searchParams.get('v') : (/^\/(?:shorts|embed|live)\/([^/]+)/.exec(u.pathname)?.[1] ?? null);
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

const TITULO = 'Vídeo: como funciona o Desafio 30 Dias Everest';

/** Há vídeo configurado em content/regras.ts? (a landing só mostra o bloco quando há). */
export function temVideoDesafio(): boolean {
  return videoDesafio.url.trim().length > 0;
}

/** Vídeo do TT (content/regras.ts → videoDesafio): /regras e landing. Sem link: aviso de "em breve". */
export function VideoDesafio() {
  const url = videoDesafio.url.trim();
  // Vertical (celular): largura limitada pela altura da tela, para o vídeo inteiro caber sem rolar.
  const proporcao =
    videoDesafio.formato === 'vertical' ? 'aspect-[9/16] max-w-[calc(70dvh*9/16)]' : 'aspect-video';
  const moldura = `mx-auto block w-full overflow-hidden rounded-3xl bg-superficie-2 shadow-[inset_0_0_0_1px_var(--borda)] ${proporcao}`;

  if (!url) {
    return (
      <div className="grid justify-items-center gap-2 rounded-3xl bg-superficie px-5 py-7 text-center shadow-[inset_0_0_0_1px_var(--borda)]">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-superficie-2 text-vermelho-texto">
          <Play className="size-6" />
        </span>
        <b className="text-[15px]">Vídeo em breve</b>
        <p className="max-w-[34ch] text-[13px] text-texto-2">
          Aqui vai entrar um vídeo explicando o desafio. Enquanto isso, as regras estão logo abaixo.
        </p>
      </div>
    );
  }

  const id = idDoYoutube(url);
  if (id) {
    return (
      <iframe
        className={moldura}
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`}
        title={TITULO}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <video className={`${moldura} object-contain`} src={url} controls playsInline preload="metadata" aria-label={TITULO}>
      Seu navegador não conseguiu abrir o vídeo.
    </video>
  );
}
