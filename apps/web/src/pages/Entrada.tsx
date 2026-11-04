import { Navigate, ScrollRestoration } from 'react-router';
import { Watermark } from '../components/layout/Watermark';
import { Hero } from '../features/landing/Hero';
import { Rodape } from '../features/landing/Rodape';
import { SecaoComoFunciona } from '../features/landing/SecaoComoFunciona';
import { SecaoDesafio } from '../features/landing/SecaoDesafio';
import { SecaoFechamento } from '../features/landing/SecaoFechamento';
import { SecaoFotos } from '../features/landing/SecaoFotos';
import { SecaoPerguntas } from '../features/landing/SecaoPerguntas';
import { SecaoTT } from '../features/landing/SecaoTT';
import { rodandoStandalone } from '../features/pwa/standalone';
import { useDesafioAtual, useMe } from '../lib/queries';

/**
 * "/" (docs/FRONTEND.md §9.1): landing de vendas do desafio. Hero com o mini contador de vagas →
 * "O desafio" (5 hábitos, números, prêmio, vídeo) → "Quem é o TT" → "Fotos" → "Como funciona" →
 * perguntas → fechamento com as vagas restantes. Os 3 "Quero participar" usam a mesma regra
 * (features/desafio/useEntrarNoDesafio). Textos em content/landing.ts.
 * Sem Firebase no bundle desta rota (o auth é baixado sob demanda: preCarregarAuth).
 */
export default function Entrada() {
  // As vagas da capa se atualizam a cada 30 s (as seções leem o mesmo cache).
  useDesafioAtual({ atualizarACada: 30_000 });
  const { data: me } = useMe();

  // Quem já está no desafio e abre o app instalado vai direto para ele (a landing é para quem
  // ainda não entrou; no navegador ela continua acessível, com o atalho "Ir para o desafio").
  if (me?.participacao?.pagamentoStatus === 'CONFIRMADO' && rodandoStandalone()) {
    return <Navigate to="/desafio" replace />;
  }

  return (
    <div className="relative min-h-dvh">
      <Watermark />
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-16 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <Hero />
        <SecaoDesafio />
        <SecaoTT />
        <SecaoFotos />
        <SecaoComoFunciona />
        <SecaoPerguntas />
        <SecaoFechamento />
        <Rodape />
      </main>
      {/* A landing fica fora do AppShell: sem isto, voltar de /regras cai no topo da página. */}
      <ScrollRestoration />
    </div>
  );
}
