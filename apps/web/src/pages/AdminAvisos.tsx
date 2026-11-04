import {
  ACOES_RAPIDAS,
  LIMITES_AVISO_PUSH,
  MODELOS_AVISO,
  avisoPushSchema,
  type AcaoRapida,
  type AvisoPushInput,
  type AvisoPushResultado,
} from '@everest/shared';
import { BookOpen, Droplets, Dumbbell, Send, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { IconeMontanha } from '../components/layout/Marca';
import { AreaTexto } from '../components/ui/AreaTexto';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/CampoTexto';
import { FolhaInferior } from '../components/ui/FolhaInferior';
import { mensagemGeral } from '../features/auth/formulario';
import { useAdminPush, useEnviarAviso } from '../features/admin/consultas';
import { useContextoPainel } from '../features/admin/LayoutPainel';

const CLASSE_TITULO = 'mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase';
const CLASSE_CARTAO = 'grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]';
const FORMATO = new Intl.NumberFormat('pt-BR');

const ICONES: Record<AcaoRapida, LucideIcon> = { agua: Droplets, treino: Dumbbell, leitura: BookOpen };
const NOMES: Record<AcaoRapida, string> = { agua: 'Água', treino: 'Treino', leitura: 'Leitura' };

function plural(n: number, um: string, varios: string): string {
  return `${FORMATO.format(n)} ${n === 1 ? um : varios}`;
}

/** Título, texto e botão que a notificação vai mostrar. */
function conteudoDoAviso(aviso: AvisoPushInput): { titulo: string; corpo: string; botao?: string } {
  if (aviso.modelo === 'livre') return { titulo: aviso.titulo ?? '', corpo: aviso.corpo ?? '' };
  return MODELOS_AVISO[aviso.modelo];
}

/** Prévia com cara de notificação do celular. */
function PreviaNotificacao({ titulo, corpo, botao }: { titulo: string; corpo: string; botao?: string | undefined }) {
  return (
    <figure className="grid gap-2 rounded-[22px] bg-superficie-2 p-3.5" aria-label="Prévia da notificação">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-black text-white">
          <IconeMontanha className="size-6" />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <p className="text-xs text-texto-2">Everest · agora</p>
          <p className="text-[15px] font-semibold [overflow-wrap:anywhere]">{titulo}</p>
          <p className="text-sm text-texto-2 [overflow-wrap:anywhere]">{corpo}</p>
        </div>
      </div>
      {botao && (
        <p className="pl-12 text-xs text-texto-2">
          <span className="mr-1.5 inline-block rounded-full bg-superficie px-2.5 py-1 text-[13px] font-semibold text-texto">
            {botao}
          </span>
          botão no Android (registra sem abrir o app)
        </p>
      )}
    </figure>
  );
}

function ResultadoEnvio({ r }: { r: AvisoPushResultado }) {
  if (r.destinatarios === 0) {
    return <Alerta tipo="info">Ninguém com os lembretes ativos para receber este aviso.</Alerta>;
  }
  return (
    <Alerta tipo="sucesso">
      <p className="font-semibold">
        Aviso enviado: {FORMATO.format(r.entregues)} de {plural(r.destinatarios, 'aparelho', 'aparelhos')}.
      </p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
        {(
          [
            ['Destinatários', r.destinatarios],
            ['Entregues', r.entregues],
            ['Removidas', r.removidas],
            ['Falhas', r.falhas],
          ] as const
        ).map(([rotulo, valor]) => (
          <div key={rotulo} className="flex gap-1.5">
            <dt>{rotulo}:</dt>
            <dd className="font-semibold tabular-nums">{FORMATO.format(valor)}</dd>
          </div>
        ))}
      </dl>
      {r.removidas > 0 && (
        <p className="mt-1.5 text-xs">Removidas: aparelhos que desinstalaram o app ou bloquearam as notificações.</p>
      )}
    </Alerta>
  );
}

type ErrosLivre = Partial<Record<'titulo' | 'corpo', string>>;

/** /admin/avisos (aba Avisos, R22): dispara push para os confirmados com os lembretes ativos. */
export default function AdminAvisos() {
  const { desafio } = useContextoPainel();
  const resumo = useAdminPush(desafio.slug);
  const enviar = useEnviarAviso(desafio.slug);
  const [pendente, setPendente] = useState<AvisoPushInput | null>(null);
  const [resultado, setResultado] = useState<AvisoPushResultado | null>(null);
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [erros, setErros] = useState<ErrosLivre>({});
  const { tituloMax, corpoMax } = LIMITES_AVISO_PUSH;

  function revisar(aviso: AvisoPushInput) {
    enviar.reset();
    setPendente(aviso);
  }

  function revisarLivre(e: FormEvent) {
    e.preventDefault();
    const r = avisoPushSchema.safeParse({ modelo: 'livre', titulo, corpo });
    if (!r.success) {
      const novos: ErrosLivre = {};
      for (const issue of r.error.issues) {
        const campo = issue.path[0];
        if ((campo === 'titulo' || campo === 'corpo') && !novos[campo]) novos[campo] = issue.message;
      }
      setErros(novos);
      return;
    }
    setErros({});
    revisar(r.data);
  }

  function confirmar() {
    if (!pendente) return;
    enviar.mutate(pendente, {
      onSuccess: (r) => {
        setResultado(r);
        if (pendente.modelo === 'livre') {
          setTitulo('');
          setCorpo('');
        }
        setPendente(null);
      },
    });
  }

  const pessoas = resumo.data?.pessoas ?? 0;
  const previa = pendente ? conteudoDoAviso(pendente) : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <section aria-labelledby="titulo-quem-recebe" className="flex flex-col gap-3">
          <h2 id="titulo-quem-recebe" className={CLASSE_TITULO}>
            Quem recebe
          </h2>
          {resumo.isPending ? (
            <Skeleton className="h-[92px] rounded-3xl" />
          ) : resumo.isError ? (
            <Alerta
              tipo="erro"
              acao={
                <Botao variante="secundario" tamanho="sm" onClick={() => void resumo.refetch()}>
                  Tentar de novo
                </Botao>
              }
            >
              {mensagemGeral(resumo.error)}
            </Alerta>
          ) : (
            <div className={CLASSE_CARTAO}>
              <p>
                <span className="font-display text-[38px] leading-[0.9] font-extrabold tabular-nums">
                  {FORMATO.format(resumo.data.pessoas)}
                </span>{' '}
                <span className="text-[15px] font-semibold">
                  {resumo.data.pessoas === 1 ? 'pessoa com os lembretes ativos' : 'pessoas com os lembretes ativos'}
                </span>
              </p>
              <p className="text-sm text-texto-2">
                {plural(resumo.data.aparelhos, 'aparelho', 'aparelhos')}. Só participantes confirmados que ativaram em
                Perfil → Lembretes no celular.
              </p>
            </div>
          )}
          {resultado && <ResultadoEnvio r={resultado} />}
        </section>

        <section aria-labelledby="titulo-prontos" className="flex flex-col gap-3">
          <h2 id="titulo-prontos" className={CLASSE_TITULO}>
            Avisos prontos
          </h2>
          <ul className="grid gap-2.5">
            {ACOES_RAPIDAS.map((acao) => {
              const Icone = ICONES[acao];
              const m = MODELOS_AVISO[acao];
              return (
                <li key={acao}>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => revisar({ modelo: acao })}
                    className={`press w-full text-left hover:bg-superficie-2 ${CLASSE_CARTAO} grid-cols-[auto_1fr] items-start`}
                  >
                    <span aria-hidden className="grid size-[42px] place-items-center rounded-full bg-superficie-2 text-vermelho-texto">
                      <Icone className="size-5" />
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-[15px] font-semibold">Enviar lembrete: {NOMES[acao]}</span>
                      <span className="text-sm text-texto-2 [overflow-wrap:anywhere]">
                        {m.titulo} · {m.corpo}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section aria-labelledby="titulo-livre" className="flex min-w-0 flex-col gap-3">
        <h2 id="titulo-livre" className={CLASSE_TITULO}>
          Mensagem livre
        </h2>
        <form noValidate onSubmit={revisarLivre} className={CLASSE_CARTAO}>
          <CampoTexto
            rotulo="Título"
            value={titulo}
            maxLength={tituloMax}
            onChange={(e) => setTitulo(e.target.value)}
            erro={erros.titulo}
            dica={`${titulo.length}/${tituloMax}`}
            autoComplete="off"
          />
          <AreaTexto
            rotulo="Mensagem"
            value={corpo}
            maxLength={corpoMax}
            rows={3}
            onChange={(e) => setCorpo(e.target.value)}
            erro={erros.corpo}
          />
          <p className="text-xs text-texto-2">Sem botão de ação: o toque abre o app no desafio.</p>
          <Botao type="submit" larguraTotal icone={<Send className="size-5" aria-hidden />}>
            Revisar e enviar
          </Botao>
        </form>
      </section>

      <FolhaInferior aberta={pendente !== null} aoFechar={() => setPendente(null)} titulo="Enviar este aviso?">
        {previa && <PreviaNotificacao titulo={previa.titulo} corpo={previa.corpo} botao={previa.botao} />}
        <p className="text-sm text-texto-2">
          {resumo.data
            ? `Vai para ${plural(pessoas, 'pessoa', 'pessoas')} (${plural(resumo.data.aparelhos, 'aparelho', 'aparelhos')}). Não dá para desfazer.`
            : 'Vai para todos os confirmados com os lembretes ativos. Não dá para desfazer.'}
        </p>
        {enviar.isError && <Alerta tipo="erro">{mensagemGeral(enviar.error)}</Alerta>}
        <Botao variante="secundario" larguraTotal onClick={() => setPendente(null)} disabled={enviar.isPending}>
          Cancelar
        </Botao>
        <Botao larguraTotal carregando={enviar.isPending} onClick={confirmar} icone={<Send className="size-5" aria-hidden />}>
          Enviar agora
        </Botao>
      </FolhaInferior>
    </div>
  );
}
