import { LIMITES, METAS, type AdminDiaDetalhe } from '@everest/shared';
import { Check } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Alerta, Skeleton } from '../../components/ui/basicos';
import { Botao } from '../../components/ui/Botao';
import { ehApiError } from '../../lib/api';
import { formatarData } from '../../lib/datas';
import { formatarDataHora, useAdminDia, useConferenciaDia, useInvalidacaoDia } from './consultas';
import { FotosDia } from './FotosDia';

const MOTIVO_MIN = 5;

type Situacao = 'CONFERIDO' | 'AGUARDANDO' | 'INVALIDADO' | 'INCOMPLETO' | 'ANDAMENTO';

function situacaoDoDia(dia: AdminDiaDetalhe): Situacao {
  if (dia.invalidado) return 'INVALIDADO';
  if (dia.concluido) return dia.conferidoEm ? 'CONFERIDO' : 'AGUARDANDO';
  return dia.editavel ? 'ANDAMENTO' : 'INCOMPLETO';
}

const PILULA: Record<Situacao, { rotulo: string; estilo: string }> = {
  CONFERIDO: { rotulo: 'Conferido', estilo: 'bg-vermelho text-sobre-vermelho' },
  AGUARDANDO: { rotulo: 'Aguardando conferência', estilo: 'bg-laranja text-texto escuro:text-fundo' },
  INVALIDADO: { rotulo: 'Invalidado', estilo: 'bg-superficie-2 text-vermelho-texto shadow-[inset_0_0_0_1.5px_var(--vermelho-texto)]' },
  INCOMPLETO: { rotulo: 'Incompleto', estilo: 'bg-superficie-2 text-texto-2' },
  ANDAMENTO: { rotulo: 'Em andamento', estilo: 'bg-superficie-2 text-texto' },
};

