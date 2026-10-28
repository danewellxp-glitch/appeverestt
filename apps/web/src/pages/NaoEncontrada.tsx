import { Link } from 'react-router';

export default function NaoEncontrada() {
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="rotulo">Erro 404</p>
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="text-texto-2">O caminho que você abriu não existe.</p>
      <Link to="/" className="inline-flex min-h-11 items-center rounded-xl bg-vermelho px-4 font-bold uppercase text-white">
        Voltar ao início
      </Link>
    </section>
  );
}
