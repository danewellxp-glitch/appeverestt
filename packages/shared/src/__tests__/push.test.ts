import { describe, expect, it } from 'vitest';
import { aplicarAcaoRapida, ehAcaoRapida, urlDaAcaoRapida } from '../regras/acaoRapida';
import { LEMBRETES_PUSH, MODELOS_AVISO, cronDoLembrete } from '../regras/push';
import { acaoRapidaSchema, avisoPushSchema, pushInscricaoSchema } from '../schemas';

const base = { aguaMl: 0, exercicio: false, paginasLidas: 0, storyPostado: false };

describe('acaoRapida (shared)', () => {
  it('aplica as 3 ações e monta a URL', () => {
    expect(aplicarAcaoRapida('agua', base).valores.aguaMl).toBe(250);
    expect(aplicarAcaoRapida('treino', base).valores.exercicio).toBe(true);
    expect(aplicarAcaoRapida('leitura', base).valores.paginasLidas).toBe(10);
    expect(aplicarAcaoRapida('treino', { ...base, exercicio: true }).mudou).toBe(false);
    expect(urlDaAcaoRapida('agua')).toBe('/hoje?acao=agua');
    expect(ehAcaoRapida('agua')).toBe(true);
    expect(ehAcaoRapida('cafe')).toBe(false);
  });
});

describe('lembretes push', () => {
  it('horários combinados com o dono', () => {
    const horas = LEMBRETES_PUSH.flatMap((l) => l.horas.map((h) => `${l.acao}-${h}`));
    expect(horas).toEqual(['agua-10', 'agua-14', 'agua-17', 'treino-18', 'leitura-21']);
    expect(cronDoLembrete(10)).toBe('0 10 * * *');
    for (const l of LEMBRETES_PUSH) expect(MODELOS_AVISO[l.acao].titulo.length).toBeGreaterThan(0);
  });
});

describe('schemas push', () => {
  it('acaoRapidaSchema', () => {
    expect(acaoRapidaSchema.safeParse('leitura').success).toBe(true);
    expect(acaoRapidaSchema.safeParse('x').success).toBe(false);
  });

  it('pushInscricaoSchema', () => {
    const ok = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      chaves: { p256dh: 'k', auth: 'a' },
    };
    expect(pushInscricaoSchema.safeParse(ok).success).toBe(true);
    expect(pushInscricaoSchema.safeParse({ ...ok, endpoint: 'nao-url' }).success).toBe(false);
    expect(
      pushInscricaoSchema.safeParse({ ...ok, chaves: { p256dh: '', auth: 'a' } }).success,
    ).toBe(false);
  });

  it('avisoPushSchema: modelo pronto não exige texto; livre exige título e mensagem', () => {
    expect(avisoPushSchema.safeParse({ modelo: 'agua' }).success).toBe(true);
    const livre = avisoPushSchema.safeParse({ modelo: 'livre', titulo: '  ' });
    expect(livre.success).toBe(false);
    if (!livre.success)
      expect(livre.error.issues.map((i) => i.path[0]).sort()).toEqual(['corpo', 'titulo']);
    expect(
      avisoPushSchema.safeParse({ modelo: 'livre', titulo: 'Oi', corpo: 'Bora' }).success,
    ).toBe(true);
    expect(
      avisoPushSchema.safeParse({ modelo: 'livre', titulo: 'x'.repeat(61), corpo: 'a' }).success,
    ).toBe(false);
  });
});