function Valores({ dia }: { dia: AdminDiaDetalhe }) {
  const itens = [
    { rotulo: 'Água', valor: `${dia.aguaMl.toLocaleString('pt-BR')} ml`, ok: dia.aguaMl >= METAS.aguaMl },
    { rotulo: 'Exercício', valor: dia.exercicio ? 'Feito' : 'Não feito', ok: dia.exercicio },
    { rotulo: 'Leitura', valor: `${dia.paginasLidas} pág.`, ok: dia.paginasLidas >= METAS.paginas },
    { rotulo: 'Story', valor: dia.storyPostado ? 'Postado' : 'Não postado', ok: dia.storyPostado },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2">
      {itens.map((i) => (
        <div key={i.rotulo} className="rounded-2xl bg-superficie-2 px-3 py-2.5">
          <dt className="rotulo">{i.rotulo}</dt>
          <dd className={`flex items-center gap-1 font-bold ${i.ok ? 'text-texto' : 'text-texto-2'}`}>
            {i.ok && <Check className="size-4 text-vermelho-texto" aria-hidden />}
            {i.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Ações por situação: Aprovar + Invalidar (aguardando), Invalidar (conferido), Revalidar (invalidado). */
function Acoes({ dia, situacao }: { dia: AdminDiaDetalhe; situacao: Situacao }) {
  const idMotivo = useId();
  const [invalidando, setInvalidando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erroMotivo, setErroMotivo] = useState<string | undefined>();
  const [aviso, setAviso] = useState('');
  const invalidacao = useInvalidacaoDia();
  const conferencia = useConferenciaDia();
  const diaId = dia.diaId;
  if (diaId === null) return null;

  function aprovar() {
    if (diaId === null) return;
    setAviso('Aprovando…');
    conferencia.mutate(
      { diaId, conferido: true },
      {
        onSuccess: () => setAviso(`Dia ${dia.numeroDia} aprovado.`),
        onError: (e) => setAviso(`Não foi possível aprovar: ${e.message}`),
      },
    );
  }

  function enviarInvalidacao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (diaId === null) return;
    const texto = motivo.trim();
    if (texto.length < MOTIVO_MIN) {
      setErroMotivo(`Escreva o motivo (pelo menos ${MOTIVO_MIN} caracteres).`);
      return;
    }
    setErroMotivo(undefined);
    setAviso('Invalidando…');
    invalidacao.mutate(
      { diaId, invalidado: true, motivo: texto },
      {
        onSuccess: () => {
          setInvalidando(false);
          setMotivo('');
          setAviso(`Dia ${dia.numeroDia} invalidado. Ele não conta mais no ranking.`);
        },
        onError: (erro) => {
          const doCampo = ehApiError(erro) ? erro.campos.motivo : undefined;
          if (doCampo) setErroMotivo(doCampo);
          setAviso(`Não foi possível invalidar: ${erro.message}`);
        },
      },
    );
  }

  function revalidar() {
    if (diaId === null) return;
    setAviso('Revalidando…');
    invalidacao.mutate(
      { diaId, invalidado: false },
      {
        onSuccess: (r) =>
          setAviso(
            r.concluido
              ? `Dia ${dia.numeroDia} revalidado: volta a contar e entra na fila de conferência.`
              : `Dia ${dia.numeroDia} revalidado. Ele ainda não cumpre todos os requisitos.`,
          ),
        onError: (e) => setAviso(`Não foi possível revalidar: ${e.message}`),
      },
    );
  }

  const ocupado = invalidacao.isPending || conferencia.isPending;

  return (
    <div className="grid gap-3 border-t border-borda pt-4">
      {situacao === 'INVALIDADO' && (
        <>
          <Alerta tipo="aviso">
            <p className="font-semibold">Motivo: {dia.motivoInvalidacao ?? 'não informado'}</p>
            {dia.invalidadoEm && <p className="mt-1 text-xs">Em {formatarDataHora(dia.invalidadoEm)}</p>}
          </Alerta>
          <Botao variante="secundario" larguraTotal carregando={invalidacao.isPending} onClick={revalidar}>
            Revalidar dia
          </Botao>
        </>
      )}

      {situacao !== 'INVALIDADO' && !invalidando && (
        <div className="flex flex-wrap gap-2">
          {situacao === 'AGUARDANDO' && (
            <Botao className="flex-1" carregando={conferencia.isPending} disabled={ocupado} onClick={aprovar}>
              Aprovar
            </Botao>
          )}
          <Botao
            variante="perigo"
            className="flex-1"
            disabled={ocupado}
            onClick={() => {
              invalidacao.reset();
              setAviso('');
              setInvalidando(true);
            }}
          >
            Invalidar
          </Botao>
        </div>
      )}

      {invalidando && (
        <form noValidate onSubmit={enviarInvalidacao} className="grid gap-2.5 rounded-2xl bg-superficie-2 p-3.5">
          <label htmlFor={idMotivo} className="text-sm font-semibold">
            Motivo da invalidação
          </label>
          <textarea
            id={idMotivo}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (erroMotivo) setErroMotivo(undefined);
            }}
            rows={3}
            maxLength={LIMITES.motivoInvalidacaoMax}
            autoFocus
            aria-invalid={erroMotivo ? true : undefined}
            aria-describedby={erroMotivo ? `${idMotivo}-erro` : `${idMotivo}-dica`}
            placeholder="Ex.: foto de leitura repetida do dia anterior."
            className={`min-h-[84px] rounded-[18px] border-[1.5px] bg-superficie px-4 py-3 text-base text-texto placeholder:text-texto-2 focus:border-vermelho focus-visible:outline-none ${erroMotivo ? 'border-vermelho-texto' : 'border-transparent'}`}
          />
          {erroMotivo ? (
            <p id={`${idMotivo}-erro`} className="text-[13px] text-vermelho-texto">
              {erroMotivo}
            </p>
          ) : (
            <p id={`${idMotivo}-dica`} className="text-xs text-texto-2">
              O participante vê o motivo no app.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Botao type="submit" tamanho="sm" variante="perigo" carregando={invalidacao.isPending}>
              Invalidar dia {dia.numeroDia}
            </Botao>
            <Botao
              tamanho="sm"
              variante="secundario"
              disabled={invalidacao.isPending}
              onClick={() => {
                setInvalidando(false);
                setErroMotivo(undefined);
              }}
            >
              Cancelar
            </Botao>
          </div>
        </form>
      )}

      <p aria-live="polite" className={`text-sm ${invalidacao.isError || conferencia.isError ? 'text-vermelho-texto' : 'text-texto-2'}`}>
        {aviso}
      </p>
    </div>
  );
}

/** Sinal de foto repetida no dia (X20): só alerta; a decisão continua manual (X8). */
function AvisoFotosParecidas({ dia }: { dia: AdminDiaDetalhe }) {
  const n = dia.fotos.filter((f) => f.parecida).length;
  if (n === 0) return null;
  return (
    <Alerta tipo="aviso">
      <p className="font-semibold">
        {n === 1
          ? 'Uma foto deste dia é parecida com outra já enviada no desafio.'
          : `${n} fotos deste dia são parecidas com outras já enviadas no desafio.`}
      </p>
      <p className="mt-1">É só um sinal: compare as fotos antes de aprovar ou invalidar.</p>
    </Alerta>
  );
}

/** Dia do participante para o embaixador: situação, fotos em tamanho cheio, valores e ações. */
export function PainelDia({
  slug,
  participanteId,
  numeroDia,
}: {
  slug: string;
  participanteId: string;
  numeroDia: number;
}) {
  const consulta = useAdminDia(slug, participanteId, numeroDia);
  const idTitulo = useId();

  if (consulta.isPending) {
    return (
      <div role="status" aria-label={`Carregando dia ${numeroDia}`} className="grid gap-3">
        <Skeleton className="h-10 rounded-2xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }
  if (consulta.isError) {
    return (
      <Alerta
        tipo="erro"
        acao={
          <Botao variante="secundario" tamanho="sm" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        }
      >
        {consulta.error.message}
      </Alerta>
    );
  }

  const dia = consulta.data;
  const situacao = situacaoDoDia(dia);
  const pilula = PILULA[situacao];
  return (
    <section
      aria-labelledby={idTitulo}
      className="grid gap-4 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={idTitulo} className="text-xl font-bold">
            Dia {dia.numeroDia}
          </h2>
          <p className="text-sm text-texto-2">{formatarData(dia.data, { comDiaSemana: true })}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${pilula.estilo}`}>{pilula.rotulo}</span>
      </div>

      {dia.diaId === null ? (
        <p className="text-sm text-texto-2">Sem registro neste dia: o participante não fez check-in.</p>
      ) : (
        <>
          <AvisoFotosParecidas dia={dia} />
          <FotosDia fotos={dia.fotos} numeroDia={dia.numeroDia} />
          <Valores dia={dia} />
          {dia.conferidoEm && situacao === 'CONFERIDO' && (
            <p className="text-xs text-texto-2">Aprovado em {formatarDataHora(dia.conferidoEm)}.</p>
          )}
          <Acoes key={dia.diaId} dia={dia} situacao={situacao} />
        </>
      )}
    </section>
  );
}
