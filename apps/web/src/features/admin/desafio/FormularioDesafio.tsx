import {
  atualizarDesafioSchema,
  criarDesafioSchema,
  somarDias,
  type AdminDesafioConfig,
  type AtualizarDesafioInput,
  type CriarDesafioInput,
} from '@everest/shared';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alerta } from '../../../components/ui/basicos';
import { Botao } from '../../../components/ui/Botao';
import { CampoTexto } from '../../../components/ui/CampoTexto';
import { Interruptor } from '../../../components/ui/Interruptor';
import { ehApiError } from '../../../lib/api';
import { formatarData } from '../../../lib/datas';
import {
  errosDasIssues,
  errosDoServidor,
  mensagemGeral,
  type ErrosCampos,
} from '../../auth/formulario';
import { useAtualizarDesafio, useCriarDesafio } from '../consultas';
import { sugerirSlug } from './regras';

const CAMPOS = [
  'nome',
  'slug',
  'dataInicio',
  'totalDias',
  'totalVagas',
  'instagramHandle',
  'hashtag',
] as const;
type Campo = (typeof CAMPOS)[number];

/** Campos que o PATCH aceita (para mandar só o que mudou). */
const EDITAVEIS = [
  'nome',
  'dataInicio',
  'totalDias',
  'totalVagas',
  'instagramHandle',
  'hashtag',
  'inscricoesAbertas',
  'embaixadorOcupaVaga',
  'ativo',
] as const satisfies readonly (keyof AtualizarDesafioInput & keyof AdminDesafioConfig)[];

/** Texto do input numérico → número (vazio vira NaN, que o schema recusa com a mensagem do campo). */
function numero(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto);
}

