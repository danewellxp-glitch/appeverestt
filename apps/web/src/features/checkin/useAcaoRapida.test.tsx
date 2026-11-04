// @vitest-environment jsdom
import type { CheckinInput } from '@everest/shared';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAcaoRapida } from './useAcaoRapida';

const valores: CheckinInput = { aguaMl: 500, exercicio: false, paginasLidas: 0, storyPostado: false };

function montar(url: string, parcial: Partial<Parameters<typeof useAcaoRapida>[0]> = {}) {
  const setParams = vi.fn();
  const alterar = vi.fn();
  const toast = vi.fn();
  const params = new URLSearchParams(url);
  const hook = renderHook(
    (p: { valores: CheckinInput | null }) =>
      useAcaoRapida({
        params,
        setParams,
        dia: { numeroDia: 4, editavel: true },
        editavel: true,
        online: true,
        alterar,
        toast,
        ...parcial,
        valores: p.valores,
      }),
    { initialProps: { valores: parcial.valores === undefined ? valores : parcial.valores } },
  );
  return { hook, setParams, alterar, toast };
}

describe('useAcaoRapida', () => {
  it('aplica a ação na hora, mostra o toast e limpa a URL com replace', () => {
    const { alterar, toast, setParams } = montar('acao=agua');
    expect(alterar).toHaveBeenCalledTimes(1);
    const [fn, opcoes] = alterar.mock.calls[0] as [(v: CheckinInput) => CheckinInput, { imediato?: boolean }];
    expect(fn(valores)).toEqual({ ...valores, aguaMl: 750 });
    expect(opcoes.imediato).toBe(true);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('+250 ml'));
    expect(setParams).toHaveBeenCalledTimes(1);
    const [novos, op] = setParams.mock.calls[0] as [URLSearchParams, { replace: boolean }];
    expect(novos.has('acao')).toBe(false);
    expect(op.replace).toBe(true);
  });

  it('não repete em re-renders nem quando não há parâmetro', () => {
    const { hook, alterar } = montar('acao=treino');
    hook.rerender({ valores: { ...valores, exercicio: true } });
    hook.rerender({ valores: { ...valores, exercicio: true } });
    expect(alterar).toHaveBeenCalledTimes(1);

    const semParametro = montar('');
    expect(semParametro.alterar).not.toHaveBeenCalled();
    expect(semParametro.setParams).not.toHaveBeenCalled();
  });

  it('espera os valores do dia ficarem prontos', () => {
    const { hook, alterar } = montar('acao=leitura', { valores: null });
    expect(alterar).not.toHaveBeenCalled();
    hook.rerender({ valores });
    expect(alterar).toHaveBeenCalledTimes(1);
  });

  it('dia fechado: avisa e não altera', () => {
    const { alterar, toast, setParams } = montar('acao=agua', { dia: { numeroDia: 3, editavel: false }, editavel: false });
    expect(alterar).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Só o dia de hoje pode ser editado.');
    expect(setParams).toHaveBeenCalledTimes(1);
  });

  it('offline: avisa e não altera', () => {
    const { alterar, toast } = montar('acao=treino', { online: false, editavel: false });
    expect(alterar).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Sem conexão'));
  });

  it('ação inválida: só limpa a URL', () => {
    const { alterar, toast, setParams } = montar('acao=xpto');
    expect(alterar).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(setParams).toHaveBeenCalledTimes(1);
  });

  it('ação que não muda nada só avisa', () => {
    const { alterar, toast } = montar('acao=treino', { valores: { ...valores, exercicio: true } });
    expect(alterar).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Treino de hoje já estava marcado.');
  });
});
