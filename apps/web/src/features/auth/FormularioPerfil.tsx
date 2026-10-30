import {
  IDADE_MINIMA,
  TIMEZONE_PADRAO,
  UFS,
  atualizarPerfilSchema,
  hojeNoFuso,
  nomeExibicao,
  type AtualizarPerfilInput,
  type UsuarioMe,
} from '@everest/shared';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Botao } from '../../components/ui/Botao';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { CaixaMarcar, TextoAceite } from './CaixaMarcar';
import { type ErrosCampos, errosDasIssues } from './formulario';
import { mascararTelefone } from './perfil';

export const CAMPOS_PERFIL = [
  'nome',
  'instagram',
  'dataNascimento',
  'whatsapp',
  'bairro',
  'cidade',
  'uf',
  'aceitouTermos',
] as const;
export type CampoPerfil = (typeof CAMPOS_PERFIL)[number];

/** Data mais recente aceita no campo de nascimento (quem faz 18 anos hoje). */
function nascimentoMaximo(): string {
  const hoje = hojeNoFuso(new Date(), TIMEZONE_PADRAO);
  return `${Number(hoje.slice(0, 4)) - IDADE_MINIMA}${hoje.slice(4)}`;
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

function CampoEstado({
  valor,
  aoMudar,
  erro,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  erro?: string | undefined;
}) {
  const id = useId();
  const idErro = `${id}-erro`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-[22px] text-[13px] font-medium text-texto-2">
        Estado
      </label>
      <select
        id={id}
        name="uf"
        autoComplete="address-level1"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={`h-[54px] rounded-full border-[1.5px] bg-superficie-2 px-[22px] text-base text-texto focus:border-vermelho focus-visible:outline-none ${erro ? 'border-vermelho-texto' : 'border-transparent'}`}
      >
        <option value="">Escolha</option>
        {UFS.map((uf) => (
          <option key={uf} value={uf}>
            {uf}
          </option>
        ))}
      </select>
      {erro && (
        <p id={idErro} className="px-[22px] text-[13px] text-vermelho-texto">
          {erro}
        </p>
      )}
    </div>
  );
}

/**
 * Nome completo + dados de cadastro + aceite + marketing (docs/FRONTEND.md §4.4).
 * Usado na /bem-vindo e no /perfil. Valida com o mesmo schema da API.
 */
export function FormularioPerfil({
  usuario,
  aceitePreMarcado,
  rotuloBotao,
  carregando,
  errosServidor,
  aoEnviar,
  antesDoBotao,
}: {
  usuario: UsuarioMe;
  aceitePreMarcado: boolean;
  rotuloBotao: string;
  carregando: boolean;
  errosServidor: ErrosCampos<CampoPerfil>;
  aoEnviar: (dados: AtualizarPerfilInput) => void;
  /** Conteúdo entre o formulário e o botão (ex.: alerta de erro). */
  antesDoBotao?: ReactNode;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [instagram, setInstagram] = useState(usuario.instagram ?? '');
  const [dataNascimento, setDataNascimento] = useState(usuario.dataNascimento ?? '');
  const [whatsapp, setWhatsapp] = useState(usuario.whatsapp ? mascararTelefone(usuario.whatsapp) : '');
  const [bairro, setBairro] = useState(usuario.bairro ?? '');
  const [cidade, setCidade] = useState(usuario.cidade ?? '');
  const [uf, setUf] = useState(usuario.uf ?? '');
  const [aceite, setAceite] = useState(aceitePreMarcado || usuario.perfilCompleto);
  const [marketing, setMarketing] = useState(usuario.aceitouMarketing);
  const [erros, setErros] = useState<ErrosCampos<CampoPerfil>>({});
  const [tentativas, setTentativas] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (Object.keys(errosServidor).length === 0) return;
    setErros(errosServidor);
    setTentativas((n) => n + 1);
  }, [errosServidor]);

  useEffect(() => {
    if (tentativas === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tentativas]);

  function limpar(c: CampoPerfil) {
    setErros((atual) => (atual[c] ? { ...atual, [c]: undefined } : atual));
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (carregando) return;
    const r = atualizarPerfilSchema.safeParse({
      nome,
      instagram,
      dataNascimento,
      whatsapp,
      bairro,
      cidade,
      uf,
      aceitouTermos: aceite,
      aceitouMarketing: marketing,
    });
    if (!r.success) {
      setErros(errosDasIssues(r.error.issues, CAMPOS_PERFIL));
      setTentativas((n) => n + 1);
      return;
    }
    setErros({});
    aoEnviar(r.data);
  }

  const previa = nomeExibicao(nome);

  return (
    <form ref={formRef} noValidate onSubmit={enviar} aria-label="Seus dados" className="flex flex-col gap-4">
      <Cartao titulo="Seu nome">
        <CampoTexto
          rotulo="Nome completo"
          name="nome"
          autoComplete="name"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            limpar('nome');
          }}
          erro={erros.nome}
          dica={previa ? `Os outros participantes veem: ${previa}` : undefined}
        />
      </Cartao>

      <Cartao titulo="Seus dados">
        <p className="text-[13px] text-texto-2">
          Usamos esses dados para conferir sua participação e falar com você sobre o desafio.
        </p>
        <CampoTexto
          rotulo="@ do Instagram"
          name="instagram"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          prefixo="@"
          value={instagram}
          onChange={(e) => {
            setInstagram(e.target.value.replace(/^@+/, ''));
            limpar('instagram');
          }}
          erro={erros.instagram}
        />
        <CampoTexto
          rotulo="Data de nascimento"
          name="dataNascimento"
          type="date"
          autoComplete="bday"
          min="1900-01-01"
          max={nascimentoMaximo()}
          value={dataNascimento}
          onChange={(e) => {
            setDataNascimento(e.target.value);
            limpar('dataNascimento');
          }}
          erro={erros.dataNascimento}
          dica={`O desafio é para maiores de ${IDADE_MINIMA} anos.`}
        />
        <CampoTexto
          rotulo="WhatsApp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 98765-4321"
          value={whatsapp}
          onChange={(e) => {
            setWhatsapp(mascararTelefone(e.target.value));
            limpar('whatsapp');
          }}
          erro={erros.whatsapp}
        />
        <CampoTexto
          rotulo="Bairro"
          name="bairro"
          autoComplete="address-level3"
          value={bairro}
          onChange={(e) => {
            setBairro(e.target.value);
            limpar('bairro');
          }}
          erro={erros.bairro}
        />
        <CampoTexto
          rotulo="Cidade"
          name="cidade"
          autoComplete="address-level2"
          value={cidade}
          onChange={(e) => {
            setCidade(e.target.value);
            limpar('cidade');
          }}
          erro={erros.cidade}
        />
        <CampoEstado
          valor={uf}
          aoMudar={(v) => {
            setUf(v);
            limpar('uf');
          }}
          erro={erros.uf}
        />
      </Cartao>

      <CaixaMarcar
        marcado={aceite}
        aoMudar={(v) => {
          setAceite(v);
          limpar('aceitouTermos');
        }}
        erro={erros.aceitouTermos}
      >
        <TextoAceite />
      </CaixaMarcar>
      <CaixaMarcar marcado={marketing} aoMudar={setMarketing}>
        Quero receber novidades e ofertas da Everest por e-mail, WhatsApp e Instagram. Posso desistir quando quiser no
        meu perfil.
      </CaixaMarcar>

      {antesDoBotao}
      <Botao type="submit" larguraTotal carregando={carregando}>
        {rotuloBotao}
      </Botao>
    </form>
  );
}
