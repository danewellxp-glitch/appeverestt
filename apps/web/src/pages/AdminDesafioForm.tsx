import { useNavigate, useParams } from 'react-router';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { useToast } from '../components/ui/Toast';
import { useAdminDesafio, useAdminDesafios } from '../features/admin/consultas';
import { FormularioDesafio } from '../features/admin/desafio/FormularioDesafio';
import { SelosDesafio } from '../features/admin/desafio/ListaDesafios';
import { LarguraPainel } from '../features/admin/LayoutPainel';
import { ehApiError } from '../lib/api';

function Topo({ titulo }: { titulo: string }) {
  return (
    <header className="surgir flex items-center gap-3">
      <BotaoVoltar para="/admin/desafio" />
      <div className="min-w-0 flex-1">
        <p className="rotulo">Painel do embaixador</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">{titulo}</h1>
      </div>
    </header>
  );
}

function Carregando({ rotulo }: { rotulo: string }) {
  return (
    <div role="status" aria-label={rotulo} className="grid gap-3">
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}

/** /admin/desafios/novo (criar) e /admin/desafios/:slug (editar um desafio que não é o ativo). */
export default function AdminDesafioForm() {
  const { slug } = useParams();
  const criando = slug === undefined;
  const lista = useAdminDesafios();
  const consulta = useAdminDesafio(slug);
  const ativo = lista.data?.desafios.find((d) => d.ativo) ?? null;
  const navegar = useNavigate();
  const { toast } = useToast();

  let conteudo;
  if (criando && lista.isError && !lista.data) {
    // Sem a lista não dá para saber se já há um desafio ativo: o formulário começaria com "Ativar ao
    // criar" ligado e derrubaria o desafio em andamento sem o aviso.
    conteudo = (
      <Alerta
        tipo="erro"
        acao={
          <Botao variante="secundario" tamanho="sm" onClick={() => void lista.refetch()}>
            Tentar de novo
          </Botao>
        }
      >
        Não foi possível carregar os desafios. {lista.error.message}
      </Alerta>
    );
  } else if (criando) {
    conteudo = lista.isPending ? (
      <Carregando rotulo="Carregando o formulário" />
    ) : (
      <FormularioDesafio
        ativoAtual={ativo}
        padroes={{ instagramHandle: ativo?.instagramHandle, hashtag: ativo?.hashtag }}
        aoSalvar={(d) => {
          toast(d.ativo ? `${d.nome} criado e ativo no app.` : `${d.nome} criado.`);
          void navegar(d.ativo ? '/admin' : '/admin/desafio', {
            replace: true,
            viewTransition: true,
          });
        }}
      />
    );
  } else if (consulta.isPending) {
    conteudo = <Carregando rotulo="Carregando o desafio" />;
  } else if (consulta.isError && !consulta.data) {
    const naoExiste = ehApiError(consulta.error, 'NAO_ENCONTRADO');
    conteudo = (
      <Alerta
        tipo="erro"
        acao={
          naoExiste ? undefined : (
            <Botao variante="secundario" tamanho="sm" onClick={() => void consulta.refetch()}>
              Tentar de novo
            </Botao>
          )
        }
      >
        {naoExiste ? 'Desafio não encontrado.' : consulta.error.message}
      </Alerta>
    );
  } else if (consulta.data) {
    const d = consulta.data;
    conteudo = (
      <>
        <div className="-mt-1 grid gap-1.5">
          <p className="text-[15px] font-semibold [overflow-wrap:anywhere]">{d.nome}</p>
          <SelosDesafio d={d} />
        </div>
        <FormularioDesafio
          key={d.slug}
          desafio={d}
          ativoAtual={ativo}
          aoSalvar={(salvo) => {
            toast('Alterações salvas.');
            if (salvo.ativo && !d.ativo) void navegar('/admin', { viewTransition: true });
          }}
        />
      </>
    );
  }

  return (
    <LarguraPainel>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Topo titulo={criando ? 'Novo desafio' : 'Editar desafio'} />
        {conteudo}
      </div>
    </LarguraPainel>
  );
}
