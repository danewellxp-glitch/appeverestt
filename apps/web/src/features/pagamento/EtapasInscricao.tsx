import { Check, Hourglass } from 'lucide-react';
import { tempoRelativo } from '../../lib/datas';

type Situacao = 'feita' | 'atual' | 'proxima';

interface Etapa {
  titulo: string;
  texto: string;
  situacao: Situacao;
}

const DESCRICAO: Record<Situacao, string> = {
  feita: 'concluída',
  atual: 'em andamento',
  proxima: 'a seguir',
};

/** As etapas de quem já avisou o pagamento (INFORMADO): a conferência do TT é a etapa atual. */
export function etapasDoInformado(p: {
  vagaNumero: number | null;
  totalVagas: number;
  informadoEm: string | null;
  apelido: string;
  agora?: number;
}): Etapa[] {
  return [
    {
      titulo: 'Vaga reservada',
      texto: p.vagaNumero !== null ? `Nº ${p.vagaNumero} de ${p.totalVagas}` : `Entre as ${p.totalVagas}`,
      situacao: 'feita',
    },
    {
      titulo: 'Pix informado',
      texto: p.informadoEm ? `Aviso enviado ${tempoRelativo(p.informadoEm, p.agora)}` : 'Aviso enviado',
      situacao: 'feita',
    },
    {
      titulo: `Conferência do ${p.apelido}`,
      texto: 'Ele confere o Pix no extrato, em algumas horas.',
      situacao: 'atual',
    },
    { titulo: 'Acesso liberado', texto: 'Aqui no app e pelo WhatsApp.', situacao: 'proxima' },
  ];
}

/** Linha do tempo da inscrição na /pagamento (pagamento em análise). */
export function EtapasInscricao(props: {
  vagaNumero: number | null;
  totalVagas: number;
  informadoEm: string | null;
  apelido: string;
}) {
  const etapas = etapasDoInformado(props);
  return (
    <section aria-labelledby="titulo-etapas" className="grid gap-2">
      <h2 id="titulo-etapas" className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase">
        Sua inscrição
      </h2>
      <ol className="overflow-hidden rounded-3xl bg-superficie shadow-[inset_0_0_0_1px_var(--borda)]">
        {etapas.map((e) => (
          <li
            key={e.titulo}
            aria-current={e.situacao === 'atual' ? 'step' : undefined}
            className="grid grid-cols-[auto_1fr] items-start gap-3 border-borda px-4 py-3.5 [&+&]:border-t"
          >
            <span
              aria-hidden
              className={`grid size-9 place-items-center rounded-full ${
                e.situacao === 'feita'
                  ? 'bg-vermelho text-sobre-vermelho'
                  : e.situacao === 'atual'
                    ? 'bg-superficie-2 text-vermelho-texto shadow-[inset_0_0_0_2px_var(--vermelho)]'
                    : 'bg-superficie-2 text-texto-2'
              }`}
            >
              {e.situacao === 'feita' ? (
                <Check className="size-4" />
              ) : e.situacao === 'atual' ? (
                <Hourglass className="size-4" />
              ) : (
                <span className="size-2 rounded-full bg-current" />
              )}
            </span>
            <div>
              <b className="block text-[15px]">
                {e.titulo}
                <span className="sr-only"> ({DESCRICAO[e.situacao]})</span>
              </b>
              <p className="text-[13px] text-texto-2">{e.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
