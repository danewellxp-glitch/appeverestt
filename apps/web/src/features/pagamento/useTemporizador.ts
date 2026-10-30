import { useEffect, useState } from 'react';

/** Chave do início do relógio do Pix (por participante, por aba: sessionStorage). */
export function chaveInicioPix(participanteId: string): string {
  return `everest-pix-inicio:${participanteId}`;
}

/** Apaga o início guardado (pagamento confirmado). */
export function limparInicioPix(participanteId: string): void {
  try {
    sessionStorage.removeItem(chaveInicioPix(participanteId));
  } catch {
    // armazenamento bloqueado: nada a limpar
  }
}

/**
 * Lê o início guardado ou grava agora. Idempotente: o StrictMode chama o inicializador do
 * useState duas vezes e a segunda leitura encontra o valor gravado pela primeira.
 */
function lerOuGravarInicio(chave: string): number {
  const agora = Date.now();
  try {
    const salvo = Number(sessionStorage.getItem(chave));
    if (Number.isFinite(salvo) && salvo > 0 && salvo <= agora) return salvo;
    sessionStorage.setItem(chave, String(agora));
  } catch {
    // modo privado/armazenamento bloqueado: o relógio recomeça a cada visita
  }
  return agora;
}

function calcularRestante(inicio: number, segundos: number): number {
  return Math.max(0, segundos - Math.floor((Date.now() - inicio) / 1000));
}

/** 239 → "3:59". */
export function formatarRelogio(restante: number): string {
  const m = Math.floor(restante / 60);
  const s = restante % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Texto para leitores de tela: muda só na troca de minuto e no zero (o aria-live fala só quando muda). */
function anuncioDoRelogio(restante: number): string {
  if (restante <= 0) return 'O tempo acabou, mas o código Pix continua válido.';
  const minutos = Math.ceil(restante / 60);
  return minutos === 1 ? 'Falta 1 minuto.' : `Faltam ${minutos} minutos.`;
}

/**
 * Relógio regressivo só visual (X14): o código Pix não expira; ao zerar, a tela só avisa.
 * O início fica no sessionStorage (`chave`), então recarregar ou voltar à tela não reinicia a
 * contagem na mesma aba. O intervalo recalcula a partir do relógio do sistema (sem acumular erro).
 */
export function useTemporizador(segundos: number, chave: string, ativo = true) {
  const [inicio] = useState(() => lerOuGravarInicio(chave));
  const [restante, setRestante] = useState(() => calcularRestante(inicio, segundos));

  useEffect(() => {
    if (!ativo) return;
    setRestante(calcularRestante(inicio, segundos));
    if (calcularRestante(inicio, segundos) <= 0) return;
    const id = window.setInterval(() => {
      const r = calcularRestante(inicio, segundos);
      setRestante(r);
      if (r <= 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [ativo, inicio, segundos]);

  return {
    restante,
    texto: formatarRelogio(restante),
    zerou: restante <= 0,
    anuncio: anuncioDoRelogio(restante),
  };
}
