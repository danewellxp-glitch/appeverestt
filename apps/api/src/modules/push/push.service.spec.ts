import type { PayloadPush } from '@everest/shared';
import type { AppConfig } from '../../config/app-config.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { DesafioService } from '../desafios/desafio.service';
import type { ClienteWebPush } from './push.constantes';
import { PushService } from './push.service';

/** Erro como o WebPushError da lib (só o statusCode importa). */
const erroPush = (statusCode: number): Error => Object.assign(new Error(`push ${statusCode}`), { statusCode });

const VAPID = {
  VAPID_PUBLIC_KEY: 'BPublica',
  VAPID_PRIVATE_KEY: 'privada',
  VAPID_SUBJECT: 'mailto:teste@everest.dev',
} as Record<string, string | undefined>;

function configCom(env: Record<string, string | undefined>): AppConfig {
  return { get: (k: string) => env[k] } as unknown as AppConfig;
}

interface Linha {
  id: string;
  usuarioId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  falhas: number;
}

/** Prisma em memória só com o que o PushService usa em `enviar`. */
function prismaFalso(linhas: Linha[]) {
  const dentro = (where: { id: { in: string[] }; falhas?: { gte: number } }) => (l: Linha) =>
    where.id.in.includes(l.id) && (where.falhas ? l.falhas >= where.falhas.gte : true);
  const findMany = jest.fn().mockResolvedValue(linhas);
  const prisma = {
    pushInscricao: {
      findMany,
      updateMany: jest.fn(async ({ where, data }: { where: { id: { in: string[] } }; data: Record<string, unknown> }) => {
        const alvo = linhas.filter(dentro(where));
        for (const l of alvo) {
          if (typeof data.falhas === 'number') l.falhas = data.falhas;
          else if (data.falhas && typeof data.falhas === 'object') l.falhas += (data.falhas as { increment: number }).increment;
        }
        return { count: alvo.length };
      }),
      deleteMany: jest.fn(async ({ where }: { where: { id: { in: string[] }; falhas?: { gte: number } } }) => {
        const alvo = linhas.filter(dentro(where));
        for (const l of alvo) linhas.splice(linhas.indexOf(l), 1);
        return { count: alvo.length };
      }),
    },
  };
  return prisma;
}

const linha = (n: number, extra: Partial<Linha> = {}): Linha => ({
  id: `i${n}`,
  usuarioId: `u${n}`,
  endpoint: `https://push.exemplo/${n}`,
  p256dh: 'p',
  auth: 'a',
  falhas: 0,
  ...extra,
});

const PAYLOAD: PayloadPush = { titulo: 'T', corpo: 'C', url: '/hoje', tag: 'aviso-x' };

function servico(linhas: Linha[], webPush: ClienteWebPush, env = VAPID) {
  const prisma = prismaFalso(linhas);
  const desafios = { porSlug: jest.fn().mockResolvedValue({ id: 'd1' }) } as unknown as DesafioService;
  const s = new PushService(prisma as unknown as PrismaService, configCom(env), desafios, webPush);
  return { s, prisma };
}

