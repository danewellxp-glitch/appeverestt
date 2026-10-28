import { loginSchema } from '@everest/shared';
import { LogIn } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/CampoTexto';
import { Alerta, Carregando } from '../components/ui/basicos';
import { ErroAposEntrar } from '../features/auth/ErroAposEntrar';
import { errosDasIssues, errosDoServidor, mensagemGeral, type ErrosCampos } from '../features/auth/formulario';
import { useLogin } from '../features/auth/useLogin';
import { usePosAutenticacao } from '../features/auth/usePosAutenticacao';
import { useMe } from '../lib/queries';

const CAMPOS = ['email', 'senha'] as const;
type Campo = (typeof CAMPOS)[number];

export default function Login() {
  const meQ = useMe();
  const { redirecionando, erroInscricao } = usePosAutenticacao(meQ.data);
  const login = useLogin();
  const local = useLocation();
  const [params] = useSearchParams();
  const vaiInscrever = params.get('acao') === 'inscrever';

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosCampos<Campo>>({});
  const [tentativas, setTentativas] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Depois de uma tentativa com erro, leva o foco ao primeiro campo inválido.
  useEffect(() => {
    if (tentativas === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tentativas]);

  if (meQ.isPending) return <Carregando />;
  if (erroInscricao) return <ErroAposEntrar mensagem={erroInscricao} />;
  if (redirecionando) return <Carregando texto={vaiInscrever ? 'Garantindo sua vaga…' : 'Entrando…'} />;

  function limparErro(campo: Campo) {
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (login.isPending) return;
    const resultado = loginSchema.safeParse({ email, senha });
    if (!resultado.success) {
      login.reset();
      setErros(errosDasIssues(resultado.error.issues, CAMPOS));
      setTentativas((n) => n + 1);
      return;
    }
    setErros({});
    login.mutate(resultado.data, {
      onError: (erro) => {
        setErros(errosDoServidor(erro, CAMPOS));
        setTentativas((n) => n + 1);
      },
    });
  }

  return (
    <section className="flex flex-col gap-6 py-4">
      <header className="flex flex-col gap-2">
        <p className="rotulo">{vaiInscrever ? 'Garanta a sua vaga' : 'Bem-vindo de volta'}</p>
        <h1 className="text-4xl font-black uppercase leading-none tracking-tight">Entrar</h1>
        <p className="text-texto-2">
          {vaiInscrever
            ? 'Entre na sua conta para confirmar a inscrição no desafio.'
            : 'Entre com o e-mail e a senha que você cadastrou.'}
        </p>
      </header>

      <form ref={formRef} noValidate onSubmit={enviar} className="flex flex-col gap-4" aria-label="Entrar na conta">
        {login.isError && <Alerta tipo="erro">{mensagemGeral(login.error)}</Alerta>}

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
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            limparErro('senha');
          }}
          erro={erros.senha}
        />

        <Botao
          type="submit"
          larguraTotal
          carregando={login.isPending}
          icone={<LogIn className="size-4" aria-hidden />}
          className="mt-2 min-h-12 text-base"
        >
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Botao>

        <p className="text-sm text-texto-2">
          Esqueceu a senha? Fale com o embaixador do desafio.
        </p>
      </form>

      <div className="flex flex-col items-center gap-1 border-t border-borda pt-5 text-center">
        <p className="text-sm text-texto-2">Ainda não tem conta?</p>
        <Link
          to={{ pathname: '/cadastro', search: local.search }}
          className="inline-flex min-h-11 items-center px-3 text-sm font-bold uppercase tracking-wide text-texto underline underline-offset-4 hover:text-vermelho-texto"
        >
          Criar conta
        </Link>
      </div>
    </section>
  );
}
