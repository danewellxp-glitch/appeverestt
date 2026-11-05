import { TIMEZONE_PADRAO, atualizarPerfilSchema, type AtualizarPerfilInput } from '@everest/shared';
import {
  BookOpen,
  ChevronRight,
  Download,
  IdCard,
  LogOut,
  MessageSquareHeart,
  Monitor,
  Moon,
  QrCode,
  ShieldCheck,
  Sun,
  Trash2,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../components/ui/Avatar';
import { Alerta, Carregando } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { FolhaInferior } from '../components/ui/FolhaInferior';
import { Interruptor } from '../components/ui/Interruptor';
import { Segmentado } from '../components/ui/Segmentado';
import { useToast } from '../components/ui/Toast';
import { type CampoPerfil, CAMPOS_PERFIL, FormularioPerfil } from '../features/auth/FormularioPerfil';
import { type ErrosCampos, errosDoServidor, mensagemGeral } from '../features/auth/formulario';
import { useAtualizarPerfil } from '../features/auth/perfil';
import { useExcluirConta } from '../features/auth/useExcluirConta';
import { useLogout } from '../features/auth/useLogout';
import { LinhaLembretes } from '../features/push/LinhaLembretes';
import { FolhaInstalar } from '../features/pwa/FolhaInstalar';
import { useInstallPrompt } from '../features/pwa/useInstallPrompt';
import { useMe } from '../lib/queries';
import { type PreferenciaTema, useTema } from '../lib/tema';
import { marcarDirecao } from '../lib/transicoes';

const DIA_MES = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TIMEZONE_PADRAO });

const OPCOES_TEMA = [
  { valor: 'claro', rotulo: 'Claro', icone: <Sun className="size-4" aria-hidden /> },
  { valor: 'escuro', rotulo: 'Escuro', icone: <Moon className="size-4" aria-hidden /> },
  { valor: 'sistema', rotulo: 'Sistema', icone: <Monitor className="size-4" aria-hidden /> },
] as const satisfies readonly { valor: PreferenciaTema; rotulo: string; icone: ReactNode }[];

const CLASSE_LINHA =
  'flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] font-medium transition-colors hover:bg-superficie-2';

function Lista({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo}>
      <ul className="overflow-hidden rounded-3xl bg-superficie shadow-[inset_0_0_0_1px_var(--borda)] [&>li+li]:border-t [&>li+li]:border-borda">
        {children}
      </ul>
    </section>
  );
}

function ConteudoLinha({ Icone, rotulo, perigo = false }: { Icone: LucideIcon; rotulo: string; perigo?: boolean }) {
  return (
    <>
      <span
        aria-hidden
        className={`grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 ${perigo ? 'text-vermelho-texto' : 'text-texto-2'}`}
      >
        <Icone className="size-[18px]" />
      </span>
      <span className={`flex-1 ${perigo ? 'text-vermelho-texto' : ''}`}>{rotulo}</span>
      {!perigo && <ChevronRight className="size-4 text-texto-2" aria-hidden />}
    </>
  );
}

function LinhaLink({ para, Icone, rotulo }: { para: string; Icone: LucideIcon; rotulo: string }) {
  return (
    <li>
      <Link to={para} viewTransition onClick={() => marcarDirecao('avancar')} className={CLASSE_LINHA}>
        <ConteudoLinha Icone={Icone} rotulo={rotulo} />
      </Link>
    </li>
  );
}

function LinhaBotao({
  Icone,
  rotulo,
  aoClicar,
  perigo,
  haspopup,
}: {
  Icone: LucideIcon;
  rotulo: string;
  aoClicar: () => void;
  perigo?: boolean;
  haspopup?: boolean;
}) {
  return (
    <li>
      <button type="button" onClick={aoClicar} aria-haspopup={haspopup ? 'dialog' : undefined} className={CLASSE_LINHA}>
        <ConteudoLinha Icone={Icone} rotulo={rotulo} perigo={perigo} />
      </button>
    </li>
  );
}

