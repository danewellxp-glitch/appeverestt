import type { PagamentoResposta, PixPagamento } from '@everest/shared';
import { Check, Copy, Hourglass } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Navigate } from 'react-router';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { LinkNav } from '../components/layout/LinkNav';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { useToast } from '../components/ui/Toast';
import { tt } from '../content/landing';
import { mensagemGeral } from '../features/auth/formulario';
import { copiarTexto } from '../features/desafio/navegacao';
import { RevelacaoVaga } from '../features/desafio/RevelacaoVaga';
import { finalDoWhatsapp } from '../features/landing/contato';
import { EtapasInscricao } from '../features/pagamento/EtapasInscricao';
import { QrPix } from '../features/pagamento/QrPix';
import { useInformarPagamento, usePagamento } from '../features/pagamento/usePagamento';
import { chaveInicioPix, useTemporizador } from '../features/pagamento/useTemporizador';
import { useDesafioAtual, useMe } from '../lib/queries';
import { formatarReais } from '../lib/moeda';

/** Vagas quando o desafio ainda não carregou. */
const VAGAS_PADRAO = 50;

/** Tempo do relógio (só visual: o código não expira). */
const SEGUNDOS_PARA_PAGAR = 5 * 60;

const CLASSE_CARD = 'grid gap-4 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]';
const CLASSE_LINK =
  'font-semibold text-texto underline decoration-vermelho underline-offset-4 hover:decoration-2';

function semArroba(handle: string): string {
  return handle.trim().replace(/^@+/, '');
}

function Topo() {
  return (
    <header className="surgir flex items-center gap-3">
      <BotaoVoltar para="/" />
      <div className="min-w-0 flex-1">
        <p className="rotulo">Passo 2 de 2</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Pagamento</h1>
      </div>
      <LinkNav
        to="/perfil"
        className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4"
      >
        Minha conta
      </LinkNav>
    </header>
  );
}

function Contato({ handle }: { handle: string }) {
  const h = semArroba(handle);
  if (!h) return null;
  return (
    <p className="text-center text-sm text-texto-2">
      Dúvidas? Chame no Instagram{' '}
      <a href={`https://instagram.com/${encodeURIComponent(h)}`} target="_blank" rel="noreferrer" className={CLASSE_LINK}>
        @{h}
      </a>
    </p>
  );
}

/** QR + código copia e cola (input somente leitura, porque o clipboard pode faltar em webviews). */
function BlocoPix({ pix }: { pix: PixPagamento }) {
  const { toast } = useToast();
  const idCodigo = useId();
  const campo = useRef<HTMLInputElement>(null);

  async function copiar() {
    const ok = await copiarTexto(pix.copiaECola);
    if (ok) {
      toast('Código Pix copiado.');
      return;
    }
    campo.current?.focus();
    campo.current?.select();
    toast('Não deu para copiar. O código está selecionado: copie pelo menu do celular.', { duracao: 5000 });
  }

  return (
    <div className="grid gap-4">
      <QrPix payload={pix.copiaECola} valorCentavos={pix.valorCentavos} />
      <div className="grid gap-1.5">
        <label htmlFor={idCodigo} className="px-1 text-[13px] font-medium text-texto-2">
          Pix copia e cola
        </label>
        <input
          ref={campo}
          id={idCodigo}
          readOnly
          value={pix.copiaECola}
          onFocus={(e) => e.currentTarget.select()}
          className="h-[54px] w-full min-w-0 truncate rounded-full border-[1.5px] border-transparent bg-superficie-2 px-[22px] font-mono text-sm text-texto focus:border-vermelho focus-visible:outline-none"
        />
      </div>
      <Botao variante="secundario" larguraTotal onClick={() => void copiar()} icone={<Copy className="size-5" aria-hidden />}>
        Copiar código Pix
      </Botao>
      <p className="text-center text-xs text-texto-2">
        Recebedor: <b className="text-texto">{pix.nomeRecebedor}</b> · chave {pix.chave}
      </p>
    </div>
  );
}

