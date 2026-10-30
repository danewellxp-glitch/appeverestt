import { criarContaSchema } from '@everest/shared';
import { LogIn } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Alerta } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/CampoTexto';
import { BotaoGoogle } from '../features/auth/BotaoGoogle';
import { CaixaMarcar, TextoAceite } from '../features/auth/CaixaMarcar';
import { criarContaComEmail, entrarComGoogle } from '../features/auth/firebaseAuth';
import { type ErrosCampos, errosDasIssues } from '../features/auth/formulario';
import { marcarAceitePendente } from '../features/auth/perfil';
import { Divisor, TelaAuth } from '../features/auth/TelaAuth';
import { useAcaoAuth } from '../features/auth/useAcaoAuth';

const CAMPOS = ['nome', 'email', 'senha', 'aceitouTermos'] as const;
type Campo = (typeof CAMPOS)[number];

export default function CriarConta() {
  const [params] = useSearchParams();
  const { search } = useLocation();
  const inscrevendo = params.get('acao') === 'inscrever';
  const acao = useAcaoAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<ErrosCampos<Campo>>({});
  const [tentativas, setTentativas] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (tentativas + acao.tentativas === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tentativas, acao.tentativas]);

  const ocupado = acao.carregando !== null;
  const erroDe = (c: Campo) => erros[c] ?? (c === 'email' || c === 'senha' ? acao.errosFirebase[c] : undefined);

  function limpar(c: Campo) {
    setErros((atual) => (atual[c] ? { ...atual, [c]: undefined } : atual));
    if (c === 'email' || c === 'senha') acao.limparErroCampo(c);
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    const r = criarContaSchema.safeParse({ nome, email, senha, aceitouTermos: aceite });
    if (!r.success) {
      setErros(errosDasIssues(r.error.issues, CAMPOS));
      setTentativas((n) => n + 1);
      return;
    }
    setErros({});
    // A /bem-vindo abre com o aceite já marcado (a pessoa acabou de aceitar aqui).
    marcarAceitePendente();
    void acao.executar('email', () => criarContaComEmail(r.data.nome, r.data.email, r.data.senha));
  }

  return (
    <TelaAuth
      titulo="Criar conta"
      apoio={inscrevendo ? 'Passo 1 de 2' : undefined}
      alternativa={{ para: '/entrar', rotulo: 'Entrar', Icone: LogIn }}
    >
      <BotaoGoogle
        carregando={acao.carregando === 'google'}
        disabled={ocupado}
        aoClicar={() => void acao.executar('google', entrarComGoogle)}
      />
      <Divisor>ou com e-mail</Divisor>
      {acao.erroGeral && (
        <Alerta
          tipo="erro"
          acao={
            acao.erroGeral.linkEntrar ? (
              <Link to={{ pathname: '/entrar', search }} className="font-bold underline underline-offset-4">
                Entrar
              </Link>
            ) : undefined
          }
        >
          {acao.erroGeral.mensagem}
        </Alerta>
      )}
      <form ref={formRef} noValidate onSubmit={enviar} aria-label="Criar conta" className="flex flex-col gap-[18px]">
        <CampoTexto
          rotulo="Nome"
          alinhamento="centro"
          name="nome"
          autoComplete="name"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            limpar('nome');
          }}
          erro={erroDe('nome')}
        />
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
          rotulo="Senha (mínimo 8 caracteres)"
          alinhamento="centro"
          name="senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            limpar('senha');
          }}
          erro={erroDe('senha')}
        />
        <CaixaMarcar
          marcado={aceite}
          aoMudar={(v) => {
            setAceite(v);
            limpar('aceitouTermos');
          }}
          erro={erroDe('aceitouTermos')}
        >
          <TextoAceite />
        </CaixaMarcar>
        <Botao type="submit" variante="gradiente" larguraTotal carregando={acao.carregando === 'email'} disabled={ocupado}>
          Criar conta
        </Botao>
      </form>
    </TelaAuth>
  );
}
