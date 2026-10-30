import { LIMITES, feedbackSchema, type Feedback as FeedbackSalvo } from '@everest/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { AreaTexto } from '../components/ui/AreaTexto';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { useToast } from '../components/ui/Toast';
import { CaixaMarcar } from '../features/auth/CaixaMarcar';
import { type ErrosCampos, errosDasIssues, errosDoServidor, mensagemGeral } from '../features/auth/formulario';
import { Estrelas } from '../features/feedback/Estrelas';
import { useFeedback, useSalvarFeedback } from '../features/feedback/useFeedback';
import { useMe } from '../lib/queries';

const CAMPOS = ['nota', 'oQueAchou', 'oQueMudou', 'autorizaDivulgacao'] as const;
type CampoFeedback = (typeof CAMPOS)[number];

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function Topo() {
  return (
    <header className="surgir flex items-center gap-3">
      <BotaoVoltar para="/perfil" />
      <div className="min-w-0 flex-1">
        <p className="rotulo">Desafio 30 dias</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Seu feedback</h1>
      </div>
    </header>
  );
}

function Formulario({ slug, salvo }: { slug: string; salvo: FeedbackSalvo | null }) {
  const { toast } = useToast();
  const salvar = useSalvarFeedback(slug);
  const [nota, setNota] = useState(salvo?.nota ?? 0);
  const [oQueAchou, setOQueAchou] = useState(salvo?.oQueAchou ?? '');
  const [oQueMudou, setOQueMudou] = useState(salvo?.oQueMudou ?? '');
  const [autoriza, setAutoriza] = useState(salvo?.autorizaDivulgacao ?? false);
  const [erros, setErros] = useState<ErrosCampos<CampoFeedback>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const jaEnviado = salvo !== null;

  useEffect(() => {
    if (tentativas === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tentativas]);

  function limpar(c: CampoFeedback) {
    setErros((atual) => (atual[c] ? { ...atual, [c]: undefined } : atual));
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvar.isPending) return;
    setErroGeral(null);
    const r = feedbackSchema.safeParse({ nota, oQueAchou, oQueMudou, autorizaDivulgacao: autoriza });
    if (!r.success) {
      setErros(errosDasIssues(r.error.issues, CAMPOS));
      setTentativas((n) => n + 1);
      return;
    }
    setErros({});
    salvar.mutate(r.data, {
      onSuccess: () => toast(jaEnviado ? 'Feedback atualizado. Obrigado!' : 'Feedback enviado. Obrigado!'),
      onError: (erro) => {
        const porCampo = errosDoServidor(erro, CAMPOS);
        if (Object.keys(porCampo).length > 0) {
          setErros(porCampo);
          setTentativas((n) => n + 1);
        } else setErroGeral(mensagemGeral(erro));
      },
    });
  }

  return (
    <form ref={formRef} noValidate onSubmit={enviar} aria-label="Seu feedback" className="flex flex-col gap-5">
      <p className="surgir text-[15px] text-texto-2">
        Sua opinião ajuda a melhorar as próximas edições. Você pode voltar e editar quando quiser.
      </p>
      {jaEnviado && salvo && (
        <Alerta tipo="sucesso">Você já enviou seu feedback em {DATA_HORA.format(new Date(salvo.atualizadoEm))}. Pode editar abaixo.</Alerta>
      )}

      <Estrelas
        legenda="Que nota você dá para o desafio?"
        valor={nota}
        aoMudar={(n) => {
          setNota(n);
          limpar('nota');
        }}
        erro={erros.nota}
      />

      <AreaTexto
        rotulo="O que você achou do desafio?"
        name="oQueAchou"
        value={oQueAchou}
        maxLength={LIMITES.feedbackTextoMax}
        erro={erros.oQueAchou}
        placeholder="O que foi bom, o que foi difícil, o que você mudaria."
        onChange={(e) => {
          setOQueAchou(e.target.value);
          limpar('oQueAchou');
        }}
      />

      <AreaTexto
        rotulo="O que mudou para você nestes 30 dias?"
        name="oQueMudou"
        value={oQueMudou}
        maxLength={LIMITES.feedbackTextoMax}
        erro={erros.oQueMudou}
        placeholder="Hábitos, disposição, rotina, a forma como você se enxerga."
        onChange={(e) => {
          setOQueMudou(e.target.value);
          limpar('oQueMudou');
        }}
      />

      <CaixaMarcar marcado={autoriza} aoMudar={setAutoriza} erro={erros.autorizaDivulgacao}>
        Autorizo o Everest a usar meu depoimento nas redes sociais, com o meu @.
      </CaixaMarcar>

      {erroGeral && <Alerta tipo="erro">{erroGeral}</Alerta>}
      <Botao type="submit" larguraTotal carregando={salvar.isPending}>
        {jaEnviado ? 'Salvar alterações' : 'Enviar feedback'}
      </Botao>
    </form>
  );
}

/** /feedback (X13): nota, o que achou, o que mudou e a autorização de divulgação. Editável. */
export default function Feedback() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const consulta = useFeedback(slug);

  return (
    <div className="flex flex-col gap-4">
      <Topo />
      {consulta.isPending ? (
        <div role="status" aria-label="Carregando o feedback" className="grid gap-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-36 rounded-[22px]" />
          <Skeleton className="h-36 rounded-[22px]" />
          <Skeleton className="h-[54px] rounded-full" />
        </div>
      ) : consulta.isError ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void consulta.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {mensagemGeral(consulta.error)}
        </Alerta>
      ) : slug ? (
        <Formulario slug={slug} salvo={consulta.data.feedback} />
      ) : null}
    </div>
  );
}