function Relogio({ participanteId }: { participanteId: string }) {
  const idRotulo = useId();
  const relogio = useTemporizador(SEGUNDOS_PARA_PAGAR, chaveInicioPix(participanteId));
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-superficie-2 px-4 py-3">
        <span id={idRotulo} className="flex items-center gap-2 text-sm text-texto-2">
          <Hourglass className="size-4" aria-hidden />
          Tempo para pagar
        </span>
        <span
          role="timer"
          aria-live="off"
          aria-labelledby={idRotulo}
          className={`font-display text-[30px] leading-none font-extrabold tabular-nums ${relogio.zerou ? 'text-texto-2' : ''}`}
        >
          {relogio.texto}
        </span>
        <span className="sr-only" aria-live="polite">
          {relogio.anuncio}
        </span>
      </div>
      {relogio.zerou && (
        <Alerta tipo="aviso">
          O tempo acabou, mas o código continua válido. Pague e toque em “Já fiz o pagamento”.
        </Alerta>
      )}
    </div>
  );
}

function EstadoPendente({
  pagamento,
  pix,
  participanteId,
  slug,
  totalVagas,
}: {
  pagamento: PagamentoResposta;
  pix: PixPagamento;
  participanteId: string;
  slug: string;
  totalVagas: number;
}) {
  const informar = useInformarPagamento(slug);
  const naoLocalizado = pagamento.informadoEm !== null;
  return (
    <>
      {naoLocalizado && (
        <Alerta tipo="aviso">Não localizamos seu pagamento. Confira e avise de novo.</Alerta>
      )}
      <section aria-labelledby="titulo-pix" className={`surgir ${CLASSE_CARD}`} style={{ '--i': 1 } as CSSProperties}>
        <div className="grid gap-1 text-center">
          <h2 id="titulo-pix" className="text-[17px] font-bold">
            {pagamento.vagaNumero !== null ? `Vaga nº ${pagamento.vagaNumero} reservada para você` : 'Vaga reservada para você'}
          </h2>
          <p className="text-sm text-texto-2">
            Seu lugar entre os {totalVagas} desafiados já está garantido. Falta só o Pix.
          </p>
          <p className="mt-2 font-display text-[52px] leading-[0.9] font-extrabold tabular-nums">
            {formatarReais(pix.valorCentavos)}
          </p>
          <p className="text-sm text-texto-2">Inscrição no desafio, via Pix</p>
        </div>
        <Relogio participanteId={participanteId} />
        <BlocoPix pix={pix} />
      </section>

      <section aria-labelledby="titulo-como" className="surgir grid gap-2" style={{ '--i': 2 } as CSSProperties}>
        <h2 id="titulo-como" className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase">
          Como pagar
        </h2>
        <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-texto-2 marker:font-semibold marker:text-texto">
          <li>Abra o app do seu banco e escolha Pix.</li>
          <li>Leia o QR code ou use o Pix copia e cola.</li>
          <li>Confira o valor ({formatarReais(pix.valorCentavos)}) e o recebedor e confirme.</li>
          <li>Volte aqui e toque em “Já fiz o pagamento”.</li>
        </ol>
      </section>

      {informar.isError && <Alerta tipo="erro">{mensagemGeral(informar.error)}</Alerta>}
      <Botao larguraTotal carregando={informar.isPending} onClick={() => informar.mutate()}>
        Já fiz o pagamento
      </Botao>
    </>
  );
}

