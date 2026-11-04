/** `navigator.standalone` só existe no Safari do iOS (web app aberto pela tela de início). */
interface NavigatorIOS extends Navigator {
  readonly standalone?: boolean;
}

/**
 * O app foi aberto pelo ícone da tela inicial (PWA instalado), e não por uma aba do navegador.
 * Único ponto de detecção: usado no boot (aplicarModoApp), na instalação, na Entrada e no login.
 */
export function rodandoStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = (navigator as NavigatorIOS).standalone === true;
  const mql =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches);
  return ios || mql;
}

const VIEWPORT_APP =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

let aplicado = false;

/**
 * App instalado se comporta como app nativo: sem zoom por pinça ou duplo toque, sem "bounce"
 * revelando o fundo, barra de abas sempre no lugar.
 *
 * Só vale no app instalado: no navegador comum o zoom continua liberado (WCAG 1.4.4), porque
 * lá a pessoa pode precisar ampliar e não há outro jeito de fazer isso.
 * - viewport sem zoom (o iOS respeita em web app da tela de início; o Safari em aba ignora);
 * - `html[data-app]` liga o CSS de modo app (touch-action, overscroll) em styles/index.css;
 * - gesturestart/gesturechange (pinça no WebKit) cancelados.
 * Idempotente; chame no boot (main.tsx).
 */
export function aplicarModoApp(): void {
  if (aplicado || typeof document === 'undefined' || !rodandoStandalone()) return;
  aplicado = true;

  document.querySelector('meta[name="viewport"]')?.setAttribute('content', VIEWPORT_APP);
  document.documentElement.dataset.app = '1';

  // Pinça no WebKit (Safari/iOS). Duplo toque e pinça no Chrome/Android ficam com o CSS
  // `touch-action: pan-x pan-y` de html[data-app] e com o viewport acima. Sem ouvir touchend nem
  // touchmove: cancelar o touchend engolia toques rápidos em botões (+1 página, +250 ml) e um
  // touchmove não passivo deixava toda rolagem esperando a thread principal.
  const cancelar = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', cancelar, { passive: false });
  document.addEventListener('gesturechange', cancelar, { passive: false });
}
