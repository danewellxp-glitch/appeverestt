import type { AdminParticipante } from '@everest/shared';
import { MessageCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Botao } from '../../components/ui/Botao';
import { tempoRelativo } from '../../lib/datas';
import { marcarDirecao } from '../../lib/transicoes';
import { mensagemGeral } from '../auth/formulario';
import { useAtualizarPagamento } from './consultas';

/** Link do WhatsApp (número só com dígitos e DDD, sem +55). */
export function linkWhatsapp(numero: string): string {
  return `https://wa.me/55${numero.replace(/\D/g, '')}`;
}

/** Quem avisou primeiro aparece primeiro. */
function ordenarPorAviso(lista: readonly AdminParticipante[]): AdminParticipante[] {
  return lista
    .filter((p) => p.pagamentoStatus === 'INFORMADO')
    .sort((a, b) => (a.pagamentoInformadoEm ?? '').localeCompare(b.pagamentoInformadoEm ?? ''));
}

/**
 * "Pagamentos a confirmar" (X12): quem tocou em "Já fiz o pagamento". O embaixador confere no
 * banco e confirma (libera o acesso) ou marca "Não recebi" (volta para pendente e a pessoa vê o aviso).
 */
export function FilaPagamentos({ slug, participantes }: { slug: string; participantes: AdminParticipante[] }) {
  const fila = useMemo(() => ordenarPorAviso(participantes), [participantes]);
  const atualizar = useAtualizarPagamento(slug);
  const [aviso, setAviso] = useState('');
  const [emAndamento, setEmAndamento] = useState<string | null>(null);

  function decidir(p: AdminParticipante, status: 'CONFIRMADO' | 'PENDENTE') {
    setEmAndamento(p.participanteId);
    setAviso(status === 'CONFIRMADO' ? `Confirmando o pagamento de ${p.nome}…` : `Marcando como não recebido…`);
    atualizar.mutate(
      { participanteId: p.participanteId, status },
      {
        onSuccess: () =>
          setAviso(
            status === 'CONFIRMADO'
              ? `Pagamento de ${p.nome} confirmado. O acesso foi liberado.`
              : `${p.nome} voltou para pendente e vai ver o aviso para conferir o pagamento.`,
          ),
        onError: (e) => setAviso(`Não foi possível atualizar: ${mensagemGeral(e)}`),
        onSettled: () => setEmAndamento(null),
      },
    );
  }

  return (
    <section aria-labelledby="titulo-fila-pagamentos" className="flex flex-col gap-3">
      <h2
        id="titulo-fila-pagamentos"
        className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase"
      >
        Pagamentos a confirmar
      </h2>
      {fila.length === 0 ? (
        <p className="rounded-3xl bg-superficie p-5 text-sm text-texto-2 shadow-[inset_0_0_0_1px_var(--borda)]">
          Nenhum aviso de pagamento esperando conferência.
        </p>
      ) : (
        <ul className="grid gap-2">
          {fila.map((p) => {
            const ocupado = emAndamento === p.participanteId;
            return (
              <li
                key={p.participanteId}
                className="grid gap-3 rounded-[20px] bg-superficie p-3.5 shadow-[inset_0_0_0_1px_var(--borda)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid min-w-0">
                    <Link
                      to={`/admin/participantes/${p.participanteId}`}
                      viewTransition
                      onClick={() => marcarDirecao('avancar')}
                      className="truncate font-semibold underline-offset-4 hover:underline"
                    >
                      {p.nome}
                    </Link>
                    <small className="text-xs text-texto-2">
                      {p.vagaNumero !== null ? `Vaga nº ${p.vagaNumero} · ` : ''}
                      {p.pagamentoInformadoEm ? `informou ${tempoRelativo(p.pagamentoInformadoEm)}` : 'informou o pagamento'}
                    </small>
                  </div>
                  {p.whatsapp && (
                    <a
                      href={linkWhatsapp(p.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      className="press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-superficie-2 px-3.5 text-sm font-semibold"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      WhatsApp
                      <span className="sr-only"> de {p.nome}</span>
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Botao
                    tamanho="sm"
                    className="flex-1"
                    carregando={ocupado && atualizar.variables?.status === 'CONFIRMADO'}
                    disabled={emAndamento !== null}
                    onClick={() => decidir(p, 'CONFIRMADO')}
                  >
                    Confirmar<span className="sr-only"> pagamento de {p.nome}</span>
                  </Botao>
                  <Botao
                    tamanho="sm"
                    variante="perigo"
                    className="flex-1"
                    carregando={ocupado && atualizar.variables?.status === 'PENDENTE'}
                    disabled={emAndamento !== null}
                    onClick={() => decidir(p, 'PENDENTE')}
                  >
                    Não recebi<span className="sr-only"> o pagamento de {p.nome}</span>
                  </Botao>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p aria-live="polite" className={`px-1 text-sm ${atualizar.isError ? 'text-vermelho-texto' : 'text-texto-2'}`}>
        {aviso}
      </p>
    </section>
  );
}
