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

const { CHAVE_CONVITE_PUSH, ConvitePush } = await import('./ConvitePush');

function montar() {
  return render(
    <ToastProvider>
      <ConvitePush />
    </ToastProvider>,
  );
}

beforeEach(() => {
  push.estado = { suporte: 'ok', permissao: 'default', inscrito: false, ocupado: false };
  push.ativar.mockReset();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('ConvitePush', () => {
  it('aparece para quem pode receber push e ainda não ativou', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Lembretes no celular' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeTruthy();
  });

  it.each<[string, Partial<EstadoPush>]>([
    ['já inscrito', { inscrito: true }],
    ['navegador sem push', { suporte: 'sem-suporte' }],
    ['iPhone sem o app instalado', { suporte: 'ios-sem-app' }],
    ['notificações bloqueadas', { permissao: 'denied' }],
  ])('não aparece: %s', (_nome, parcial) => {
    push.estado = { ...push.estado, ...parcial };
    montar();
    expect(screen.queryByRole('heading', { name: 'Lembretes no celular' })).toBeNull();
  });

  it('"Agora não" some e lembra a dispensa no localStorage', () => {
    const { unmount } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByRole('heading', { name: 'Lembretes no celular' })).toBeNull();
    expect(localStorage.getItem(CHAVE_CONVITE_PUSH)).not.toBeNull();
    unmount();
    montar();
    expect(screen.queryByRole('heading', { name: 'Lembretes no celular' })).toBeNull();
  });

  it('localStorage indisponível: o convite ainda abre e fecha', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByRole('heading', { name: 'Lembretes no celular' })).toBeNull();
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('"Ativar" chama o ativar() e avisa quando deu certo', async () => {
    push.ativar.mockResolvedValue('ativado');
    montar();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ativar' }));
      await Promise.resolve();
    });
    expect(push.ativar).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Lembretes ativados neste celular.')).toBeTruthy();
  });

  it('permissão recusada: avisa que dá para ativar no Perfil e some', async () => {
    push.ativar.mockResolvedValue('recusado');
    montar();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ativar' }));
      await Promise.resolve();
    });
    expect(await screen.findByText(/ativar depois no Perfil/)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Lembretes no celular' })).toBeNull();
  });
});