/** Só o que mudou em relação ao desafio salvo. */
export function diferencas(
  original: AdminDesafioConfig,
  novo: AtualizarDesafioInput,
): AtualizarDesafioInput {
  const saida: Record<string, unknown> = {};
  for (const campo of EDITAVEIS) {
    const valor = novo[campo];
    if (valor !== undefined && valor !== original[campo]) saida[campo] = valor;
  }
  return saida as AtualizarDesafioInput;
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <h2 id={id} className="rotulo">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Explicacao({ children }: { children: ReactNode }) {
  return <p className="-mt-2 px-3.5 text-xs text-texto-2">{children}</p>;
}

/**
 * Criar ou editar um desafio (validado no cliente com os schemas da API). Na edição manda só o que
 * mudou; com check-ins, data de início e total de dias ficam travados.
 */
export function FormularioDesafio({
  desafio,
  ativoAtual = null,
  padroes,
  aoSalvar,
}: {
  /** Ausente = criar. */
  desafio?: AdminDesafioConfig;
  /** O desafio ativo hoje (para avisar que ele deixa de aparecer ao ativar outro). */
  ativoAtual?: AdminDesafioConfig | null;
  /** Valores iniciais na criação (ex.: @ e hashtag do desafio atual). */
  padroes?: Partial<
    Pick<AdminDesafioConfig, 'instagramHandle' | 'hashtag' | 'totalVagas' | 'totalDias'>
  >;
  aoSalvar: (d: AdminDesafioConfig, criado: boolean) => void;
}) {
  const criando = !desafio;
  const travado = desafio?.temCheckins ?? false;
  const [nome, setNome] = useState(desafio?.nome ?? '');
  const [slug, setSlug] = useState(desafio?.slug ?? '');
  const [slugEditado, setSlugEditado] = useState(false);
  const [dataInicio, setDataInicio] = useState(desafio?.dataInicio ?? '');
  const [totalDias, setTotalDias] = useState(
    String(desafio?.totalDias ?? padroes?.totalDias ?? 30),
  );
  const [totalVagas, setTotalVagas] = useState(
    String(desafio?.totalVagas ?? padroes?.totalVagas ?? 50),
  );
  const [instagram, setInstagram] = useState(
    desafio?.instagramHandle ?? padroes?.instagramHandle ?? '',
  );
  const [hashtag, setHashtag] = useState(
    desafio?.hashtag ?? padroes?.hashtag ?? 'DESAFIO30EVEREST',
  );
  const [inscricoesAbertas, setInscricoesAbertas] = useState(desafio?.inscricoesAbertas ?? true);
  const [embaixadorOcupaVaga, setEmbaixadorOcupaVaga] = useState(
    desafio?.embaixadorOcupaVaga ?? true,
  );
  // Criar com outro desafio ativo: não ativa por padrão (não derruba o desafio em andamento sem querer).
  const [ativo, setAtivo] = useState(desafio?.ativo ?? !ativoAtual);
  const [erros, setErros] = useState<ErrosCampos<Campo>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [tentativas, setTentativas] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const criar = useCriarDesafio();
  const atualizar = useAtualizarDesafio();
  const salvando = criar.isPending || atualizar.isPending;

  useEffect(() => {
    if (tentativas === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tentativas]);

  function limpar(c: Campo) {
    setErros((atual) => (atual[c] ? { ...atual, [c]: undefined } : atual));
    setAviso('');
  }

  function falhou(e: unknown) {
    const doServidor = errosDoServidor(e, CAMPOS);
    if (ehApiError(e, 'DESAFIO_JA_EXISTE')) doServidor.slug = e.message;
    const porCampo = Object.keys(doServidor).length > 0;
    if (porCampo) {
      setErros(doServidor);
      setTentativas((n) => n + 1);
    }
    // Com erro marcado no campo, a mensagem já está lá: sem alerta geral repetindo.
    setErroGeral(porCampo ? null : mensagemGeral(e));
    setAviso('');
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvando) return;
    setErroGeral(null);
    const campos = {
      nome,
      dataInicio,
      totalDias: numero(totalDias),
      totalVagas: numero(totalVagas),
      instagramHandle: instagram,
      hashtag,
      inscricoesAbertas,
      embaixadorOcupaVaga,
    };

    if (criando) {
      const r = criarDesafioSchema.safeParse({ ...campos, slug, ativar: ativo });
      if (!r.success) {
        setErros(errosDasIssues(r.error.issues, CAMPOS));
        setTentativas((n) => n + 1);
        return;
      }
      setErros({});
      setAviso('Criando o desafio…');
      criar.mutate(r.data satisfies CriarDesafioInput, {
        onSuccess: (d) => aoSalvar(d, true),
        onError: falhou,
      });
      return;
    }

    const r = atualizarDesafioSchema.safeParse({ ...campos, ativo });
    if (!r.success) {
      setErros(errosDasIssues(r.error.issues, CAMPOS));
      setTentativas((n) => n + 1);
      return;
    }
    if (r.data.totalVagas !== undefined && r.data.totalVagas < desafio.vagasOcupadas) {
      setErros({
        totalVagas: `Já há ${desafio.vagasOcupadas} vagas ocupadas: use pelo menos ${desafio.vagasOcupadas}.`,
      });
      setTentativas((n) => n + 1);
      return;
    }
    setErros({});
    const mudancas = diferencas(desafio, r.data);
    if (travado) {
      delete mudancas.dataInicio;
      delete mudancas.totalDias;
    }
    if (Object.keys(mudancas).length === 0) {
      setAviso('Nada mudou desde o último salvamento.');
      return;
    }
    setAviso('Salvando…');
    atualizar.mutate(
      { slug: desafio.slug, ...mudancas },
      {
        onSuccess: (d) => {
          setAviso('Alterações salvas.');
          aoSalvar(d, false);
        },
        onError: falhou,
      },
    );
  }

  const diasNum = numero(totalDias);
  const fim =
    /^\d{4}-\d{2}-\d{2}$/.test(dataInicio) &&
    Number.isInteger(diasNum) &&
    diasNum >= 1 &&
    diasNum <= 365
      ? somarDias(dataInicio, diasNum - 1)
      : null;
  const outroAtivo = ativoAtual && ativoAtual.slug !== desafio?.slug ? ativoAtual : null;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={enviar}
      aria-label={criando ? 'Criar desafio' : `Configurar ${desafio.nome}`}
      className="flex flex-col gap-4"
    >
      <Cartao titulo="Identificação">
        <CampoTexto
          rotulo="Nome do desafio"
          name="nome"
          autoComplete="off"
          value={nome}
          maxLength={80}
          onChange={(e) => {
            setNome(e.target.value);
            limpar('nome');
            if (criando && !slugEditado) {
              setSlug(sugerirSlug(e.target.value));
              limpar('slug');
            }
          }}
          erro={erros.nome}
          placeholder="Ex.: Desafio Janeiro 2027"
        />
        {criando ? (
          <CampoTexto
            rotulo="Identificador (aparece nos endereços)"
            name="slug"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={slug}
            maxLength={60}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
              setSlugEditado(true);
              limpar('slug');
            }}
            erro={erros.slug}
            dica="Sugerido a partir do nome. Letras minúsculas, números e hífen. Não muda depois de criado."
          />
        ) : (
          <p className="px-[22px] text-xs text-texto-2">
            Identificador: <span className="font-semibold text-texto">{desafio.slug}</span> (não
            muda)
          </p>
        )}
      </Cartao>

      <Cartao titulo="Datas e vagas">
        {travado && (
          <Alerta tipo="info">
            Já existem check-ins: a data de início e o total de dias não podem mais mudar.
          </Alerta>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Data de início"
            name="dataInicio"
            type="date"
            value={dataInicio}
            disabled={travado}
            className={travado ? 'opacity-60' : ''}
            onChange={(e) => {
              setDataInicio(e.target.value);
              limpar('dataInicio');
            }}
            erro={erros.dataInicio}
            dica={
              travado
                ? 'Travada: já há check-ins.'
                : fim
                  ? `Último dia: ${formatarData(fim)}.`
                  : undefined
            }
          />
          <CampoTexto
            rotulo="Total de dias"
            name="totalDias"
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={totalDias}
            disabled={travado}
            className={travado ? 'opacity-60' : ''}
            onChange={(e) => {
              setTotalDias(e.target.value);
              limpar('totalDias');
            }}
            erro={erros.totalDias}
            dica={travado ? 'Travado: já há check-ins.' : undefined}
          />
        </div>
        <CampoTexto
          rotulo="Vagas"
          name="totalVagas"
          type="number"
          inputMode="numeric"
          min={Math.max(1, desafio?.vagasOcupadas ?? 1)}
          max={10000}
          value={totalVagas}
          onChange={(e) => {
            setTotalVagas(e.target.value);
            limpar('totalVagas');
          }}
          erro={erros.totalVagas}
          dica={
            desafio
              ? `${desafio.vagasOcupadas} ocupadas agora: o total não pode ficar abaixo disso.`
              : 'Quantas pessoas podem garantir uma vaga.'
          }
        />
      </Cartao>

      <Cartao titulo="Instagram">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="@ do desafio"
            name="instagramHandle"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            prefixo="@"
            value={instagram}
            onChange={(e) => {
              setInstagram(e.target.value.replace(/^@+/, ''));
              limpar('instagramHandle');
            }}
            erro={erros.instagramHandle}
          />
          <CampoTexto
            rotulo="Hashtag"
            name="hashtag"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            prefixo="#"
            value={hashtag}
            onChange={(e) => {
              setHashtag(e.target.value.replace(/^#+/, ''));
              limpar('hashtag');
            }}
            erro={erros.hashtag}
            dica="Usada nos stories do desafio."
          />
        </div>
      </Cartao>

      <Cartao titulo="Regras">
        <Interruptor
          ligado={inscricoesAbertas}
          rotulo="Inscrições abertas"
          aoAlternar={setInscricoesAbertas}
        />
        <Explicacao>
          {inscricoesAbertas
            ? 'Novas pessoas podem entrar enquanto houver vaga.'
            : 'Ninguém novo pode se inscrever.'}
        </Explicacao>
        <Interruptor
          ligado={embaixadorOcupaVaga}
          rotulo="Embaixador ocupa uma vaga"
          aoAlternar={setEmbaixadorOcupaVaga}
        />
        <Explicacao>
          {embaixadorOcupaVaga
            ? 'Você participa e conta no total de vagas (sem pagar a inscrição).'
            : 'Você participa sem ocupar vaga.'}
        </Explicacao>
        <Interruptor
          ligado={ativo}
          rotulo={criando ? 'Ativar ao criar' : 'Desafio ativo no app'}
          aoAlternar={setAtivo}
        />
        <Explicacao>
          {ativo
            ? outroAtivo
              ? `Vira o desafio do app; ${outroAtivo.nome} deixa de aparecer.`
              : 'É o desafio que o app mostra (só um por vez).'
            : desafio?.ativo
              ? 'Atenção: sem desafio ativo, o app não mostra nenhum desafio.'
              : 'Fica guardado; você ativa quando quiser.'}
        </Explicacao>
      </Cartao>

      {erroGeral && <Alerta tipo="erro">{erroGeral}</Alerta>}
      <p aria-live="polite" className="px-1 text-sm text-texto-2">
        {aviso}
      </p>
      <Botao
        type="submit"
        larguraTotal
        carregando={salvando}
        className="sm:w-auto sm:self-start sm:px-8"
      >
        {criando ? 'Criar desafio' : 'Salvar alterações'}
      </Botao>
    </form>
  );
}
