import { describe, expect, it } from 'vitest';
import { ACOES_RAPIDAS, lerAcaoRapida } from '../checkin/acaoRapida';
import { ATALHOS_APP, atalhosDoManifest } from './atalhos';

describe('atalhos do manifest', () => {
  it('há um atalho por ação rápida, com nome curto e descrição', () => {
    expect(ATALHOS_APP.map((a) => a.acao)).toEqual([...ACOES_RAPIDAS]);
    for (const a of ATALHOS_APP) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.short_name.length).toBeLessThanOrEqual(12);
      expect(a.description.length).toBeGreaterThan(0);
    }
  });

  it('cada atalho abre /hoje com a própria ação (dentro do escopo do PWA)', () => {
    for (const a of atalhosDoManifest()) {
      const url = new URL(a.url, 'https://app.test');
      expect(url.pathname).toBe('/hoje');
      expect(lerAcaoRapida(url.searchParams)).toBe(ATALHOS_APP.find((x) => x.name === a.name)?.acao);
      expect(a.icons[0]?.src).toMatch(/^\/pwa-192x192\.png$/);
    }
  });

  it('respeita o limite de 4 atalhos que o Android mostra', () => {
    expect(atalhosDoManifest().length).toBeLessThanOrEqual(4);
  });
});
