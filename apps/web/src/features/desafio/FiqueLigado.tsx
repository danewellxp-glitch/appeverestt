import type { DesafioAtual, MeResposta } from '@everest/shared';
import {
  ArrowUpRight,
  AtSign,
  BookOpen,
  CalendarClock,
  ChevronRight,
  Dumbbell,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { LinkNav } from '../../components/layout/LinkNav';
import { MontanhaMarca } from '../../components/layout/Marca';
import { Avatar } from '../../components/ui/Avatar';
import { fiqueLigado, whatsapp } from '../../content/landing';
import { formatarData, formatarDataCurta } from '../../lib/datas';
import { marcarDirecao } from '../../lib/transicoes';
import { finalDoWhatsapp, linkExterno, linkInstagram, semPrefixo } from '../landing/contato';
import { CLASSE_CTA } from './EntrarNoDesafio';

function Surgir({ i, children }: { i: number; children: ReactNode }) {
  return (
    <div className="surgir" style={{ '--i': i } as CSSProperties}>
      {children}
    </div>
  );
}

/** Linha da lista "Enquanto isso": bolha de ícone, título e texto (o contêiner decide se é link). */
function ConteudoItem({ Icone, titulo, texto, Seta }: { Icone: LucideIcon; titulo: string; texto: string; Seta?: LucideIcon }) {
  return (
    <>
      <span aria-hidden className="grid size-[42px] shrink-0 place-items-center rounded-full bg-superficie-2 text-vermelho-texto">
        <Icone className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[15px]">{titulo}</b>
        <span className="block text-[13px] text-texto-2">{texto}</span>
      </span>
      {Seta && <Seta className="size-5 shrink-0 text-texto-2" aria-hidden />}
    </>
  );
}

const CLASSE_ITEM = 'flex items-center gap-3 border-borda px-4 py-3.5';

/**
 * Home do inscrito com o pagamento confirmado e o desafio ainda não iniciado: "Fiquem ligados!",
 * a data de início com a contagem, o aviso de que tudo chega pelo WhatsApp cadastrado (só o final
 * do número) e, se configurado em content/landing.ts, o botão do grupo do WhatsApp.
 */
export function FiqueLigado({ me, desafio }: { me: MeResposta; desafio: DesafioAtual | undefined }) {
  const vaga = me.participacao?.vagaNumero ?? null;
  const final = finalDoWhatsapp(me.usuario.whatsapp);
  const grupo = linkExterno(whatsapp.grupoParticipantes);
  const handle = desafio ? semPrefixo(desafio.instagramHandle) : '';
  const instagram = linkInstagram(handle);

  return (
    <div className="flex flex-col gap-4">
      <Surgir i={0}>
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="rotulo">{fiqueLigado.eyebrow(vaga)}</p>
            <h1 className="mt-1 font-display text-[38px] leading-[0.9] font-black uppercase">{fiqueLigado.titulo}</h1>
          </div>
          <Link to="/perfil" viewTransition onClick={() => marcarDirecao('aba')} className="press shrink-0 rounded-full">
            <span className="sr-only">Abrir perfil</span>
            <Avatar nome={me.usuario.nome} fotoUrl={me.usuario.fotoUrl} />
          </Link>
        </header>
      </Surgir>

      <Surgir i={1}>
        <section
          aria-label="Início do desafio"
          className="relative grid gap-2 overflow-hidden rounded-[28px] bg-pop p-5 text-pop-texto"
        >
          <MontanhaMarca className="pointer-events-none absolute -right-[18%] -bottom-[10%] aspect-[682/313] w-[85%] text-pop-texto opacity-[0.09]" />
          <span className="relative flex items-center gap-2">
            <CalendarClock className="size-4 text-pop-texto-2" aria-hidden />
            <span className="text-[11px] font-semibold tracking-[0.16em] text-pop-texto-2 uppercase">
              {fiqueLigado.rotuloData}
            </span>
          </span>
          <p className="relative font-display text-[88px] leading-[0.82] font-black tabular-nums">
            {desafio ? formatarDataCurta(desafio.dataInicio) : '—'}
          </p>
          <p className="relative flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-pop-texto-2">
            {desafio && (
              <>
                <span>{formatarData(desafio.dataInicio, { comDiaSemana: true })}</span>
                <span className="rounded-full bg-vermelho px-2.5 py-0.5 text-xs font-semibold text-sobre-vermelho">
                  {fiqueLigado.faltam(Math.max(0, desafio.diasParaInicio))}
                </span>
              </>
            )}
          </p>
        </section>
      </Surgir>

      <Surgir i={2}>
        <section
          aria-labelledby="titulo-whatsapp"
          className="grid gap-3 rounded-[28px] bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
        >
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid size-[42px] shrink-0 place-items-center rounded-full bg-superficie-2 text-vermelho-texto">
              <MessageCircle className="size-5" />
            </span>
            <div className="grid gap-1">
              <h2 id="titulo-whatsapp" className="text-[17px] leading-snug font-bold">
                {fiqueLigado.tituloWhatsapp}
              </h2>
              <p className="text-sm text-texto-2">
                {final ? (
                  <>
                    {fiqueLigado.textoWhatsapp}{' '}
                    <b className="whitespace-nowrap text-texto">
                      <span aria-hidden>•••• </span>final {final}
                    </b>
                    .
                  </>
                ) : (
                  fiqueLigado.semWhatsapp
                )}
              </p>
            </div>
          </div>
          {grupo && (
            <a href={grupo} target="_blank" rel="noreferrer" className={CLASSE_CTA}>
              <MessageCircle className="size-5" aria-hidden />
              {fiqueLigado.grupo}
            </a>
          )}
          <LinkNav
            to="/perfil"
            direcao="aba"
            className="inline-flex min-h-11 items-center justify-self-start px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4"
          >
            {final ? fiqueLigado.corrigirWhatsapp : fiqueLigado.cadastrarWhatsapp}
          </LinkNav>
        </section>
      </Surgir>

      <Surgir i={3}>
        <section aria-labelledby="titulo-enquanto-isso" className="flex flex-col gap-3">
          <h2
            id="titulo-enquanto-isso"
            className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase"
          >
            {fiqueLigado.tituloEnquantoIsso}
          </h2>
          <ul className="overflow-hidden rounded-3xl bg-superficie shadow-[inset_0_0_0_1px_var(--borda)] [&>li+li]:border-t [&>li+li]:border-borda">
            <li>
              <LinkNav to="/regras" className={`press ${CLASSE_ITEM} hover:bg-superficie-2`}>
                <ConteudoItem Icone={BookOpen} titulo={fiqueLigado.regras} texto={fiqueLigado.regrasTexto} Seta={ChevronRight} />
              </LinkNav>
            </li>
            <li className={CLASSE_ITEM}>
              <ConteudoItem Icone={Dumbbell} titulo={fiqueLigado.preparar} texto={fiqueLigado.prepararTexto} />
            </li>
            {instagram && (
              <li>
                <a href={instagram} target="_blank" rel="noreferrer" className={`press ${CLASSE_ITEM} hover:bg-superficie-2`}>
                  <ConteudoItem
                    Icone={AtSign}
                    titulo={fiqueLigado.seguir(handle)}
                    texto={fiqueLigado.seguirTexto}
                    Seta={ArrowUpRight}
                  />
                </a>
              </li>
            )}
          </ul>
        </section>
      </Surgir>
    </div>
  );
}
