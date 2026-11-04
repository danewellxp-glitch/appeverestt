import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { useAdminMetricas } from '../features/admin/consultas';
import { PainelIndicadores } from '../features/admin/indicadores/PainelIndicadores';
import { useContextoPainel } from '../features/admin/LayoutPainel';

/** /admin (aba Indicadores, padrão): o painel de indicadores do desafio ativo. */
export default function AdminIndicadores() {
  const { desafio } = useContextoPainel();
  const consulta = useAdminMetricas(desafio.slug);

  if (!consulta.data) {
    if (consulta.isError) {
      return (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void consulta.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível carregar os indicadores. {consulta.error.message}
        </Alerta>
      );
    }
    return (
      <div role="status" aria-label="Carregando os indicadores" className="grid gap-3">
        <Skeleton className="h-11 w-56 rounded-full" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-[22px]" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-3xl" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {consulta.isError && (
        <Alerta tipo="aviso">
          Não foi possível atualizar agora. Mostrando os últimos números carregados.
        </Alerta>
      )}
      <PainelIndicadores
        m={consulta.data}
        atualizando={consulta.isFetching}
        aoAtualizar={() => void consulta.refetch()}
      />
    </div>
  );
}
