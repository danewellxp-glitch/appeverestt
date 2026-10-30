import type { AtualizarPerfilInput, DesafioAtual, MeResposta } from '@everest/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Avatar } from '../components/ui/Avatar';
import { Alerta, Carregando, Skeleton } from '../components/ui/basicos';
import { Contador } from '../components/ui/Contador';
import { useInscrever } from '../features/desafio/useInscrever';
import { type CampoPerfil, CAMPOS_PERFIL, FormularioPerfil } from '../features/auth/FormularioPerfil';
import { type ErrosCampos, errosDoServidor, mensagemGeral } from '../features/auth/formulario';
import { lerAceitePendente, limparAceitePendente, useAtualizarPerfil } from '../features/auth/perfil';
import { destinoSeguro } from '../features/auth/sessao';
import { api, ehApiError } from '../lib/api';
import { chaves, useDesafioAtual, useMe } from '../lib/queries';
import { LinkNav } from '../components/layout/LinkNav';
import { marcarDirecao } from '../lib/transicoes';

const ERROS_SEM_VAGA = ['VAGAS_ESGOTADAS', 'INSCRICOES_FECHADAS', 'DESAFIO_ENCERRADO', 'NAO_ENCONTRADO'] as const;

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Revelação animada do número da vaga ("Nº 37 de 50 vagas"). */
function RevelacaoVaga({ vaga, totalVagas }: { vaga: number; totalVagas: number }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titulo.current?.focus();
  }, []);
  return (
    <section className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="rotulo">Sua vaga</p>
      <h1
        ref={titulo}
        tabIndex={-1}
        aria-label={`Sua vaga: número ${vaga} de ${totalVagas}`}
        className="font-display text-[150px] leading-[0.8] font-black text-vermelho tabular-nums focus:outline-none"
        style={{ animation: 'revelar 520ms cubic-bezier(.2,1.2,.3,1) both' }}
      >
        <small className="mr-1.5 align-top text-[40px] text-texto">Nº</small>
        <Contador valor={vaga} />
      </h1>
      <p className="text-sm text-texto-2">de {totalVagas} vagas · inscrição confirmada</p>
      <Link
        to="/desafio"
        replace
        viewTransition
        onClick={() => marcarDirecao('avancar')}
        className="press mt-4 inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full border-2 border-transparent font-semibold [background:linear-gradient(var(--fundo),var(--fundo))_padding-box,linear-gradient(90deg,var(--vermelho),var(--laranja))_border-box]"
      >
        Ir para o desafio
        <ArrowRight className="size-5" aria-hidden />
      </Link>
    </section>
  );
}

function SemVaga({ mensagem }: { mensagem: string }) {
  return (
    <section className="flex flex-col gap-4 py-6">
      <Alerta tipo="erro">{mensagem}</Alerta>
      <p className="text-sm text-texto-2">Seus dados ficaram salvos e você continua logado.</p>
      <LinkNav
        to="/"
        className="press inline-flex h-[54px] items-center justify-center rounded-full bg-superficie-2 font-semibold"
      >
        Voltar ao início
      </LinkNav>
    </section>
  );
}

/**
 * Primeiro acesso (docs/FRONTEND.md §5.4 item 4, §9.3): nome completo, dados de cadastro, aceite e
 * marketing → PATCH /me → POST /inscricao → revelação da vaga. `?etapa=vaga` pula para a revelação.
 */
export default function BemVindo() {
  const { data: me } = useMe();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const desafioQ = useDesafioAtual();
  const atualizar = useAtualizarPerfil();
  const inscrever = useInscrever();
  const [aceitePreMarcado] = useState(lerAceitePendente);
  const [vaga, setVaga] = useState<number | null>(() =>
    params.get('etapa') === 'vaga' ? (me?.participacao?.vagaNumero ?? null) : null,
  );
  const [errosServidor, setErrosServidor] = useState<ErrosCampos<CampoPerfil>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [semVaga, setSemVaga] = useState<string | null>(null);
  // Enquanto envia, o cache do `me` muda (perfil completo, participação): não redirecionar no meio.
  const [enviando, setEnviando] = useState(false);
  const volta = destinoSeguro(params.get('volta'));

  if (!me) return <Carregando />;
  const totalVagas = desafioQ.data?.totalVagas ?? 50;
  if (vaga !== null) return <RevelacaoVaga vaga={vaga} totalVagas={totalVagas} />;
  // Já está tudo certo: nada a fazer aqui.
  if (!enviando && me.usuario.perfilCompleto && me.participacao) {
    return <Navigate to={volta ?? '/desafio'} replace />;
  }
  if (semVaga) return <SemVaga mensagem={semVaga} />;

  async function concluir(dados: AtualizarPerfilInput): Promise<void> {
    setEnviando(true);
    try {
      await enviar(dados);
    } finally {
      setEnviando(false);
    }
  }

  async function enviar(dados: AtualizarPerfilInput): Promise<void> {
    setErroGeral(null);
    setErrosServidor({});
    let atual: MeResposta;
    try {
      atual = await atualizar.mutateAsync(dados);
      limparAceitePendente();
    } catch (e) {
      const porCampo = errosDoServidor(e, CAMPOS_PERFIL);
      if (Object.keys(porCampo).length > 0) setErrosServidor(porCampo);
      else setErroGeral(mensagemGeral(e));
      return;
    }
    // Já inscrito (dados novos da R1.1): só completa o perfil e segue.
    if (atual.participacao) {
      void navegar(volta ?? '/desafio', { replace: true });
      return;
    }
    try {
      const desafio = await qc.ensureQueryData({
        queryKey: chaves.desafioAtual,
        queryFn: ({ signal }) => api<DesafioAtual>('/desafios/atual', { signal }),
      });
      const r = await inscrever.mutateAsync(desafio.slug);
      if (r.participacao.vagaNumero === null) void navegar('/desafio', { replace: true });
      else setVaga(r.participacao.vagaNumero);
    } catch (e) {
      if (ERROS_SEM_VAGA.some((c) => ehApiError(e, c))) setSemVaga(mensagemGeral(e));
      else setErroGeral(mensagemGeral(e));
    }
  }

  const ocupado = atualizar.isPending || inscrever.isPending;
  const jaInscrito = Boolean(me.participacao);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="surgir mt-[18px] flex flex-col items-center gap-2 text-center">
        <Avatar nome={me.usuario.nome} fotoUrl={me.usuario.fotoUrl} tamanho="xl" />
        <p className="rotulo">Primeiro acesso</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">
          Boas-vindas, {primeiroNome(me.usuario.nome)}
        </h1>
        <p className="text-sm text-texto-2">
          {jaInscrito ? 'Complete seus dados para continuar no desafio.' : 'Falta pouco para garantir sua vaga.'}
        </p>
      </header>

      <FormularioPerfil
        usuario={me.usuario}
        aceitePreMarcado={aceitePreMarcado}
        rotuloBotao={jaInscrito ? 'Salvar e continuar' : 'Garantir minha vaga'}
        carregando={ocupado}
        errosServidor={errosServidor}
        aoEnviar={(dados) => void concluir(dados)}
        antesDoBotao={erroGeral ? <Alerta tipo="erro">{erroGeral}</Alerta> : null}
      />

      {!jaInscrito &&
        (desafioQ.isPending ? (
          <Skeleton className="mx-auto h-4 w-40" />
        ) : desafioQ.data ? (
          <p className="text-center text-xs text-texto-2" aria-live="polite">
            {desafioQ.data.vagasDisponiveis} vagas restantes agora
          </p>
        ) : null)}
    </div>
  );
}
