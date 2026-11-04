import { ArrowRight, AtSign, BellRing, MessageCircle } from 'lucide-react';
import { LinkNav } from '../../components/layout/LinkNav';
import { Alerta, Skeleton } from '../../components/ui/basicos';
import { Botao } from '../../components/ui/Botao';
import { instagramPadrao, semDesafio, whatsapp } from '../../content/landing';
import { preCarregarAuth } from '../../lib/firebase';
import { linkExterno, linkInstagram, semPrefixo } from '../landing/contato';
import { useEntrarNoDesafio } from './useEntrarNoDesafio';

export { bloqueioDaInscricao } from './useEntrarNoDesafio';

/** Botão principal em forma de link (mesmo visual do Botao primário). */
export const CLASSE_CTA =
  'press inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-vermelho px-5 font-semibold text-sobre-vermelho hover:bg-vermelho-escuro';

const CLASSE_LINK_SECUNDARIO =
  'press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-superficie-2 px-4 text-sm font-semibold text-texto hover:shadow-[inset_0_0_0_1px_var(--borda-campo)]';

/**
 * "Fiquem ligados" no lugar do "Quero participar" quando não há desafio ativo: a landing continua
 * apresentando o desafio e aqui ficam os canais onde a abertura das inscrições é avisada.
 */
export function AvisoFiquemLigados() {
  const handle = semPrefixo(instagramPadrao);
  const instagram = linkInstagram(handle);
  const avisos = linkExterno(whatsapp.avisos);
  return (
    <div className="grid gap-3 rounded-3xl bg-superficie p-5 text-center shadow-[inset_0_0_0_1px_var(--borda)]">
      <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-full bg-superficie-2 text-vermelho-texto">
        <BellRing className="size-5" />
      </span>
      <p className="text-lg font-bold">{semDesafio.titulo}</p>
      <p className="text-sm text-texto-2">{avisos ? semDesafio.textoComWhatsapp : semDesafio.texto}</p>
      {(instagram || avisos) && (
        <div className="grid gap-2 pt-1">
          {instagram && (
            <a href={instagram} target="_blank" rel="noreferrer" className={CLASSE_LINK_SECUNDARIO}>
              <AtSign className="size-4" aria-hidden />
              {semDesafio.instagram(handle)}
            </a>
          )}
          {avisos && (
            <a href={avisos} target="_blank" rel="noreferrer" className={CLASSE_LINK_SECUNDARIO}>
              <MessageCircle className="size-4" aria-hidden />
              {semDesafio.whatsapp}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * "Quero participar": 3× na landing e no fim de /regras, sempre com a mesma regra
 * (useEntrarNoDesafio). Visitante e cadastro incompleto recebem um link; cadastro completo, um
 * botão que reserva a vaga; quem já tem vaga, o próximo passo (pagamento ou desafio).
 * `quandoIndisponivel="nada"` esconde o aviso "Fiquem ligados" e o erro (CTAs do meio da página).
 */
export function BotaoQueroParticipar({
  rotulo = 'Quero participar',
  quandoIndisponivel = 'aviso',
}: {
  rotulo?: string;
  quandoIndisponivel?: 'aviso' | 'nada';
}) {
  const { estado, inscreverAgora, inscrevendo, erro, recarregarDesafio } = useEntrarNoDesafio();
  const seta = <ArrowRight className="size-5" aria-hidden />;

  switch (estado.tipo) {
    case 'carregando':
      return <Skeleton className="h-[54px] rounded-full" />;
    case 'sem-desafio':
      return quandoIndisponivel === 'nada' ? null : <AvisoFiquemLigados />;
    case 'erro':
      return quandoIndisponivel === 'nada' ? null : (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={recarregarDesafio}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível carregar o desafio. Verifique a conexão.
        </Alerta>
      );
    case 'bloqueado':
      return (
        // aria-disabled (e não disabled): continua no Tab, e o leitor de tela lê o motivo.
        <Botao larguraTotal aria-disabled="true" className="cursor-not-allowed opacity-50">
          {estado.motivo}
        </Botao>
      );
    case 'inscrito':
      return (
        <LinkNav to={estado.para} className={CLASSE_CTA}>
          {estado.rotulo}
          {seta}
        </LinkNav>
      );
    case 'criar-conta':
      return (
        <LinkNav to={estado.para} onPointerDown={preCarregarAuth} onFocus={preCarregarAuth} className={CLASSE_CTA}>
          {rotulo}
          {seta}
        </LinkNav>
      );
    case 'completar-cadastro':
      return (
        <LinkNav to={estado.para} className={CLASSE_CTA}>
          {rotulo}
          {seta}
        </LinkNav>
      );
    case 'inscrever':
      return (
        <div className="grid gap-3">
          <Botao larguraTotal onClick={() => void inscreverAgora()} carregando={inscrevendo}>
            {rotulo}
            {seta}
          </Botao>
          {erro && <Alerta tipo="erro">{erro}</Alerta>}
        </div>
      );
  }
}
