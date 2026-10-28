import { useQueryClient } from '@tanstack/react-query';
import type { DesafioAtual, MeResposta } from '@everest/shared';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { useInscrever } from '../desafio/useInscrever';
import { mensagemGeral } from './formulario';
import { destinoSeguro } from './sessao';

/**
 * O que fazer quando há uma sessão (logo após login/cadastro, ou ao abrir /login e
 * /cadastro já logado):
 *   ?acao=inscrever → inscreve no desafio atual → /hoje (erro: fica na tela com a mensagem)
 *   ?volta=/rota    → volta para a rota (só caminhos internos)
 *   senão           → /hoje se inscrito, "/" se não.
 * Roda uma única vez por montagem (o `me` aparece no cache e o efeito dispara).
 */
export function usePosAutenticacao(me: MeResposta | null | undefined) {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const { mutateAsync: inscrever } = useInscrever();
  const iniciado = useRef(false);
  const [erro, setErro] = useState<string | null>(null);

  const acao = params.get('acao');
  const volta = params.get('volta');

  useEffect(() => {
    if (!me || iniciado.current) return;
    iniciado.current = true;

    async function concluir(sessao: MeResposta): Promise<void> {
      if (acao === 'inscrever' && !sessao.participacao) {
        try {
          const desafio = await qc.ensureQueryData({
            queryKey: chaves.desafioAtual,
            queryFn: ({ signal }) => api<DesafioAtual>('/desafios/atual', { signal }),
          });
          await inscrever(desafio.slug);
          void navegar('/hoje', { replace: true });
        } catch (e) {
          setErro(mensagemGeral(e));
        }
        return;
      }
      const destino = destinoSeguro(volta) ?? (sessao.participacao ? '/hoje' : '/');
      void navegar(destino, { replace: true });
    }

    void concluir(me);
  }, [me, acao, volta, qc, inscrever, navegar]);

  return {
    /** Há sessão e o redirecionamento/inscrição está em andamento. */
    redirecionando: Boolean(me) && erro === null,
    /** Falha ao inscrever depois de entrar (ex.: vagas esgotadas). */
    erroInscricao: erro,
  };
}
