import { ACOES_RAPIDAS, urlDaAcaoRapida, type AcaoRapida } from '../checkin/acaoRapida';

/**
 * Atalhos do ícone do app (`shortcuts` do manifest): toque longo no ícone no Android mostra
 * estas ações, que abrem o app direto em `/hoje?acao=...` (features/checkin/acaoRapida.ts).
 * O iPhone ignora `shortcuts`; lá a folha "Instalar app" ensina a criar um atalho com a mesma URL.
 *
 * Fonte única para o vite.config.ts e para a UI (sem depender de código de browser).
 */
export interface AtalhoApp {
  acao: AcaoRapida;
  name: string;
  short_name: string;
  description: string;
  url: string;
}

const TEXTOS: Record<AcaoRapida, Pick<AtalhoApp, 'name' | 'short_name' | 'description'>> = {
  agua: { name: 'Água +250 ml', short_name: 'Água', description: 'Registra 250 ml de água no dia de hoje' },
  treino: { name: 'Treino feito', short_name: 'Treino', description: 'Marca o treino de hoje como feito' },
  leitura: { name: 'Leitura feita', short_name: 'Leitura', description: 'Marca a leitura de hoje como feita' },
};

export const ATALHOS_APP: readonly AtalhoApp[] = ACOES_RAPIDAS.map((acao) => ({
  acao,
  ...TEXTOS[acao],
  url: urlDaAcaoRapida(acao),
}));

/** Entradas prontas para `manifest.shortcuts` (ícone do PWA reaproveitado). */
export function atalhosDoManifest(): { name: string; short_name: string; description: string; url: string; icons: { src: string; sizes: string; type: string }[] }[] {
  return ATALHOS_APP.map(({ name, short_name, description, url }) => ({
    name,
    short_name,
    description,
    url,
    icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
  }));
}
