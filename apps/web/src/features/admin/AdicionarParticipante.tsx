import { adicionarParticipanteSchema, type StatusPagamento } from '@everest/shared';
import { UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Alerta } from '../../components/ui/basicos';
import { Botao } from '../../components/ui/Botao';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { FolhaInferior } from '../../components/ui/FolhaInferior';
import { Segmentado } from '../../components/ui/Segmentado';
import { useToast } from '../../components/ui/Toast';
import { ehApiError } from '../../lib/api';
import { errosDasIssues, errosDoServidor, mensagemGeral } from '../auth/formulario';
import { useAdicionarParticipante } from './consultas';

const OPCOES_STATUS = [
  { valor: 'CONFIRMADO', rotulo: 'Confirmado' },
  { valor: 'INFORMADO', rotulo: 'Informado' },
  { valor: 'PENDENTE', rotulo: 'Pendente' },
] as const satisfies readonly { valor: StatusPagamento; rotulo: string }[];

const EXPLICACAO_STATUS: Record<StatusPagamento, string> = {
  CONFIRMADO: 'Já pagou (ex.: direto para você). Entra no desafio na hora.',
  INFORMADO: 'Disse que pagou: vai para a fila de pagamentos a confirmar.',
  PENDENTE: 'Só reserva a vaga. A pessoa vê a tela de pagamento ao entrar.',
};

/** Mensagem amigável para os erros mais prováveis ao inscrever alguém pelo e-mail. */
function mensagemErro(e: unknown): string {
  if (ehApiError(e, 'NAO_ENCONTRADO')) {
    return 'Não achamos uma conta com esse e-mail. Peça para a pessoa criar a conta no app primeiro.';
  }
  return mensagemGeral(e);
}

/**
 * "Adicionar participante": inscreve quem já tem conta (pelo e-mail), pegando a menor vaga livre,
 * já com o status do pagamento. Abre numa folha inferior.
 */
export function AdicionarParticipante({ slug }: { slug: string }) {
  const [aberta, setAberta] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<StatusPagamento>('CONFIRMADO');
  const [erroEmail, setErroEmail] = useState<string | undefined>();
  const adicionar = useAdicionarParticipante(slug);
  const { toast } = useToast();

  function abrir() {
    adicionar.reset();
    setErroEmail(undefined);
    setEmail('');
    setStatus('CONFIRMADO');
    setAberta(true);
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (adicionar.isPending) return;
    const r = adicionarParticipanteSchema.safeParse({ email, pagamentoStatus: status });
    if (!r.success) {
      setErroEmail(errosDasIssues(r.error.issues, ['email'] as const).email ?? 'Confira o e-mail.');
      return;
    }
    setErroEmail(undefined);
    adicionar.mutate(r.data, {
      onSuccess: (p) => {
        setAberta(false);
        toast(
          `${p.nome} entrou no desafio${p.vagaNumero !== null ? ` (vaga nº ${p.vagaNumero})` : ''}.`,
        );
      },
      onError: (erro) => {
        const doCampo = errosDoServidor(erro, ['email'] as const).email;
        if (doCampo) setErroEmail(doCampo);
      },
    });
  }

  return (
    <>
      <Botao
        tamanho="sm"
        variante="secundario"
        aria-haspopup="dialog"
        icone={<UserPlus className="size-4" aria-hidden />}
        onClick={abrir}
        className="flex-auto whitespace-nowrap"
      >
        Adicionar participante
      </Botao>
      <FolhaInferior
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo="Adicionar participante"
      >
        <form
          noValidate
          onSubmit={enviar}
          aria-label="Adicionar participante"
          className="flex flex-col gap-4"
        >
          <p className="text-sm text-texto-2">
            Para quem já criou a conta no app. A pessoa entra na menor vaga livre.
          </p>
          <CampoTexto
            rotulo="E-mail da conta"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (erroEmail) setErroEmail(undefined);
              // Erro anterior sai quando a pessoa corrige o campo (senão o alerta geral reaparece).
              if (adicionar.isError) adicionar.reset();
            }}
            erro={erroEmail}
          />
          <div className="grid gap-1.5">
            <p aria-hidden className="px-[22px] text-[13px] font-medium text-texto-2">
              Pagamento
            </p>
            <Segmentado
              opcoes={OPCOES_STATUS}
              valor={status}
              aoMudar={setStatus}
              rotulo="Status do pagamento"
            />
            <p className="px-[22px] text-xs text-texto-2">{EXPLICACAO_STATUS[status]}</p>
          </div>
          {adicionar.isError && !erroEmail && (
            <Alerta tipo="erro">{mensagemErro(adicionar.error)}</Alerta>
          )}
          <Botao type="submit" larguraTotal carregando={adicionar.isPending}>
            Adicionar
          </Botao>
          <Botao
            variante="secundario"
            larguraTotal
            disabled={adicionar.isPending}
            onClick={() => setAberta(false)}
          >
            Cancelar
          </Botao>
        </form>
      </FolhaInferior>
    </>
  );
}