/** /perfil (docs/FRONTEND.md §9.9): tema, dados, comunicação (novidades e lembretes), instalar, links, sair e excluir. */
export default function Perfil() {
  const { data: me } = useMe();
  const tema = useTema();
  const { toast } = useToast();
  const logout = useLogout();
  const excluir = useExcluirConta();
  const atualizar = useAtualizarPerfil();
  const instalacao = useInstallPrompt();
  const [folha, setFolha] = useState<'dados' | 'excluir' | 'instalar' | null>(null);
  const [errosServidor, setErrosServidor] = useState<ErrosCampos<CampoPerfil>>({});
  const [erroDados, setErroDados] = useState<string | null>(null);

  if (!me) return <Carregando />;
  const u = me.usuario;
  const p = me.participacao;
  const confirmado = p?.pagamentoStatus === 'CONFIRMADO';
  // Mesmo vocabulário da /pagamento: depois do "Já fiz o pagamento" é "em análise".
  const textoPagamento = p?.pagamentoStatus === 'INFORMADO' ? 'Pagamento em análise' : 'Pagamento pendente';

  function salvarDados(dados: AtualizarPerfilInput) {
    setErroDados(null);
    setErrosServidor({});
    atualizar.mutate(dados, {
      onSuccess: () => {
        setFolha(null);
        toast('Dados salvos.');
      },
      onError: (e) => {
        const porCampo = errosDoServidor(e, CAMPOS_PERFIL);
        if (Object.keys(porCampo).length > 0) setErrosServidor(porCampo);
        else setErroDados(mensagemGeral(e));
      },
    });
  }

  /**
   * Liga/desliga uma preferência (marketing ou cutucadas) reaproveitando os dados atuais
   * (o PATCH pede todos os campos de cadastro).
   */
  function alternarPreferencia(campo: 'aceitouMarketing' | 'aceitaCutucadas', ligado: boolean) {
    const r = atualizarPerfilSchema.safeParse({
      nome: u.nome,
      instagram: u.instagram ?? '',
      dataNascimento: u.dataNascimento ?? '',
      whatsapp: u.whatsapp ?? '',
      bairro: u.bairro ?? '',
      cidade: u.cidade ?? '',
      uf: u.uf ?? '',
      aceitouTermos: true,
      aceitouMarketing: u.aceitouMarketing,
      [campo]: ligado,
    });
    if (!r.success) {
      setFolha('dados');
      return;
    }
    const mensagens = {
      aceitouMarketing: ['Você vai receber novidades da Everest.', 'Pronto: sem mensagens de marketing.'],
      aceitaCutucadas: ['A turma pode te cutucar de novo.', 'Pronto: ninguém da turma vai te cutucar.'],
    } as const;
    atualizar.mutate(r.data, {
      onSuccess: () => toast(mensagens[campo][ligado ? 0 : 1]),
      onError: (e) => toast(mensagemGeral(e)),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="surgir mt-2 flex flex-col items-center gap-2 text-center">
        <Avatar nome={u.nome} fotoUrl={u.fotoUrl} tamanho="xl" />
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">{u.nome}</h1>
        <p className="text-sm break-all text-texto-2">{u.email}</p>
        {p && (
          <p className="rounded-full bg-superficie-2 px-3 py-1 text-xs font-semibold">
            {p.vagaNumero !== null ? `Vaga nº ${p.vagaNumero} · ` : ''}
            {confirmado ? `inscrição em ${DIA_MES.format(new Date(p.dataInscricao))}` : textoPagamento.toLowerCase()}
          </p>
        )}
      </header>

      <section
        aria-label="Aparência"
        className="grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
      >
        <h2 className="rotulo">Aparência</h2>
        <Segmentado opcoes={OPCOES_TEMA} valor={tema.preferencia} aoMudar={tema.definir} rotulo="Tema do app" />
        <p className="text-xs text-texto-2">Sistema segue o modo do seu celular.</p>
      </section>

      <section aria-label="Comunicação" className="grid gap-2">
        <Interruptor
          ligado={u.aceitouMarketing}
          rotulo="Receber novidades e ofertas da Everest"
          disabled={atualizar.isPending}
          aoAlternar={(ligado) => alternarPreferencia('aceitouMarketing', ligado)}
        />
        <p className="px-1 text-xs text-texto-2">Por e-mail, WhatsApp e Instagram. Você pode desligar quando quiser.</p>
        {confirmado && (
          <>
            <Interruptor
              ligado={u.aceitaCutucadas !== false}
              rotulo="Receber cutucadas da turma"
              disabled={atualizar.isPending}
              aoAlternar={(ligado) => alternarPreferencia('aceitaCutucadas', ligado)}
            />
            <p className="px-1 text-xs text-texto-2">
              Quem ainda não fechou o dia pode receber uma notificação da turma, no máximo uma por pessoa por dia.
            </p>
          </>
        )}
        {confirmado && <LinhaLembretes aoInstalar={() => setFolha('instalar')} />}
      </section>

      <Lista titulo="Atalhos">
        {p && !confirmado && <LinhaLink para="/pagamento" Icone={QrCode} rotulo={textoPagamento} />}
        <LinhaBotao Icone={IdCard} rotulo="Meus dados" haspopup aoClicar={() => setFolha('dados')} />
        {!instalacao.instalado && <LinhaBotao Icone={Download} rotulo="Instalar o app" haspopup aoClicar={() => setFolha('instalar')} />}
        {confirmado && <LinhaLink para="/feedback" Icone={MessageSquareHeart} rotulo="Dar feedback" />}
        <LinhaLink para="/regras" Icone={BookOpen} rotulo="Regras" />
        <LinhaLink para="/privacidade" Icone={ShieldCheck} rotulo="Política de privacidade" />
        {u.papel === 'ADMIN' && <LinhaLink para="/admin" Icone={UserCog} rotulo="Painel do embaixador" />}
      </Lista>

      <Lista titulo="Conta">
        <LinhaBotao Icone={LogOut} rotulo={logout.isPending ? 'Saindo…' : 'Sair'} aoClicar={() => logout.mutate()} />
        <LinhaBotao Icone={Trash2} rotulo="Excluir minha conta" perigo haspopup aoClicar={() => setFolha('excluir')} />
      </Lista>

      <FolhaInferior aberta={folha === 'dados'} aoFechar={() => setFolha(null)} titulo="Meus dados">
        <FormularioPerfil
          usuario={u}
          aceitePreMarcado={u.perfilCompleto}
          rotuloBotao="Salvar"
          carregando={atualizar.isPending}
          errosServidor={errosServidor}
          aoEnviar={salvarDados}
          antesDoBotao={erroDados ? <Alerta tipo="erro">{erroDados}</Alerta> : null}
        />
      </FolhaInferior>

      <FolhaInferior aberta={folha === 'excluir'} aoFechar={() => setFolha(null)} titulo="Excluir sua conta?">
        <p className="text-sm text-texto-2">
          Apaga seu perfil, seus check-ins e suas fotos. A vaga não volta para a fila e essa ação não pode ser desfeita.
        </p>
        {excluir.isError && <Alerta tipo="erro">{mensagemGeral(excluir.error)}</Alerta>}
        <Botao variante="secundario" larguraTotal onClick={() => setFolha(null)} disabled={excluir.isPending}>
          Cancelar
        </Botao>
        <Botao larguraTotal carregando={excluir.isPending} onClick={() => excluir.mutate()}>
          Excluir minha conta
        </Botao>
      </FolhaInferior>

      <FolhaInstalar aberta={folha === 'instalar'} aoFechar={() => setFolha(null)} />
    </div>
  );
}
