import { METAS, REQUISITOS, type DiaDetalhe, type Requisito } from '@everest/shared';
import { ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router';
import { abrirComTransformacao } from '../../lib/transicoes';
import { formatarNumero } from '../checkin/formatos';
import { tiposFotosValidas } from '../fotos/fotosValidas';
import { caminhoDoDia, preCarregarDia } from './navegacao';

function tagPendente(r: Requisito, d: DiaDetalhe): string {
  switch (r) {
    case 'AGUA':
      return `Água ${formatarNumero(d.aguaMl)}/${formatarNumero(METAS.aguaMl)} ml`;
    case 'EXERCICIO':
      return 'Treino';
    case 'LEITURA':
      return `Leitura ${d.paginasLidas}/${METAS.paginas} pág.`;
    case 'FOTOS':
      return `Fotos ${tiposFotosValidas(d.fotos).length}/${METAS.fotos}`;
    case 'STORY':
      return 'Story';
  }
}

/** Barra de 5 segmentos (um por requisito cumprido). */
export function Segmentos({ feitos, total = REQUISITOS.length }: { feitos: number; total?: number }) {
  return (
    <span aria-hidden className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={`h-2 rounded-full transition-colors duration-[350ms] ease-saida ${i < feitos ? 'bg-vermelho' : 'bg-superficie-2'}`}
        />
      ))}
    </span>
  );
}

/** "Seu dia": progresso do dia atual e o que falta. Toque expande para o check-in (`abrir-dia`). */
export function CardSeuDia({ dia }: { dia: DiaDetalhe }) {
  const navegar = useNavigate();
  const total = REQUISITOS.length;
  const feitos = total - dia.requisitosPendentes.length;
  const concluido = dia.concluido && dia.requisitosPendentes.length === 0;
  return (
    <button
      type="button"
      onPointerDown={preCarregarDia}
      onClick={(e) => {
        const el = e.currentTarget;
        abrirComTransformacao(el, 'abrir-dia', () =>
          void navegar(caminhoDoDia(dia.numeroDia), { viewTransition: true, state: { vt: 'abrir-dia' } }),
        );
      }}
      className="press relative grid w-full gap-3 rounded-[28px] bg-superficie p-[18px] text-left shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <span className="sr-only">Abrir check-in de hoje, {feitos} de {total} requisitos.</span>
      <span aria-hidden className="flex items-baseline justify-between pr-12">
        <span className="rotulo">Hoje · dia {dia.numeroDia}</span>
        <span className="text-[17px] font-bold">
          {feitos} de {total}
        </span>
      </span>
      <Segmentos feitos={feitos} total={total} />
      <span className="flex flex-wrap gap-1.5">
        {concluido ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-superficie-2 px-2.5 py-[5px] text-xs font-semibold text-vermelho-texto">
            <Check className="size-3.5" aria-hidden />
            Dia concluído
          </span>
        ) : (
          dia.requisitosPendentes.map((r) => (
            <span key={r} className="rounded-full bg-superficie-2 px-2.5 py-[5px] text-xs font-semibold">
              {tagPendente(r, dia)}
            </span>
          ))
        )}
      </span>
      <span aria-hidden className="absolute top-4 right-4 grid size-[38px] place-items-center rounded-full bg-vermelho text-sobre-vermelho">
        <ArrowRight className="size-4" />
      </span>
    </button>
  );
}
