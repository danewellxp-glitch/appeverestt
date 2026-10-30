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
 * Para onde ir quando já há sessão (logo depois de entrar, ou ao abrir /entrar já logado),
 * na ordem (docs/FRONTEND.md §5.4):
 *   perfil incompleto      → /bem-vindo (preservando acao/volta)
 *   ?acao=inscrever         → inscreve → /bem-vindo?etapa=vaga (revelação da vaga)
 *   ?volta=/rota            → volta (só caminhos internos)
 *   inscrito / não inscrito → /desafio / "/"
 * Roda uma vez por montagem.
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
      if (!sessao.usuario.perfilCompleto) {
        const busca = new URLSearchParams();
        if (acao) busca.set('acao', acao);
        if (volta) busca.set('volta', volta);
        const q = busca.toString();
        void navegar(`/bem-vindo${q ? `?${q}` : ''}`, { replace: true });
        return;
      }
      if (acao === 'inscrever' && !sessao.participacao) {
        try {
          const desafio = await qc.ensureQueryData({
            queryKey: chaves.desafioAtual,
            queryFn: ({ signal }) => api<DesafioAtual>('/desafios/atual', { signal }),
          });
          await inscrever(desafio.slug);
          void navegar('/bem-vindo?etapa=vaga', { replace: true });
        } catch (e) {
          setErro(mensagemGeral(e));
        }
        return;
      }
      const destino = destinoSeguro(volta) ?? (sessao.participacao ? '/desafio' : '/');
      void navegar(destino, { replace: true });
    }

    void concluir(me);
  }, [me, acao, volta, qc, inscrever, navegar]);

  return {
    /** Falha ao inscrever depois de entrar (ex.: vagas esgotadas). */
    erroInscricao: erro,
  };
}
