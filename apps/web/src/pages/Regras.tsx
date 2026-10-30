import { TOTAL_DIAS_PADRAO, type DesafioAtual } from '@everest/shared';
import { ArrowRight, AtSign, BookOpen, Camera, Droplets, Dumbbell } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, Skeleton } from '../components/ui/basicos';
import { regras, requisitosDiarios, type RequisitoDiario } from '../content/regras';
import { ehApiError } from '../lib/api';
import { formatarData } from '../lib/datas';
import { useDesafioAtual, useMe } from '../lib/queries';

const ICONES: Record<RequisitoDiario['id'], ReactNode> = {
  AGUA: <Droplets className="size-5" aria-hidden />,
  EXERCICIO: <Dumbbell className="size-5" aria-hidden />,
  LEITURA: <BookOpen className="size-5" aria-hidden />,
  FOTOS: <Camera className="size-5" aria-hidden />,
  STORY: <AtSign className="size-5" aria-hidden />,
};

function semPrefixo(valor: string, prefixo: '@' | '#'): string {
  return valor.trim().replace(prefixo === '@' ? /^@+/ : /^#+/, '');
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-l-4 border-vermelho pl-3 text-xl font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

function Itens({ itens }: { itens: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-texto-2">
      {itens.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-vermelho" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Valor dinâmico do desafio: skeleton enquanto carrega, "—" se não houver desafio. */
function Valor({ carregando, children }: { carregando: boolean; children: ReactNode }) {
  if (carregando) return <Skeleton className="inline-block h-4 w-24 align-middle" />;
  return <>{children}</>;
}

function Datas({ desafio, carregando }: { desafio: DesafioAtual | undefined; carregando: boolean }) {
  return (
    <dl className="grid grid-cols-2 gap-3">
      <Card className="flex flex-col gap-1">
        <dt className="rotulo">Início</dt>
        <dd className="font-bold">
          <Valor carregando={carregando}>{desafio ? formatarData(desafio.dataInicio, { comDiaSemana: true }) : '—'}</Valor>
        </dd>
      </Card>
      <Card className="flex flex-col gap-1">
        <dt className="rotulo">Fim</dt>
        <dd className="font-bold">
          <Valor carregando={carregando}>{desafio ? formatarData(desafio.dataFim, { comDiaSemana: true }) : '—'}</Valor>
        </dd>
      </Card>
    </dl>
  );
}

export default function Regras() {
  const desafioQ = useDesafioAtual();
  const { data: me } = useMe();
  const desafio = desafioQ.data;
  const carregando = desafioQ.isPending;
  const semDesafio = ehApiError(desafioQ.error, 'NAO_ENCONTRADO');

  const instagram = desafio ? `@${semPrefixo(desafio.instagramHandle, '@')}` : 'o perfil do desafio';
  const hashtag = desafio ? `#${semPrefixo(desafio.hashtag, '#')}` : 'a hashtag do desafio';
  const requisitos = requisitosDiarios(instagram, hashtag);
  const totalDias = String(desafio?.totalDias ?? TOTAL_DIAS_PADRAO);

  return (
    <article className="flex flex-col gap-8 py-4">
      <header className="flex flex-col gap-3">
        <p className="rotulo">{desafio?.nome ?? 'Desafio 30 Dias Everest'}</p>
        <h1 className="text-4xl font-black uppercase leading-none tracking-tight">{regras.titulo}</h1>
        <p className="text-texto-2">{regras.introducao}</p>
      </header>

      <Secao titulo="Requisitos diários">
        <div className="overflow-x-auto rounded-2xl border border-borda bg-superficie">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Requisitos para concluir cada dia do desafio</caption>
            <thead>
              <tr className="border-b border-borda">
                <th scope="col" className="rotulo px-4 py-3 font-semibold">
                  Requisito
                </th>
                <th scope="col" className="rotulo px-4 py-3 text-right font-semibold">
                  Meta do dia
                </th>
              </tr>
            </thead>
            <tbody aria-busy={carregando || undefined}>
              {requisitos.map((r) => (
                <tr key={r.id} className="border-b border-borda last:border-b-0">
                  <th scope="row" className="px-4 py-3 align-top font-normal">
                    <span className="flex items-start gap-3">
                      <span className="mt-0.5 text-vermelho-texto">{ICONES[r.id]}</span>
                      <span className="flex flex-col gap-0.5">
                        <span className="font-bold text-texto">{r.nome}</span>
                        <span className="text-texto-2">{r.detalhe}</span>
                      </span>
                    </span>
                  </th>
                  <td className="px-4 py-3 text-right align-top font-black whitespace-nowrap text-texto">{r.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-texto-2">{regras.diaConcluido}</p>
      </Secao>

      <Secao titulo={regras.edicao.titulo}>
        <Itens itens={regras.edicao.itens} />
      </Secao>

      <Secao titulo={regras.vagas.titulo}>
        <p className="text-texto-2">
          {regras.vagas.texto(desafio?.totalVagas ?? null)}
        </p>
        <Itens itens={regras.vagas.itens} />
      </Secao>

      <Secao titulo={regras.premiacao.titulo}>
        <p className="text-texto-2">{regras.premiacao.texto(totalDias)}</p>
      </Secao>

      <Secao titulo={regras.desempate.titulo}>
        <p className="text-texto-2">{regras.desempate.introducao}</p>
        <ol className="flex flex-col gap-2">
          {regras.desempate.criterios.map((criterio, i) => (
            <li key={criterio} className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-vermelho text-sm font-black text-sobre-vermelho">
                {i + 1}
              </span>
              <span className="pt-0.5 text-texto">{criterio}</span>
            </li>
          ))}
        </ol>
      </Secao>

      <Secao titulo={regras.conferencia.titulo}>
        <p className="text-texto-2">{regras.conferencia.texto}</p>
      </Secao>

      <Secao titulo={regras.datas.titulo}>
        {semDesafio ? (
          <p className="text-texto-2">Nenhum desafio aberto no momento. As datas serão divulgadas na abertura.</p>
        ) : desafioQ.isError ? (
          <p className="text-texto-2">Não foi possível carregar as datas agora. Tente de novo mais tarde.</p>
        ) : (
          <>
            <Datas desafio={desafio} carregando={carregando} />
            <p className="text-sm text-texto-2">
              São {totalDias} dias seguidos, contados no fuso de São Paulo.
            </p>
          </>
        )}
      </Secao>

      {!me?.participacao && (
        <Link
          to="/"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-vermelho px-4 text-base font-black uppercase tracking-wide text-sobre-vermelho hover:bg-vermelho-escuro"
        >
          Quero participar
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      )}
    </article>
  );
}
