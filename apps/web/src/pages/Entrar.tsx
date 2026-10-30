import { entrarSchema } from '@everest/shared';
import { LogIn, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Alerta } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/CampoTexto';
import { BotaoGoogle } from '../features/auth/BotaoGoogle';
import { entrarComEmail, entrarComGoogle } from '../features/auth/firebaseAuth';
import { type ErrosCampos, errosDasIssues } from '../features/auth/formulario';
import { Divisor, TelaAuth } from '../features/auth/TelaAuth';
import { useAcaoAuth } from '../features/auth/useAcaoAuth';
import { marcarDirecao } from '../lib/transicoes';

const CAMPOS = ['email', 'senha'] as const;
type Campo = (typeof CAMPOS)[number];

export default function Entrar() {
  const [params] = useSearchParams();
  const inscrevendo = params.get('acao') === 'inscrever';
  const acao = useAcaoAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosCampos<Campo>>({});
  const [tentativas, setTentativas] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Foco no 1º campo inválido depois de cada tentativa com erro (local ou do Firebase).
  useEffect(() => {
    if (tentativas + acao.tentativas === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tentativas, acao.tentativas]);

  const erroDe = (c: Campo) => erros[c] ?? acao.errosFirebase[c];
  const ocupado = acao.carregando !== null;

  function limpar(c: Campo) {
    setErros((atual) => (atual[c] ? { ...atual, [c]: undefined } : atual));
    acao.limparErroCampo(c);
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    const r = entrarSchema.safeParse({ email, senha });
    if (!r.success) {
      setErros(errosDasIssues(r.error.issues, CAMPOS));
      setTentativas((n) => n + 1);
      return;
    }
    setErros({});
    void acao.executar('email', () => entrarComEmail(r.data.email, r.data.senha));
  }

  return (
    <TelaAuth
      titulo="Entrar"
      apoio={inscrevendo ? 'Passo 1 de 2' : undefined}
      alternativa={{ para: '/criar-conta', rotulo: 'Criar conta', Icone: UserPlus }}
    >
      {acao.erroGeral && <Alerta tipo="erro">{acao.erroGeral.mensagem}</Alerta>}
      <form ref={formRef} noValidate onSubmit={enviar} aria-label="Entrar na conta" className="flex flex-col gap-[18px]">
        <CampoTexto
          rotulo="E-mail"
          alinhamento="centro"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            limpar('email');
          }}
          erro={erroDe('email')}
        />
        <CampoTexto
          rotulo="Senha"
          alinhamento="centro"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            limpar('senha');
          }}
          erro={erroDe('senha')}
        />
        <Link
          to="/recuperar-senha"
          viewTransition
          onClick={() => marcarDirecao('avancar')}
          className="mx-auto inline-flex min-h-11 items-center px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4"
        >
          Esqueci a senha
        </Link>
        <Botao
          type="submit"
          variante="gradiente"
          larguraTotal
          carregando={acao.carregando === 'email'}
          disabled={ocupado}
          icone={<LogIn className="size-5" aria-hidden />}
        >
          Entrar
        </Botao>
      </form>
      <Divisor>ou entre com</Divisor>
      <BotaoGoogle
        carregando={acao.carregando === 'google'}
        disabled={ocupado}
        aoClicar={() => void acao.executar('google', entrarComGoogle)}
      />
    </TelaAuth>
  );
}
