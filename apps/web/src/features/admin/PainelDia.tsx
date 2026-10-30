import {
  invalidacaoSchema,
  LIMITES,
  METAS,
  type AdminDiaDetalhe,
  type Requisito,
} from '@everest/shared';
import { useId, useState, type FormEvent } from 'react';
import { Botao } from '../../components/ui/Botao';
import { Alerta, Card, Skeleton } from '../../components/ui/basicos';
import { ehApiError } from '../../lib/api';
import { formatarData } from '../../lib/datas';
import { formatarDataHora, useAdminDia, useInvalidacaoDia } from './consultas';
import { FotosDia } from './FotosDia';

const NOME_REQUISITO: Record<Requisito, string> = {
  AGUA: `Água (${METAS.aguaMl / 1000} L)`,
  EXERCICIO: 'Exercício',
  LEITURA: `Leitura (${METAS.paginas} páginas)`,
  FOTOS: `${METAS.fotos} fotos`,
  STORY: 'Story postado',
};

function SeloSituacao({ dia }: { dia: AdminDiaDetalhe }) {
  const [rotulo, estilo] = dia.invalidado
    ? ['Invalidado', 'border-aviso-borda bg-aviso-fundo text-aviso-texto']
    : dia.concluido
      ? ['Concluído', 'border-ok-borda bg-ok-fundo text-ok-texto']
      : dia.editavel
        ? ['Em andamento', 'border-borda bg-superficie-2 text-texto']
        : ['Não concluído', 'border-borda bg-superficie-2 text-texto-2'];
  return (
    <span
      className={`rounded-md border px-2 py-1 text-xs font-bold uppercase tracking-wide ${estilo}`}
    >
      {rotulo}
    </span>
  );
}

