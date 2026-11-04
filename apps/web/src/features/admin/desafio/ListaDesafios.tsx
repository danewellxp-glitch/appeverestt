import type { AdminDesafioConfig } from '@everest/shared';
import { Pencil, Plus, Power } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LinkNav } from '../../../components/layout/LinkNav';
import { Alerta } from '../../../components/ui/basicos';
import { Botao } from '../../../components/ui/Botao';
import { FolhaInferior } from '../../../components/ui/FolhaInferior';
import { useToast } from '../../../components/ui/Toast';
import { formatarDataCurta } from '../../../lib/datas';
import { mensagemGeral } from '../../auth/formulario';
import { useAtualizarDesafio } from '../consultas';
import { CLASSE_LINK_PRIMARIO, CLASSE_LINK_SECUNDARIO } from '../LayoutPainel';
import { rotuloStatus } from './regras';

/** Selo de status: ativo (vermelho) e situação no calendário. */
export function SelosDesafio({ d }: { d: AdminDesafioConfig }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {d.ativo && (
        <span className="rounded-full bg-vermelho px-2.5 py-0.5 text-xs font-bold text-sobre-vermelho">
          Ativo no app
        </span>
      )}
      <span className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs font-semibold text-texto shadow-[inset_0_0_0_1px_var(--borda)]">
        {rotuloStatus(d)}
      </span>
    </span>
  );
}

/** Lista de desafios com "Ativar" (com confirmação) e "Editar". */
export function ListaDesafios({ desafios }: { desafios: readonly AdminDesafioConfig[] }) {
  const ativoAtual = desafios.find((d) => d.ativo) ?? null;
  // `alvo` fica guardado depois de fechar: a folha ainda mostra o nome durante a animação de saída.
  const [alvo, setAlvo] = useState<AdminDesafioConfig | null>(null);
  const [aberta, setAberta] = useState(false);
  const atualizar = useAtualizarDesafio();
  const { toast } = useToast();
  const navegar = useNavigate();

  function confirmar() {
    if (!alvo) return;
    atualizar.mutate(
      { slug: alvo.slug, ativo: true },
      {
        onSuccess: (d) => {
          setAberta(false);
          toast(`${d.nome} agora é o desafio do app.`);
          void navegar('/admin', { viewTransition: true });
        },
      },
    );
  }

  if (desafios.length === 0) {
    return (
      <p className="rounded-3xl bg-superficie p-5 text-center text-sm text-texto-2 shadow-[inset_0_0_0_1px_var(--borda)]">
        Nenhum desafio criado ainda.
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-2">
        {desafios.map((d) => (
          <li
            key={d.id}
            className="grid gap-3 rounded-[20px] bg-superficie p-3.5 shadow-[inset_0_0_0_1px_var(--borda)]"
          >
            <div className="grid min-w-0 gap-1">
              <p className="font-semibold [overflow-wrap:anywhere]">{d.nome}</p>
              <SelosDesafio d={d} />
              <p className="text-xs text-texto-2">
                {formatarDataCurta(d.dataInicio)} a {formatarDataCurta(d.dataFim)} ·{' '}
                {d.vagasOcupadas}/{d.totalVagas} vagas · {d.totalInscritos}{' '}
                {d.totalInscritos === 1 ? 'inscrito' : 'inscritos'}
              </p>
              <p className="text-xs break-all text-texto-2">/{d.slug}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!d.ativo && (
                <Botao
                  tamanho="sm"
                  icone={<Power className="size-4" aria-hidden />}
                  aria-haspopup="dialog"
                  onClick={() => {
                    atualizar.reset();
                    setAlvo(d);
                    setAberta(true);
                  }}
                >
                  Ativar<span className="sr-only"> {d.nome}</span>
                </Botao>
              )}
              <LinkNav
                to={d.ativo ? '/admin/desafio' : `/admin/desafios/${encodeURIComponent(d.slug)}`}
                className={CLASSE_LINK_SECUNDARIO}
              >
                <Pencil className="size-4" aria-hidden />
                Editar<span className="sr-only"> {d.nome}</span>
              </LinkNav>
            </div>
          </li>
        ))}
      </ul>

      <FolhaInferior
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo="Ativar este desafio?"
      >
        <p className="text-sm text-texto-2">
          <strong className="text-texto">{alvo?.nome}</strong> passa a ser o desafio do app: a
          página inicial, as inscrições e o painel mostram ele.
          {ativoAtual && ativoAtual.slug !== alvo?.slug
            ? ` ${ativoAtual.nome} deixa de aparecer (os dados continuam guardados).`
            : ''}
        </p>
        {atualizar.isError && <Alerta tipo="erro">{mensagemGeral(atualizar.error)}</Alerta>}
        <Botao
          variante="secundario"
          larguraTotal
          onClick={() => setAberta(false)}
          disabled={atualizar.isPending}
        >
          Cancelar
        </Botao>
        <Botao larguraTotal carregando={atualizar.isPending} onClick={confirmar}>
          Ativar desafio
        </Botao>
      </FolhaInferior>
    </>
  );
}

/** Sem desafio ativo: avisa, oferece criar e lista os desafios existentes para ativar. */
export function SemDesafioAtivo({ desafios }: { desafios: readonly AdminDesafioConfig[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Alerta tipo="aviso">
        <p className="font-semibold">Nenhum desafio ativo.</p>
        <p className="mt-0.5">
          O app não mostra nenhum desafio para os participantes. Ative um desafio da lista ou crie
          um novo.
        </p>
      </Alerta>
      <LinkNav to="/admin/desafios/novo" className={`${CLASSE_LINK_PRIMARIO} self-start`}>
        <Plus className="size-4" aria-hidden />
        Criar desafio
      </LinkNav>
      <section aria-labelledby="titulo-desafios" className="flex flex-col gap-3">
        <h2
          id="titulo-desafios"
          className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase"
        >
          Desafios
        </h2>
        <ListaDesafios desafios={desafios} />
      </section>
    </div>
  );
}
