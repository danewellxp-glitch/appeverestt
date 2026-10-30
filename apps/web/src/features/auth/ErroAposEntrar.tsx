import { ArrowLeft } from 'lucide-react';
import { LinkNav } from '../../components/layout/LinkNav';
import { Alerta } from '../../components/ui/basicos';

/** Exibido quando a pessoa entrou/cadastrou, mas a inscrição no desafio falhou (ex.: vagas esgotadas). */
export function ErroAposEntrar({ mensagem }: { mensagem: string }) {
  return (
    <section className="flex flex-col gap-5 py-6">
      <div className="flex flex-col gap-2">
        <p className="rotulo">Sua conta está pronta</p>
        <h1 className="text-3xl font-black uppercase leading-tight">Não deu para entrar no desafio</h1>
      </div>
      <Alerta tipo="erro">{mensagem}</Alerta>
      <p className="text-texto-2">
        Você já está logado. Volte ao início para ver a situação atualizada das vagas.
      </p>
      <LinkNav
        to="/"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-borda bg-superficie-2 px-4 text-sm font-bold uppercase tracking-wide text-texto hover:border-texto-2"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar ao início
      </LinkNav>
    </section>
  );
}
