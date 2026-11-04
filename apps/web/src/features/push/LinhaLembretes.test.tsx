// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ui/Toast';
import type { EstadoPush, Push } from './usePush';

const push = vi.hoisted(() => ({
  estado: { suporte: 'ok', permissao: 'default', inscrito: false, ocupado: false } as EstadoPush,
  ativar: vi.fn(),
  desligar: vi.fn(),
}));

vi.mock('./usePush', () => ({
  usePush: (): Push => ({ ...push.estado, ativar: push.ativar, desligar: push.desligar }),
}));

const { LinhaLembretes, textoDosHorarios } = await import('./LinhaLembretes');

function montar(aoInstalar = vi.fn()) {
  render(
    <ToastProvider>
      <LinhaLembretes aoInstalar={aoInstalar} />
    </ToastProvider>,
  );
  return { aoInstalar, interruptor: screen.getByRole('switch', { name: 'Lembretes no celular' }) };
}

beforeEach(() => {
  push.estado = { suporte: 'ok', permissao: 'default', inscrito: false, ocupado: false };
  push.ativar.mockReset();
  push.desligar.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Perfil → Lembretes no celular', () => {
  it('lista os horários dos lembretes', () => {
    expect(textoDosHorarios()).toBe('Água às 10h, 14h e 17h, treino às 18h e leitura às 21h.');
  });

  it('desligado: ligar chama o ativar()', async () => {
    push.ativar.mockResolvedValue('ativado');
    const { interruptor } = montar();
    expect(interruptor.getAttribute('aria-checked')).toBe('false');
    await act(async () => {
      fireEvent.click(interruptor);
      await Promise.resolve();
    });
    expect(push.ativar).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Lembretes ativados neste celular.')).toBeTruthy();
  });

  it('ativo: mostra o estado e desligar chama o desligar()', async () => {
    push.estado = { ...push.estado, permissao: 'granted', inscrito: true };
    push.desligar.mockResolvedValue(undefined);
    const { interruptor } = montar();
    expect(interruptor.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(/Ativo neste celular/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(interruptor);
      await Promise.resolve();
    });
    expect(push.desligar).toHaveBeenCalledTimes(1);
  });

  it('bloqueado no navegador: interruptor desabilitado e explica onde liberar', () => {
    push.estado = { ...push.estado, permissao: 'denied' };
    const { interruptor } = montar();
    expect(interruptor.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Bloqueado nas configurações do navegador/)).toBeTruthy();
  });

  it('iPhone sem o app: pede para instalar antes e abre a folha de instalação', () => {
    push.estado = { ...push.estado, suporte: 'ios-sem-app', permissao: 'indisponivel' };
    const { interruptor, aoInstalar } = montar();
    expect(interruptor.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/No iPhone, instale o app antes/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Como instalar' }));
    expect(aoInstalar).toHaveBeenCalledTimes(1);
  });

  it('erro da API (ex.: push não configurado) vira toast', async () => {
    const { ApiError } = await import('../../lib/api');
    push.ativar.mockRejectedValue(new ApiError('PUSH_NAO_CONFIGURADO', 'Lembretes indisponíveis no momento.', 503));
    const { interruptor } = montar();
    await act(async () => {
      fireEvent.click(interruptor);
      await Promise.resolve();
    });
    expect(await screen.findByText('Lembretes indisponíveis no momento.')).toBeTruthy();
  });
});