function Valores({ dia }: { dia: AdminDiaDetalhe }) {
  const itens: { rotulo: string; valor: string; ok: boolean }[] = [
    {
      rotulo: 'Água',
      valor: `${dia.aguaMl.toLocaleString('pt-BR')} ml`,
      ok: dia.aguaMl >= METAS.aguaMl,
    },
    { rotulo: 'Exercício', valor: dia.exercicio ? 'Feito' : 'Não feito', ok: dia.exercicio },
    {
      rotulo: 'Páginas lidas',
      valor: `${dia.paginasLidas} ${dia.paginasLidas === 1 ? 'página' : 'páginas'}`,
      ok: dia.paginasLidas >= METAS.paginas,
    },
    { rotulo: 'Story', valor: dia.storyPostado ? 'Postado' : 'Não postado', ok: dia.storyPostado },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2">
      {itens.map((i) => (
        <div key={i.rotulo} className="rounded-xl border border-borda bg-superficie-2 p-3">
          <dt className="rotulo">{i.rotulo}</dt>
          <dd className={`text-lg font-bold ${i.ok ? 'text-texto' : 'text-texto-2'}`}>{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

type Etapa = 'fechado' | 'motivo' | 'confirmar';

function AcoesInvalidacao({
  dia,
  nomeParticipante,
}: {
  dia: AdminDiaDetalhe;
  nomeParticipante: string;
}) {
  const idMotivo = useId();
  const idErro = `${idMotivo}-erro`;
  const idContador = `${idMotivo}-contador`;
  const [etapa, setEtapa] = useState<Etapa>('fechado');
  const [motivo, setMotivo] = useState('');
  const [erroMotivo, setErroMotivo] = useState<string | undefined>();
  const [aviso, setAviso] = useState('');
  const mutacao = useInvalidacaoDia();

  const diaId = dia.diaId;
  if (diaId === null) return null;

  function validarMotivo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = invalidacaoSchema.safeParse({ invalidado: true, motivo });
    if (!r.success) {
      setErroMotivo(
        r.error.issues.find((i) => i.path[0] === 'motivo')?.message ?? 'Motivo inválido.',
      );
      return;
    }
    setErroMotivo(undefined);
    setEtapa('confirmar');
  }

  function invalidar() {
    if (diaId === null) return;
    setAviso('Invalidando o dia…');
    mutacao.mutate(
      { diaId, invalidado: true, motivo: motivo.trim() },
      {
        onSuccess: () => {
          setEtapa('fechado');
          setMotivo('');
          setAviso(`Dia ${dia.numeroDia} invalidado. Ele não conta mais no ranking.`);
        },
        onError: (e) => {
          const doCampo = ehApiError(e) ? e.campos.motivo : undefined;
          if (doCampo) {
            setErroMotivo(doCampo);
            setEtapa('motivo');
          }
          setAviso(`Não foi possível invalidar: ${e.message}`);
        },
      },
    );
  }

  function revalidar() {
    if (diaId === null) return;
    setAviso('Revalidando o dia…');
    mutacao.mutate(
      { diaId, invalidado: false },
      {
        onSuccess: (r) =>
          setAviso(
            r.concluido
              ? `Dia ${dia.numeroDia} revalidado e volta a contar como concluído.`
              : `Dia ${dia.numeroDia} revalidado. Ele ainda não cumpre todos os requisitos.`,
          ),
        onError: (e) => setAviso(`Não foi possível revalidar: ${e.message}`),
      },
    );
  }

  const status = (
    <p
      aria-live="polite"
      className={`text-sm ${mutacao.isError ? 'text-vermelho-texto' : 'text-texto-2'}`}
    >
      {aviso}
    </p>
  );

  return (
    <div className="flex flex-col gap-3">
      {dia.invalidado ? (
        <>
          <Alerta tipo="aviso">
            <p className="font-semibold">Dia invalidado</p>
            <p className="mt-1">Motivo: {dia.motivoInvalidacao ?? 'não informado'}</p>
            {dia.invalidadoEm && (
              <p className="mt-1 text-xs">Em {formatarDataHora(dia.invalidadoEm)}</p>
            )}
          </Alerta>
          <Botao
            variante="secundario"
            larguraTotal
            carregando={mutacao.isPending}
            onClick={revalidar}
          >
            Revalidar dia
          </Botao>
        </>
      ) : (
        <>
          {etapa === 'fechado' && (
            <Botao
              variante="secundario"
              larguraTotal
              onClick={() => {
                mutacao.reset();
                setAviso('');
                setEtapa('motivo');
              }}
            >
              Invalidar dia
            </Botao>
          )}

          {etapa === 'motivo' && (
            <form
              noValidate
              onSubmit={validarMotivo}
              className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie-2 p-3"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor={idMotivo} className="text-sm font-semibold">
                  Motivo da invalidação (obrigatório)
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
                  required
                  autoFocus
                  aria-invalid={erroMotivo ? true : undefined}
                  aria-describedby={erroMotivo ? `${idErro} ${idContador}` : idContador}
                  placeholder="Ex.: foto de leitura repetida do dia anterior."
                  className={`min-h-24 rounded-xl border bg-fundo px-3 py-2 text-base text-texto placeholder:text-texto-2 ${
                    erroMotivo ? 'border-vermelho-texto' : 'border-borda-campo'
                  }`}
                />
                {erroMotivo && (
                  <p id={idErro} className="text-sm text-vermelho-texto">
                    {erroMotivo}
                  </p>
                )}
                <p id={idContador} className="text-right text-xs text-texto-2">
                  {motivo.length}/{LIMITES.motivoInvalidacaoMax} caracteres
                </p>
              </div>
              <p className="text-xs text-texto-2">O participante vê o motivo no app.</p>
              <div className="flex flex-wrap gap-2">
                <Botao type="submit">Continuar</Botao>
                <Botao
                  variante="fantasma"
                  onClick={() => {
                    setEtapa('fechado');
                    setErroMotivo(undefined);
                  }}
                >
                  Cancelar
                </Botao>
              </div>
            </form>
          )}

          {etapa === 'confirmar' && (
            <div className="flex flex-col gap-3 rounded-xl border border-aviso-borda bg-aviso-fundo p-3">
              <p className="text-sm">
                Invalidar o <strong>dia {dia.numeroDia}</strong> de{' '}
                <strong>{nomeParticipante}</strong>? O dia deixa de contar no ranking e na
                sequência.
              </p>
              <p className="text-sm text-texto-2">Motivo: “{motivo.trim()}”</p>
              <div className="flex flex-wrap gap-2">
                <Botao autoFocus carregando={mutacao.isPending} onClick={invalidar}>
                  Confirmar invalidação
                </Botao>
                <Botao
                  variante="secundario"
                  disabled={mutacao.isPending}
                  onClick={() => setEtapa('motivo')}
                >
                  Voltar
                </Botao>
              </div>
            </div>
          )}
        </>
      )}
      {status}
    </div>
  );
}

/** Painel de um dia do participante: valores, fotos em tamanho cheio, pendências e ações. */
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
      <div role="status" aria-label={`Carregando dia ${numeroDia}`} className="flex flex-col gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Alerta
        tipo="erro"
        acao={
          <Botao variante="secundario" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        }
      >
        {consulta.error.message}
      </Alerta>
    );
  }

  const dia = consulta.data;
  return (
    <section aria-labelledby={idTitulo}>
      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id={idTitulo} className="text-xl font-bold">
              Dia {dia.numeroDia}
            </h2>
            <p className="text-sm text-texto-2">{formatarData(dia.data, { comDiaSemana: true })}</p>
          </div>
          <SeloSituacao dia={dia} />
        </div>

        {dia.diaId === null ? (
          <Alerta tipo="info">
            Sem registro neste dia: o participante não fez check-in, então não há nada para
            invalidar.
          </Alerta>
        ) : (
          <>
            <Valores dia={dia} />

            <div className="flex flex-col gap-2">
              <h3 className="font-bold">Pendências</h3>
              {dia.invalidado ? (
                <p className="text-sm text-texto-2">
                  O dia foi invalidado e não conta, mesmo com os requisitos.
                </p>
              ) : dia.requisitosPendentes.length === 0 ? (
                <p className="text-sm text-texto-2">
                  Nenhuma: todos os requisitos foram cumpridos.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {dia.requisitosPendentes.map((r) => (
                    <li
                      key={r}
                      className="rounded-lg border border-borda bg-superficie-2 px-2 py-1 text-xs font-semibold text-texto"
                    >
                      {NOME_REQUISITO[r]}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-bold">Fotos</h3>
              <FotosDia fotos={dia.fotos} numeroDia={dia.numeroDia} />
            </div>
          </>
        )}

        {dia.diaId !== null && (
          <div className="flex flex-col gap-2 border-t border-borda pt-4">
            <h3 className="font-bold">Ações do embaixador</h3>
            <AcoesInvalidacao dia={dia} nomeParticipante={dia.nomeParticipante} />
          </div>
        )}
      </Card>
    </section>
  );
}
