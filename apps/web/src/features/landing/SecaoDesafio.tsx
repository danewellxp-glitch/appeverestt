import { Trophy } from 'lucide-react';
import { secaoDesafio, tt } from '../../content/landing';
import { regrasVagasEPremio, textosRegras } from '../../content/regras';
import { BotaoQueroParticipar } from '../desafio/EntrarNoDesafio';
import { RegrasDoDia } from '../desafio/ListaRegras';
import { useEstadoInscricao } from '../desafio/useEntrarNoDesafio';
import { temVideoDesafio, VideoDesafio } from '../desafio/VideoDesafio';
import { ID_SECAO_DESAFIO } from './Hero';
import { numerosDoDesafio } from './numeros';
import { SecaoLanding, SubtituloLanding } from './Secao';

/** "O desafio": o que é, os 3 hábitos, os números, o prêmio, o vídeo do TT e o 2º "Quero participar". */
export function SecaoDesafio() {
  const { desafio } = useEstadoInscricao();
  const { totalDias, totalVagas } = numerosDoDesafio(desafio);
  const regras = regrasVagasEPremio(totalVagas, totalDias);
  const premio = regras.find((r) => r.id === 'PREMIO');
  const desempate = regras.find((r) => r.id === 'DESEMPATE');
  const [tituloInicio, tituloDestaque, tituloFim] = secaoDesafio.titulo;
  const titulo = (
    <>
      {tituloInicio} <span className="text-vermelho">{tituloDestaque}</span>
      {tituloFim}
    </>
  );

  return (
    <SecaoLanding id={ID_SECAO_DESAFIO} eyebrow={secaoDesafio.eyebrow} titulo={titulo}>
      <p className="text-[15px] text-texto-2">{secaoDesafio.texto(totalDias)}</p>

      <ul className="grid grid-cols-3 gap-2.5">
        {secaoDesafio.numeros(totalDias, totalVagas).map((n) => (
          <li
            key={n.rotulo}
            className="grid content-start gap-1 rounded-3xl bg-superficie px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--borda)]"
          >
            <b className="font-display text-[40px] leading-[0.9] font-extrabold tabular-nums">{n.valor}</b>
            <span className="text-xs text-texto-2">{n.rotulo}</span>
          </li>
        ))}
      </ul>

      <SubtituloLanding>{secaoDesafio.tituloHabitos}</SubtituloLanding>
      <RegrasDoDia desafio={desafio} />
      <p className="text-[13px] text-texto-2">{textosRegras.notaDiaria}</p>

      {premio && (
        <div className="grid gap-2 rounded-[28px] bg-pop p-5 text-pop-texto">
          <span className="flex items-center gap-2">
            <Trophy className="size-5 text-laranja" aria-hidden />
            <span className="text-[11px] font-semibold tracking-[0.16em] text-pop-texto-2 uppercase">
              {secaoDesafio.tituloPremio}
            </span>
          </span>
          <p className="text-[17px] leading-snug font-bold uppercase">{premio.texto.replace(/\.$/, '')}</p>
          {desempate && (
            <p className="text-xs text-pop-texto-2">
              <b className="font-semibold text-pop-texto">{secaoDesafio.rotuloDesempate}:</b> {desempate.texto}
            </p>
          )}
        </div>
      )}

      {temVideoDesafio() && (
        <>
          <SubtituloLanding>{secaoDesafio.tituloVideo(tt.apelido)}</SubtituloLanding>
          <VideoDesafio />
        </>
      )}

      <BotaoQueroParticipar quandoIndisponivel="nada" />
    </SecaoLanding>
  );
}