function EstadoInformado({
  pagamento,
  totalVagas,
  whatsapp,
}: {
  pagamento: PagamentoResposta;
  totalVagas: number;
  whatsapp: string | null;
}) {
  const [verQr, setVerQr] = useState(false);
  const idQr = useId();
  const titulo = useRef<HTMLHeadingElement>(null);
  const final = finalDoWhatsapp(whatsapp);
  // Acabou de avisar: leva o foco para a confirmação (o botão que tinha o foco sumiu).
  useEffect(() => {
    if (document.activeElement === document.body) titulo.current?.focus();
  }, []);
  return (
    <>
      <section
        aria-labelledby="titulo-aviso"
        className={`surgir ${CLASSE_CARD} justify-items-center text-center`}
        style={{ '--i': 1 } as CSSProperties}
      >
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-superficie-2 text-vermelho-texto">
          <Hourglass className="size-6" />
        </span>
        <h2 id="titulo-aviso" ref={titulo} tabIndex={-1} className="text-xl font-bold focus:outline-none">
          Pagamento em análise
        </h2>
        <p className="text-sm text-texto-2">
          O {tt.apelido} confere o Pix manualmente. Assim que ele confirmar, seu acesso é liberado aqui e você recebe a
          confirmação pelo WhatsApp
          {final && (
            <>
              {' '}
              <span className="whitespace-nowrap">
                (<span aria-hidden>•••• </span>final {final})
              </span>
            </>
          )}
          .
        </p>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-superficie-2 px-3 py-1 text-xs font-semibold">
          <Check className="size-3.5 text-vermelho-texto" aria-hidden />
          {pagamento.vagaNumero !== null
            ? `Vaga nº ${pagamento.vagaNumero} garantida entre os ${totalVagas} desafiados`
            : `Vaga garantida entre os ${totalVagas} desafiados`}
        </p>
      </section>

      <div className="surgir" style={{ '--i': 2 } as CSSProperties}>
        <EtapasInscricao
          vagaNumero={pagamento.vagaNumero}
          totalVagas={totalVagas}
          informadoEm={pagamento.informadoEm}
          apelido={tt.apelido}
        />
      </div>

      {pagamento.pix && (
        <div className="grid gap-3">
          <Botao
            variante="secundario"
            larguraTotal
            aria-expanded={verQr}
            aria-controls={idQr}
            onClick={() => setVerQr((v) => !v)}
          >
            {verQr ? 'Esconder o QR' : 'Ver o QR de novo'}
          </Botao>
          <div id={idQr} hidden={!verQr} className={CLASSE_CARD}>
            {verQr && <BlocoPix pix={pagamento.pix} />}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * /pagamento (X12): vaga reservada (já garantida entre as N) → Pix de R$ 50 (QR fixo + copia e
 * cola, relógio de 5 min só visual) → "Já fiz o pagamento" → "Pagamento em análise" enquanto o TT
 * confere manualmente (polling) → revelação da vaga. Fica fora do RotaInscrito; sem vaga volta
 * para a capa.
 */
export default function Pagamento() {
  const { data: me } = useMe();
  const participacao = me?.participacao ?? null;
  const slug = participacao?.desafioSlug;
  const consulta = usePagamento(slug, participacao?.participanteId);
  const desafioQ = useDesafioAtual();

  if (!participacao) return <Navigate to="/" replace />;

  const pagamento = consulta.data;
  const totalVagas = desafioQ.data?.totalVagas ?? VAGAS_PADRAO;
  if (pagamento?.status === 'CONFIRMADO') {
    if (pagamento.vagaNumero === null) return <Navigate to="/desafio" replace />;
    return <RevelacaoVaga vaga={pagamento.vagaNumero} totalVagas={totalVagas} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Topo />
      {consulta.isPending || consulta.removido ? (
        <div role="status" aria-label="Carregando o pagamento" className="grid gap-4">
          <Skeleton className="h-[520px] rounded-3xl" />
          <Skeleton className="h-[54px] rounded-full" />
        </div>
      ) : consulta.isError ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void consulta.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {mensagemGeral(consulta.error)}
        </Alerta>
      ) : pagamento?.status === 'INFORMADO' ? (
        <EstadoInformado pagamento={pagamento} totalVagas={totalVagas} whatsapp={me?.usuario.whatsapp ?? null} />
      ) : pagamento && !pagamento.pix ? (
        <Alerta tipo="aviso">
          O pagamento ainda não está disponível. Sua vaga continua reservada; tente de novo mais tarde.
        </Alerta>
      ) : pagamento?.pix && slug ? (
        <EstadoPendente
          pagamento={pagamento}
          pix={pagamento.pix}
          participanteId={participacao.participanteId}
          slug={slug}
          totalVagas={totalVagas}
        />
      ) : null}
      {pagamento && <Contato handle={pagamento.contatoInstagram} />}
    </div>
  );
}
