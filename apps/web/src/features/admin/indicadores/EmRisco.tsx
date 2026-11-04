import type { AdminMetricas } from '@everest/shared';
import { MessageCircle, PartyPopper } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { marcarDirecao } from '../../../lib/transicoes';
import { plural } from '../graficos/formato';
import { linkWhatsappComTexto, primeiroNome } from '../desafio/regras';

type Pessoa = AdminMetricas['emRisco'][number];

const VISIVEIS = 8;

/** Mensagem pronta (o TT edita antes de enviar). */
export function mensagemEmRisco(p: Pessoa): string {
  return `Oi, ${primeiroNome(p.nome)}! Tudo bem? Vi que você não fechou os últimos ${p.diasSemConcluir} dias do desafio. Bora voltar hoje? Conta comigo!`;
}

/**
 * "Em risco": quem não concluiu os 2 dias anteriores ao atual, do mais sumido para o menos.
 * É a ação mais importante do painel: um toque abre o WhatsApp com a mensagem pronta.
 */
export function EmRisco({ m }: { m: AdminMetricas }) {
  const [todos, setTodos] = useState(false);
  const lista = m.emRisco;
  const visiveis = todos ? lista : lista.slice(0, VISIVEIS);
  const diaAtual = m.desafio.diaAtual ?? 0;

  return (
    <section
      aria-labelledby="titulo-em-risco"
      className="grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-em-risco" className="text-[17px] font-bold">
          Em risco
        </h2>
        {lista.length > 0 && (
          <span className="rounded-full bg-vermelho px-2.5 py-0.5 text-xs font-bold text-sobre-vermelho">
            {plural(lista.length, 'pessoa')}
          </span>
        )}
      </div>
      <p className="-mt-1.5 text-sm text-texto-2">
        Ativos que não concluíram os 2 dias anteriores. Uma mensagem sua agora faz a diferença.
      </p>

      {diaAtual < 3 ? (
        <p className="rounded-2xl bg-superficie-2 px-4 py-5 text-center text-sm text-texto-2">
          A lista começa no dia 3, quando já dá para ver quem ficou 2 dias sem concluir.
        </p>
      ) : lista.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-superficie-2 px-4 py-5 text-center text-sm text-texto-2">
          <PartyPopper className="size-5 shrink-0 text-vermelho-texto" aria-hidden />
          Ninguém em risco: todo mundo concluiu pelo menos um dos 2 últimos dias.
        </p>
      ) : (
        <>
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">
              Participantes em risco, do que está há mais dias sem concluir
            </caption>
            <thead className="text-[11px] tracking-[0.08em] text-texto-2 uppercase">
              <tr>
                <th scope="col" className="pb-1.5 font-semibold">
                  Participante
                </th>
                <th scope="col" className="w-[6.5rem] px-2 pb-1.5 text-right font-semibold">
                  Sem concluir
                </th>
                <th
                  scope="col"
                  className="hidden w-[6.5rem] px-2 pb-1.5 text-right font-semibold sm:table-cell"
                >
                  Concluídos
                </th>
                <th scope="col" className="w-14 pb-1.5 text-right font-semibold">
                  <span className="sr-only">Contato</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => (
                <tr key={p.participanteId} className="border-t border-borda">
                  <th scope="row" className="py-2 pr-2 text-left font-normal">
                    <Link
                      to={`/admin/participantes/${p.participanteId}`}
                      viewTransition
                      onClick={() => marcarDirecao('avancar')}
                      className="block truncate font-semibold underline-offset-4 hover:underline"
                    >
                      {p.nome}
                    </Link>
                    <small className="block text-xs text-texto-2">
                      {p.ultimoDiaConcluido !== null
                        ? `Último concluído: dia ${p.ultimoDiaConcluido}`
                        : 'Nenhum dia concluído'}
                      <span className="sm:hidden">
                        {' '}
                        · {plural(p.diasConcluidos, 'dia concluído', 'dias concluídos')}
                      </span>
                    </small>
                  </th>
                  <td
                    className={`px-2 py-2 text-right whitespace-nowrap tabular-nums ${p.diasSemConcluir >= 3 ? 'font-bold text-vermelho-texto' : 'font-semibold'}`}
                  >
                    {plural(p.diasSemConcluir, 'dia')}
                  </td>
                  <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">
                    {p.diasConcluidos}
                  </td>
                  <td className="py-2 text-right">
                    {p.whatsapp ? (
                      <a
                        href={linkWhatsappComTexto(p.whatsapp, mensagemEmRisco(p))}
                        target="_blank"
                        rel="noreferrer"
                        className="press inline-flex size-11 items-center justify-center rounded-full bg-superficie-2 hover:shadow-[inset_0_0_0_1px_var(--borda-campo)]"
                      >
                        <MessageCircle className="size-[18px]" aria-hidden />
                        <span className="sr-only">Chamar {p.nome} no WhatsApp</span>
                      </a>
                    ) : (
                      <span
                        className="inline-grid size-11 place-items-center text-texto-2"
                        title="Sem WhatsApp no cadastro"
                      >
                        <span aria-hidden>—</span>
                        <span className="sr-only">sem número</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lista.length > VISIVEIS && (
            <button
              type="button"
              onClick={() => setTodos((v) => !v)}
              className="press min-h-11 justify-self-start rounded-full bg-superficie-2 px-4 text-sm font-semibold"
            >
              {todos ? 'Mostrar menos' : `Ver todos (${lista.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
