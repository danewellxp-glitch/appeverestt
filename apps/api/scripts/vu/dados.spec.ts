import { UFS, atualizarPerfilSchema, idadeEm, normalizarTelefone } from '@everest/shared';
import { dadosDoVu, LOCAIS } from './dados';

describe('dadosDoVu', () => {
  const hoje = '2026-10-31';

  it('gera um cadastro que passa na validação do PATCH /me', () => {
    for (let n = 1; n <= 120; n++) {
      const d = dadosDoVu(n, hoje);
      const r = atualizarPerfilSchema.safeParse(d.perfil);
      if (!r.success) throw new Error(`VU ${n}: ${JSON.stringify(r.error.issues)}`);
      expect(r.data.instagram).toBe(d.perfil.instagram);
      expect(r.data.whatsapp).toBe(d.perfil.whatsapp);
    }
  });

  it('identifica o VU no nome, no e-mail e no instagram', () => {
    const d = dadosDoVu(7, hoje);
    expect(d.email).toBe('vu-07@vu.everestt.app.br');
    expect(d.nome).toMatch(/^VU 07 \S+ \S+$/);
    expect(d.perfil.nome).toBe(d.nome);
    expect(d.perfil.instagram).toBe('vu_07');
    expect(d.perfil.aceitouTermos).toBe(true);
  });

  it('é determinístico e tem idade entre 18 e 60', () => {
    for (let n = 1; n <= 60; n++) {
      const d = dadosDoVu(n, hoje);
      expect(dadosDoVu(n, hoje)).toEqual(d);
      const idade = idadeEm(d.perfil.dataNascimento, hoje);
      expect(idade).toBeGreaterThanOrEqual(18);
      expect(idade).toBeLessThanOrEqual(60);
      expect(normalizarTelefone(d.perfil.whatsapp)).toBe(d.perfil.whatsapp);
      expect(d.perfil.whatsapp).toMatch(/^\d{2}90000\d{4}$/);
    }
  });

  it('espalha os VUs pelos 27 estados', () => {
    expect(new Set(LOCAIS.map((l) => l.uf))).toEqual(new Set(UFS));
    const ufs = new Set(Array.from({ length: 30 }, (_, i) => dadosDoVu(i + 1, hoje).perfil.uf));
    expect(ufs.size).toBe(27);
  });
});
