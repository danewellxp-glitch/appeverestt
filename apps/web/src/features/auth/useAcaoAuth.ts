import { useQueryClient } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrosCampos } from './formulario';
import { type CampoAuth, traduzirErroAuth } from './errosFirebase';
import { concluirRedirect, trocarPorSessao } from './firebaseAuth';

export type OrigemAcao = 'email' | 'google';

/**
 * Estado comum de /entrar e /criar-conta: qual botão está carregando, erro geral e erros por campo.
 * `executar` roda a etapa do Firebase e troca o usuário pela sessão da API; quando o `me` chega,
 * a RotaVisitante leva a pessoa adiante (usePosAutenticacao).
 */
export function useAcaoAuth() {
  const qc = useQueryClient();
  const [carregando, setCarregando] = useState<OrigemAcao | null>(null);
  const [erroGeral, setErroGeral] = useState<{ mensagem: string; linkEntrar: boolean } | null>(null);
  const [errosFirebase, setErrosFirebase] = useState<ErrosCampos<CampoAuth>>({});
  const [tentativas, setTentativas] = useState(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const tratarErro = useCallback((e: unknown) => {
    if (!montado.current) return;
    const t = traduzirErroAuth(e);
    if (t.mensagem === null) return;
    if (t.campo) {
      setErrosFirebase({ [t.campo]: t.mensagem });
      setErroGeral(t.linkEntrar ? { mensagem: t.mensagem, linkEntrar: true } : null);
    } else {
      setErroGeral({ mensagem: t.mensagem, linkEntrar: Boolean(t.linkEntrar) });
    }
    setTentativas((n) => n + 1);
  }, []);

  const executar = useCallback(
    async (origem: OrigemAcao, etapa: () => Promise<User | null>) => {
      setCarregando(origem);
      setErroGeral(null);
      setErrosFirebase({});
      try {
        const usuario = await etapa();
        // null = saiu para o redirect do Google; a página vai embora.
        if (usuario) await trocarPorSessao(usuario, qc);
      } catch (e) {
        tratarErro(e);
      } finally {
        if (montado.current) setCarregando(null);
      }
    },
    [qc, tratarErro],
  );

  // Volta do redirect do Google (iPhone instalado ou popup bloqueado).
  useEffect(() => {
    let ativo = true;
    concluirRedirect()
      .then(async (usuario) => {
        if (!usuario || !ativo) return;
        setCarregando('google');
        await trocarPorSessao(usuario, qc);
      })
      .catch(tratarErro)
      .finally(() => {
        if (ativo && montado.current) setCarregando(null);
      });
    return () => {
      ativo = false;
    };
  }, [qc, tratarErro]);

  const limparErroCampo = useCallback((campo: CampoAuth) => {
    setErrosFirebase((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  }, []);

  return { carregando, erroGeral, errosFirebase, tentativas, executar, limparErroCampo };
}
