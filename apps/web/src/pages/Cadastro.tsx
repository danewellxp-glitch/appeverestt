import { cadastroSchema, LIMITES } from '@everest/shared';
import { ExternalLink, UserPlus } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/CampoTexto';
import { Alerta, Carregando } from '../components/ui/basicos';
import { ErroAposEntrar } from '../features/auth/ErroAposEntrar';
import { errosDasIssues, errosDoServidor, mensagemGeral, type ErrosCampos } from '../features/auth/formulario';
import { useCadastro } from '../features/auth/useCadastro';
import { usePosAutenticacao } from '../features/auth/usePosAutenticacao';
import { ehApiError } from '../lib/api';
import { useMe } from '../lib/queries';

const CAMPOS = ['nome', 'email', 'senha', 'aceitouTermos'] as const;
type Campo = (typeof CAMPOS)[number];

export default function Cadastro() {
  const meQ = useMe();
  const { redirecionando, erroInscricao } = usePosAutenticacao(meQ.data);
  const cadastro = useCadastro();
  const local = useLocation();
  const [params] = useSearchParams();
  const vaiInscrever = params.get('acao') === 'inscrever';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aceitou, setAceitou] = useState(false);
  const [erros, setErros] = useState<ErrosCampos<Campo>>({});
  const [tentativas, setTentativas] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const idTermos = useId();
  const idErroTermos = `${idTermos}-erro`;

  useEffect(() => {
    if (tentativas === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tentativas]);

  if (meQ.isPending) return <Carregando />;
  if (erroInscricao) return <ErroAposEntrar mensagem={erroInscricao} />;
  if (redirecionando) return <Carregando texto={vaiInscrever ? 'Garantindo sua vaga…' : 'Entrando…'} />;

  const linkLogin = { pathname: '/login', search: local.search };

  function limparErro(campo: Campo) {
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cadastro.isPending) return;
    const resultado = cadastroSchema.safeParse({ nome, email, senha, aceitouTermos: aceitou });
    if (!resultado.success) {
      cadastro.reset();
      setErros(errosDasIssues(resultado.error.issues, CAMPOS));
      setTentativas((n) => n + 1);
      return;
    }
    setErros({});
    cadastro.mutate(resultado.data, {
      onError: (erro) => {
        const doServidor = errosDoServidor(erro, CAMPOS);
        if (ehApiError(erro, 'EMAIL_EM_USO')) doServidor.email = 'Este e-mail já tem cadastro.';
        setErros(doServidor);
        setTentativas((n) => n + 1);
      },
    });
  }

  return (
    <section className="flex flex-col gap-6 py-4">
      <header className="flex flex-col gap-2">
        <p className="rotulo">{vaiInscrever ? 'Passo 1 de 2 · Crie sua conta' : 'Desafio 30 dias'}</p>
        <h1 className="text-4xl font-black uppercase leading-none tracking-tight">Criar conta</h1>
        <p className="text-texto-2">
          {vaiInscrever
            ? 'Assim que a conta for criada, garantimos a sua vaga no desafio.'
            : 'Crie sua conta para participar do desafio.'}
        </p>
      </header>

      <form ref={formRef} noValidate onSubmit={enviar} className="flex flex-col gap-4" aria-label="Criar conta">
        {cadastro.isError && (
          <Alerta
            tipo="erro"
            acao={
              ehApiError(cadastro.error, 'EMAIL_EM_USO') ? (
                <Link
                  to={linkLogin}
                  className="-my-2 inline-flex min-h-11 items-center rounded-lg px-2 font-bold underline underline-offset-4"
                >
                  Entrar
                </Link>
              ) : undefined
            }
          >
            {mensagemGeral(cadastro.error)}
          </Alerta>
        )}

        <CampoTexto
          rotulo="Nome completo"
          name="nome"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={LIMITES.nomeMax}
          required
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            limparErro('nome');
          }}
          erro={erros.nome}
          dica='No ranking aparece só o primeiro nome e a inicial do sobrenome (ex.: "Maria S.").'
        />
        <CampoTexto
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            limparErro('email');
          }}
          erro={erros.email}
        />
        <CampoTexto
          rotulo="Senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          maxLength={LIMITES.senhaMax}
          required
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            limparErro('senha');
          }}
          erro={erros.senha}
          dica={`Mínimo de ${LIMITES.senhaMin} caracteres.`}
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor={idTermos}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl py-1 text-sm font-semibold text-texto"
          >
            <input
              id={idTermos}
              type="checkbox"
              name="aceitouTermos"
              checked={aceitou}
              onChange={(e) => {
                setAceitou(e.target.checked);
                limparErro('aceitouTermos');
              }}
              required
              aria-invalid={erros.aceitouTermos ? true : undefined}
              aria-describedby={erros.aceitouTermos ? idErroTermos : undefined}
              className="size-6 shrink-0 cursor-pointer accent-vermelho"
            />
            Li e aceito a política de privacidade
          </label>
          <Link
            to="/privacidade"
            target="_blank"
            rel="noopener"
            className="ml-9 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-texto-2 underline underline-offset-4 hover:text-texto"
          >
            Ler a política de privacidade
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">(abre em nova aba)</span>
          </Link>
          {erros.aceitouTermos && (
            <p id={idErroTermos} className="ml-9 text-sm text-vermelho-texto">
              {erros.aceitouTermos}
            </p>
          )}
        </div>

        <Botao
          type="submit"
          larguraTotal
          carregando={cadastro.isPending}
          icone={<UserPlus className="size-4" aria-hidden />}
          className="mt-2 min-h-12 text-base"
        >
          {cadastro.isPending ? 'Criando conta…' : vaiInscrever ? 'Criar conta e entrar' : 'Criar conta'}
        </Botao>
      </form>

      <div className="flex flex-col items-center gap-1 border-t border-borda pt-5 text-center">
        <p className="text-sm text-texto-2">Já tem conta?</p>
        <Link
          to={linkLogin}
          className="inline-flex min-h-11 items-center px-3 text-sm font-bold uppercase tracking-wide text-texto underline underline-offset-4 hover:text-vermelho-texto"
        >
          Entrar
        </Link>
      </div>
    </section>
  );
}
