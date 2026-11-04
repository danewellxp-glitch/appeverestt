import { idadeHoje, type AdminParticipanteDetalhe } from '@everest/shared';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Alerta } from '../../components/ui/basicos';
import { Botao } from '../../components/ui/Botao';
import { FolhaInferior } from '../../components/ui/FolhaInferior';
import { useToast } from '../../components/ui/Toast';
import { formatarData } from '../../lib/datas';
import { mensagemGeral } from '../auth/formulario';
import { mascararTelefone } from '../auth/perfil';
import { NotaEstrelas } from '../feedback/Estrelas';
import { formatarDataHora, useAtualizarPagamento, useRemoverParticipante } from './consultas';
import { linkWhatsapp } from './FilaPagamentos';
import { PilulaPagamento } from './PilulaPagamento';

const CLASSE_SECAO = 'grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]';
const CLASSE_LINK = 'font-semibold underline decoration-vermelho underline-offset-4 [overflow-wrap:anywhere]';

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="rotulo">{rotulo}</dt>
      <dd className="text-[15px] [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** "Dados": cadastro completo (só o admin vê). */
export function SecaoDados({ detalhe }: { detalhe: AdminParticipanteDetalhe }) {
  const { dados, participante } = detalhe;
  const idade = dados.idade ?? (dados.dataNascimento ? idadeHoje(dados.dataNascimento) : null);
  const local = [dados.bairro, [dados.cidade, dados.uf].filter(Boolean).join('/')].filter(Boolean).join(', ');
  // Conta excluída: o e-mail que a API devolve é técnico (removido+…@everest.invalid), não é contato.
  const contaExcluida = participante.contaExcluida || Boolean(dados.excluidoEm);
  return (
    <section aria-labelledby="titulo-dados" className={CLASSE_SECAO}>
      <h2 id="titulo-dados" className="text-[17px] font-bold">
        Dados
      </h2>
      {dados.excluidoEm && (
        <Alerta tipo="aviso">Conta excluída em {formatarDataHora(dados.excluidoEm)}. Os dados pessoais foram apagados.</Alerta>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        <Item rotulo="E-mail">
          {contaExcluida ? (
            'Conta excluída'
          ) : (
            <a href={`mailto:${dados.email}`} className={CLASSE_LINK}>
              {dados.email}
            </a>
          )}
        </Item>
        <Item rotulo="Instagram">
          {dados.instagram ? (
            <a
              href={`https://instagram.com/${encodeURIComponent(dados.instagram)}`}
              target="_blank"
              rel="noreferrer"
              className={CLASSE_LINK}
            >
              @{dados.instagram}
            </a>
          ) : (
            '—'
          )}
        </Item>
        <Item rotulo="WhatsApp">
          {dados.whatsapp ? (
            <a href={linkWhatsapp(dados.whatsapp)} target="_blank" rel="noreferrer" className={CLASSE_LINK}>
              {mascararTelefone(dados.whatsapp)}
            </a>
          ) : (
            '—'
          )}
        </Item>
        <Item rotulo="Nascimento">
          {dados.dataNascimento
            ? `${formatarData(dados.dataNascimento)} de ${dados.dataNascimento.slice(0, 4)}${idade !== null ? ` · ${idade} anos` : ''}`
            : '—'}
        </Item>
        <Item rotulo="Bairro e cidade">{local || '—'}</Item>
        <Item rotulo="Inscrito em">{formatarDataHora(participante.dataInscricao)}</Item>
        <Item rotulo="Marketing">
          {dados.aceitouMarketingEm ? `Sim, desde ${formatarDataHora(dados.aceitouMarketingEm)}` : 'Não'}
        </Item>
        <Item rotulo="Conta excluída">{contaExcluida ? 'Sim' : 'Não'}</Item>
      </dl>
    </section>
  );
}

/** "Pagamento": situação, datas e as ações do embaixador (confirmar, não recebi, remover). */
export function SecaoPagamento({ slug, detalhe }: { slug: string; detalhe: AdminParticipanteDetalhe }) {
  const { participante, pagamento, removivel } = detalhe;
  const atualizar = useAtualizarPagamento(slug);
  const remover = useRemoverParticipante(slug);
  const navegar = useNavigate();
  const { toast } = useToast();
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [aviso, setAviso] = useState('');

  function decidir(status: 'CONFIRMADO' | 'PENDENTE') {
    setAviso(status === 'CONFIRMADO' ? 'Confirmando…' : 'Marcando como não recebido…');
    atualizar.mutate(
      { participanteId: participante.participanteId, status },
      {
        onSuccess: () =>
          setAviso(
            status === 'CONFIRMADO'
              ? 'Pagamento confirmado. O acesso foi liberado.'
              : 'Voltou para pendente. A pessoa vai ver o aviso para conferir o pagamento.',
          ),
        onError: (e) => setAviso(`Não foi possível atualizar: ${mensagemGeral(e)}`),
      },
    );
  }

  function confirmarRemocao() {
    remover.mutate(participante.participanteId, {
      onSuccess: () => {
        setFolhaAberta(false);
        toast('Inscrição removida. A vaga voltou para a fila.');
        void navegar('/admin/participantes', { replace: true, viewTransition: true });
      },
    });
  }

  const ocupado = atualizar.isPending || remover.isPending;
  const vaga = participante.vagaNumero !== null ? ` nº ${participante.vagaNumero}` : '';

  return (
    <section aria-labelledby="titulo-pagamento" className={CLASSE_SECAO}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-pagamento" className="text-[17px] font-bold">
          Pagamento
        </h2>
        <PilulaPagamento status={pagamento.status} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Item rotulo="Avisou que pagou">{pagamento.informadoEm ? formatarDataHora(pagamento.informadoEm) : 'Ainda não'}</Item>
        <Item rotulo="Confirmado em">{pagamento.confirmadoEm ? formatarDataHora(pagamento.confirmadoEm) : '—'}</Item>
      </dl>
      {participante.ehEmbaixador && <p className="text-sm text-texto-2">O embaixador não paga a inscrição.</p>}

      {(pagamento.status !== 'CONFIRMADO' || removivel) && (
        <div className="flex flex-wrap gap-2">
          {pagamento.status !== 'CONFIRMADO' && (
            <Botao
              tamanho="sm"
              className="flex-1"
              carregando={atualizar.isPending && atualizar.variables.status === 'CONFIRMADO'}
              disabled={ocupado}
              onClick={() => decidir('CONFIRMADO')}
            >
              Confirmar pagamento
            </Botao>
          )}
          {pagamento.status === 'INFORMADO' && (
            <Botao
              tamanho="sm"
              variante="perigo"
              className="flex-1"
              carregando={atualizar.isPending && atualizar.variables.status === 'PENDENTE'}
              disabled={ocupado}
              onClick={() => decidir('PENDENTE')}
            >
              Não recebi
            </Botao>
          )}
          {removivel && (
            <Botao
              tamanho="sm"
              variante="perigo"
              className="flex-1"
              aria-haspopup="dialog"
              disabled={ocupado}
              onClick={() => {
                remover.reset();
                setFolhaAberta(true);
              }}
            >
              Remover inscrição
            </Botao>
          )}
        </div>
      )}
      <p aria-live="polite" className={`text-sm ${atualizar.isError ? 'text-vermelho-texto' : 'text-texto-2'}`}>
        {aviso}
      </p>

      <FolhaInferior aberta={folhaAberta} aoFechar={() => setFolhaAberta(false)} titulo="Remover a inscrição?">
        <p className="text-sm text-texto-2">
          A vaga{vaga} volta para a fila e {participante.nome} precisa se inscrever de novo para participar. Essa ação
          não pode ser desfeita.
        </p>
        {pagamento.status === 'CONFIRMADO' && (
          <Alerta tipo="aviso">
            O pagamento já foi confirmado. Se for o caso, combine a devolução do Pix direto com {participante.nome}: o
            app não faz estornos.
          </Alerta>
        )}
        {remover.isError && <Alerta tipo="erro">{mensagemGeral(remover.error)}</Alerta>}
        <Botao variante="secundario" larguraTotal onClick={() => setFolhaAberta(false)} disabled={remover.isPending}>
          Cancelar
        </Botao>
        <Botao larguraTotal carregando={remover.isPending} onClick={confirmarRemocao}>
          Remover inscrição
        </Botao>
      </FolhaInferior>
    </section>
  );
}

/** "Feedback": nota, textos e a autorização de divulgação. */
export function SecaoFeedback({ detalhe }: { detalhe: AdminParticipanteDetalhe }) {
  const { feedback } = detalhe;
  return (
    <section aria-labelledby="titulo-feedback" className={CLASSE_SECAO}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-feedback" className="text-[17px] font-bold">
          Feedback
        </h2>
        {feedback && <NotaEstrelas nota={feedback.nota} />}
      </div>
      {feedback ? (
        <>
          <dl className="grid gap-3">
            <Item rotulo="O que achou do desafio">
              <span className="whitespace-pre-line">{feedback.oQueAchou}</span>
            </Item>
            <Item rotulo="O que mudou nos 30 dias">
              <span className="whitespace-pre-line">{feedback.oQueMudou}</span>
            </Item>
          </dl>
          <p className="text-xs text-texto-2">
            {feedback.autorizaDivulgacao ? 'Autorizou a divulgação com o @.' : 'Não autorizou a divulgação.'} Enviado
            em {formatarDataHora(feedback.atualizadoEm)}.
          </p>
        </>
      ) : (
        <p className="text-sm text-texto-2">Ainda não enviou feedback.</p>
      )}
    </section>
  );
}