describe('PushService.enviar', () => {
  it('conta entregues, apaga 404/410 e soma falhas nos outros erros', async () => {
    const linhas = [linha(1), linha(2), linha(3), linha(4)];
    const webPush: ClienteWebPush = {
      sendNotification: jest.fn(async (sub) => {
        if (sub.endpoint.endsWith('/2')) throw erroPush(410);
        if (sub.endpoint.endsWith('/3')) throw erroPush(404);
        if (sub.endpoint.endsWith('/4')) throw erroPush(500);
        return { statusCode: 201, body: '', headers: {} };
      }),
    };
    const { s } = servico(linhas, webPush);
    const r = await s.enviar([...linhas], PAYLOAD);
    expect(r).toEqual({ destinatarios: 4, entregues: 1, removidas: 2, falhas: 1 });
    expect(linhas.map((l) => l.id)).toEqual(['i1', 'i4']);
    expect(linhas.find((l) => l.id === 'i4')?.falhas).toBe(1);
  });

  it('manda o payload em JSON com VAPID, TTL de 1 h e urgência alta', async () => {
    const send = jest.fn().mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    const { s } = servico([linha(1)], { sendNotification: send });
    await s.enviar([linha(1)], PAYLOAD);
    const [sub, corpo, opcoes] = send.mock.calls[0] as [unknown, string, Record<string, unknown>];
    expect(sub).toEqual({ endpoint: 'https://push.exemplo/1', keys: { p256dh: 'p', auth: 'a' } });
    expect(JSON.parse(corpo)).toEqual(PAYLOAD);
    expect(opcoes).toMatchObject({
      TTL: 3600,
      urgency: 'high',
      vapidDetails: { publicKey: 'BPublica', privateKey: 'privada', subject: 'mailto:teste@everest.dev' },
    });
  });

  it('apaga a inscrição na 5ª falha seguida', async () => {
    const linhas = [linha(1, { falhas: 4 })];
    const { s } = servico(linhas, { sendNotification: jest.fn().mockRejectedValue(erroPush(503)) });
    const r = await s.enviar([...linhas], PAYLOAD);
    expect(r).toEqual({ destinatarios: 1, entregues: 0, removidas: 0, falhas: 1 });
    expect(linhas).toHaveLength(0);
  });

  it('entrega zera as falhas acumuladas', async () => {
    const linhas = [linha(1, { falhas: 3 })];
    const { s } = servico(linhas, { sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }) });
    await s.enviar([...linhas], PAYLOAD);
    expect(linhas[0]?.falhas).toBe(0);
  });

  it('no máximo 10 envios ao mesmo tempo', async () => {
    let emVoo = 0;
    let pico = 0;
    const linhas = Array.from({ length: 25 }, (_, n) => linha(n));
    const webPush: ClienteWebPush = {
      sendNotification: jest.fn(async () => {
        emVoo += 1;
        pico = Math.max(pico, emVoo);
        await new Promise((r) => setTimeout(r, 5));
        emVoo -= 1;
        return { statusCode: 201, body: '', headers: {} };
      }),
    };
    const { s } = servico(linhas, webPush);
    const r = await s.enviar([...linhas], PAYLOAD);
    expect(r.entregues).toBe(25);
    expect(pico).toBe(10);
  });

  it('sem VAPID: PUSH_NAO_CONFIGURADO e nada é enviado', async () => {
    const send = jest.fn();
    const { s } = servico([linha(1)], { sendNotification: send }, {});
    await expect(s.enviar([linha(1)], PAYLOAD)).rejects.toMatchObject({
      response: { codigo: 'PUSH_NAO_CONFIGURADO' },
    });
    expect(() => s.chavePublica()).toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('PushService.destinatarios', () => {
  it('filtra participantes confirmados do desafio com conta ativa', async () => {
    const { s, prisma } = servico([], { sendNotification: jest.fn() });
    await s.destinatarios('d1');
    expect(prisma.pushInscricao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          usuario: { excluidoEm: null, participacoes: { some: { desafioId: 'd1', pagamentoStatus: 'CONFIRMADO' } } },
        },
      }),
    );
  });

  it('resumo conta pessoas distintas e aparelhos', async () => {
    const linhas = [linha(1), linha(2, { usuarioId: 'u1' }), linha(3)];
    const { s } = servico(linhas, { sendNotification: jest.fn() });
    expect(await s.resumo('desafio-teste')).toEqual({ pessoas: 2, aparelhos: 3 });
  });
});

describe('PushService.payloadDaAcao', () => {
  it('modelo pronto leva ação, botão e a URL da ação rápida', () => {
    expect(PushService.payloadDaAcao('agua', 'lembrete-agua')).toEqual({
      titulo: 'Hora da água 💧',
      corpo: expect.any(String),
      url: '/hoje?acao=agua',
      acao: 'agua',
      botao: '+250 ml',
      tag: 'lembrete-agua',
    });
  });
});
