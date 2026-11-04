import { TIMEZONE_PADRAO } from '@everest/shared';
import type { Queue } from 'bullmq';
import type { AppConfig } from '../../config/app-config.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { DesafioService } from '../desafios/desafio.service';
import { PushAgendador } from './push.agendador';
import { agendamentosDosLembretes, type ClienteWebPush } from './push.constantes';
import { PushService } from './push.service';

describe('agendamentosDosLembretes', () => {
  it('um cron por horário (água 10/14/17, treino 18, leitura 21) no fuso do desafio', () => {
    expect(agendamentosDosLembretes('America/Manaus')).toEqual([
      { id: 'lembrete-agua-10', acao: 'agua', pattern: '0 10 * * *', tz: 'America/Manaus' },
      { id: 'lembrete-agua-14', acao: 'agua', pattern: '0 14 * * *', tz: 'America/Manaus' },
      { id: 'lembrete-agua-17', acao: 'agua', pattern: '0 17 * * *', tz: 'America/Manaus' },
      { id: 'lembrete-treino-18', acao: 'treino', pattern: '0 18 * * *', tz: 'America/Manaus' },
      { id: 'lembrete-leitura-21', acao: 'leitura', pattern: '0 21 * * *', tz: 'America/Manaus' },
    ]);
  });

  it('sem desafio ativo usa o fuso padrão', () => {
    expect(agendamentosDosLembretes(null).every((a) => a.tz === TIMEZONE_PADRAO)).toBe(true);
    expect(agendamentosDosLembretes('').every((a) => a.tz === TIMEZONE_PADRAO)).toBe(true);
  });
});

describe('PushAgendador.sincronizar', () => {
  it('faz upsert de cada horário e remove lembretes antigos (mantém outros agendamentos)', async () => {
    const fila = {
      upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
      getJobSchedulers: jest.fn().mockResolvedValue([{ key: 'lembrete-agua-10' }, { key: 'lembrete-agua-8' }, { key: 'outro' }]),
      removeJobScheduler: jest.fn().mockResolvedValue(true),
    };
    const prisma = { desafio: { findFirst: jest.fn().mockResolvedValue({ timezone: 'America/Recife' }) } };
    const config = { get: () => 'development' } as unknown as AppConfig;
    const ag = new PushAgendador(prisma as unknown as PrismaService, config, fila as unknown as Queue);
    await ag.sincronizar();
    expect(fila.upsertJobScheduler).toHaveBeenCalledTimes(5);
    expect(fila.upsertJobScheduler).toHaveBeenCalledWith(
      'lembrete-treino-18',
      { pattern: '0 18 * * *', tz: 'America/Recife' },
      expect.objectContaining({ name: 'lembrete', data: { acao: 'treino' } }),
    );
    expect(fila.removeJobScheduler).toHaveBeenCalledTimes(1);
    expect(fila.removeJobScheduler).toHaveBeenCalledWith('lembrete-agua-8');
  });
});

describe('PushService.enviarLembrete', () => {
  const env: Record<string, string> = { VAPID_PUBLIC_KEY: 'B', VAPID_PRIVATE_KEY: 'p', VAPID_SUBJECT: 'mailto:a@b.c' };
  const config = { get: (k: string) => env[k] } as unknown as AppConfig;
  const agora = new Date('2026-11-04T13:00:00Z'); // 10h em São Paulo

  function montar(desafio: Record<string, unknown> | null) {
    const send = jest.fn().mockResolvedValue({ statusCode: 201 });
    const prisma = {
      desafio: { findFirst: jest.fn().mockResolvedValue(desafio) },
      pushInscricao: {
        findMany: jest.fn().mockResolvedValue([{ id: 'i1', usuarioId: 'u1', endpoint: 'https://p/1', p256dh: 'p', auth: 'a' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const s = new PushService(
      prisma as unknown as PrismaService,
      config,
      {} as DesafioService,
      { sendNotification: send } as ClienteWebPush,
    );
    return { s, send };
  }

  const desafio = (inicio: string) => ({
    id: 'd1',
    dataInicio: new Date(`${inicio}T00:00:00Z`),
    totalDias: 30,
    timezone: 'America/Sao_Paulo',
  });

  it('envia com a tag do lembrete quando o desafio está em andamento', async () => {
    const { s, send } = montar(desafio('2026-11-01'));
    const r = await s.enviarLembrete('agua', agora);
    expect(r).toEqual({ destinatarios: 1, entregues: 1, removidas: 0, falhas: 0 });
    const payload = JSON.parse((send.mock.calls[0] as [unknown, string])[1]) as Record<string, unknown>;
    expect(payload).toMatchObject({ tag: 'lembrete-agua', acao: 'agua', url: '/hoje?acao=agua', botao: '+250 ml' });
  });

  it('não envia antes do início, depois do fim nem sem desafio ativo', async () => {
    for (const d of [desafio('2026-11-10'), desafio('2026-09-01'), null]) {
      const { s, send } = montar(d);
      expect(await s.enviarLembrete('treino', agora)).toBeNull();
      expect(send).not.toHaveBeenCalled();
    }
  });
});
