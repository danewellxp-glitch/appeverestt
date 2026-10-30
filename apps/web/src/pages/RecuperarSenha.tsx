import { entrarSchema } from '@everest/shared';
import { Mail, MailCheck } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Alerta } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/CampoTexto';
import { traduzirErroAuth } from '../features/auth/errosFirebase';
import { enviarRecuperacao } from '../features/auth/firebaseAuth';
import { TelaAuth } from '../features/auth/TelaAuth';
import { marcarDirecao } from '../lib/transicoes';

const emailSchema = entrarSchema.shape.email;

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [erroCampo, setErroCampo] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const campoRef = useRef<HTMLFormElement>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    const r = emailSchema.safeParse(email);
    if (!r.success) {
      setErroCampo('Informe um e-mail válido.');
      campoRef.current?.querySelector<HTMLElement>('input')?.focus();
      return;
    }
    setErroCampo(undefined);
    setErroGeral(null);
    setEnviando(true);
    try {
      await enviarRecuperacao(r.data);
      setEnviadoPara(r.data);
    } catch (erro) {
      const t = traduzirErroAuth(erro);
      if (t.campo === 'email') setErroCampo(t.mensagem ?? undefined);
      else setErroGeral(t.mensagem);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaAuth titulo="Nova senha" voltarPara="/entrar">
      {enviadoPara ? (
        <section
          role="status"
          className="surgir flex flex-col items-center gap-3 rounded-3xl bg-superficie p-5 text-center shadow-[inset_0_0_0_1px_var(--borda)]"
        >
          <MailCheck className="size-8 text-vermelho-texto" aria-hidden />
          <h2 className="text-lg font-bold">Confira seu e-mail</h2>
          <p className="text-sm text-texto-2">
            Se existir uma conta com <strong className="text-texto">{enviadoPara}</strong>, o link para criar uma
            senha nova já chegou. Ele vale por 1 hora.
          </p>
          <Link
            to="/entrar"
            viewTransition
            onClick={() => marcarDirecao('voltar')}
            className="press mt-2 inline-flex h-[54px] w-full items-center justify-center rounded-full bg-superficie-2 font-semibold"
          >
            Voltar para o login
          </Link>
        </section>
      ) : (
        <>
          <p className="mx-auto max-w-[30ch] text-center text-sm text-texto-2">
            Informe o e-mail da conta. Enviamos um link para você criar uma senha nova.
          </p>
          {erroGeral && <Alerta tipo="erro">{erroGeral}</Alerta>}
          <form ref={campoRef} noValidate onSubmit={(e) => void enviar(e)} className="flex flex-col gap-[18px]">
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
                setErroCampo(undefined);
              }}
              erro={erroCampo}
            />
            <Botao
              type="submit"
              variante="gradiente"
              larguraTotal
              carregando={enviando}
              icone={<Mail className="size-5" aria-hidden />}
            >
              Enviar link
            </Botao>
          </form>
        </>
      )}
    </TelaAuth>
  );
}
