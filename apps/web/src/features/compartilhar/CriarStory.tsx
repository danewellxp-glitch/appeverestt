import type { FotoDia, MeuProgresso } from '@everest/shared';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { FolhaInferior } from '../../components/ui/FolhaInferior';
import { Segmentado, type OpcaoSegmentado } from '../../components/ui/Segmentado';
import { useToast } from '../../components/ui/Toast';
import { useRanking } from '../../lib/queries';
import { copiarTexto } from '../desafio/navegacao';
import { fotoEhValida } from '../fotos/fotosValidas';
import { carregarFontes, carregarLogo, imagemDeArquivo, imagemDeUrl } from './carregarImagem';
import { canvasParaBlob, compartilharImagem, type ResultadoCompartilhar } from './compartilhar';
import { montarDadosStory, nomeArquivoStory, textoMarcacao } from './dadosStory';
import type { Fundo } from './desenhar/base';
import { MODELOS, ROTULO_MODELO, desenharStory, type Modelo } from './desenhar/modelos';

type TipoFundo = 'treino' | 'galeria' | 'marca' | 'adesivo';

export interface DiaParaStory {
  numeroDia: number;
  aguaMl: number;
  exercicio: boolean;
  paginasLidas: number;
  fotos: readonly FotoDia[];
}

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  slug: string;
  dia: DiaParaStory;
  progresso: MeuProgresso;
  instagramHandle: string | undefined;
  hashtag: string | undefined;
  storyPostado: boolean;
  /** Dia editável: depois de compartilhar, oferece marcar o story como postado. */
  podeMarcar: boolean;
  aoMarcarPostado: () => void;
}

const OPCOES_MODELO: OpcaoSegmentado<Modelo>[] = MODELOS.map((m) => ({
  valor: m,
  rotulo: ROTULO_MODELO[m],
}));

/** Folha "Criar meu story": prévia 9:16, escolha de modelo e fundo, e o botão de compartilhar. */
export function CriarStory(props: Props) {
  return (
    <FolhaInferior aberta={props.aberta} aoFechar={props.aoFechar} titulo="Seu story">
      {props.aberta && <Conteudo {...props} />}
    </FolhaInferior>
  );
}

function Conteudo({
  slug,
  dia,
  progresso,
  instagramHandle,
  hashtag,
  storyPostado,
  podeMarcar,
  aoMarcarPostado,
}: Props) {
  const { toast } = useToast();
  const posicao = useRanking(slug).data?.minhaPosicao ?? null;
  const fotoTreino = dia.fotos.find((f) => f.tipo === 'EXERCICIO' && fotoEhValida(f));
  const urlTreino = fotoTreino ? (fotoTreino.url ?? fotoTreino.thumbUrl) : null;

  const [modelo, setModelo] = useState<Modelo>('escalada');
  const [tipoFundo, setTipoFundo] = useState<TipoFundo>(urlTreino ? 'treino' : 'marca');
  const [recursos, setRecursos] = useState<{ logo: HTMLImageElement | null } | null>(null);
  const [imgTreino, setImgTreino] = useState<HTMLImageElement | null>(null);
  const [imgGaleria, setImgGaleria] = useState<HTMLImageElement | null>(null);
  const [pronto, setPronto] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCompartilhar | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const blob = useRef<Blob | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const { numeroDia, aguaMl, exercicio, paginasLidas } = dia;
  // Depende só de valores simples: o objeto `dia` pode ser recriado a cada render da página.
  const dados = useMemo(
    () =>
      montarDadosStory({
        progresso,
        dia: { numeroDia, aguaMl, exercicio, paginasLidas },
        posicao,
        instagramHandle,
        hashtag,
      }),
    [progresso, numeroDia, aguaMl, exercicio, paginasLidas, posicao, instagramHandle, hashtag],
  );
  const marcacao = textoMarcacao(dados);

  // Fontes e logo, uma vez ao abrir.
  useEffect(() => {
    let vivo = true;
    void Promise.all([carregarFontes(), carregarLogo()]).then(
      ([, logo]) => vivo && setRecursos({ logo }),
    );
    return () => {
      vivo = false;
    };
  }, []);

  // Foto de prova do treino: baixa só quando esse fundo é escolhido.
  useEffect(() => {
    if (tipoFundo !== 'treino' || imgTreino || !urlTreino) return;
    const ctrl = new AbortController();
    imagemDeUrl(urlTreino, ctrl.signal)
      .then(setImgTreino)
      .catch(() => {
        if (ctrl.signal.aborted) return;
        toast('Não deu para carregar a foto do treino. Usando o fundo vermelho.');
        setTipoFundo('marca');
      });
    return () => ctrl.abort();
  }, [tipoFundo, imgTreino, urlTreino, toast]);

  const fundo: Fundo | null =
    tipoFundo === 'marca' || tipoFundo === 'adesivo'
      ? { tipo: tipoFundo }
      : tipoFundo === 'treino'
        ? imgTreino && { tipo: 'foto', imagem: imgTreino }
        : imgGaleria && { tipo: 'foto', imagem: imgGaleria };

  // Redesenha e já deixa o PNG pronto: o share precisa sair direto do clique.
  useEffect(() => {
    const el = canvas.current;
    if (!el || !recursos || !fundo) return;
    let vivo = true;
    setPronto(false);
    desenharStory(el, dados, { modelo, fundo, logo: recursos.logo });
    canvasParaBlob(el)
      .then((b) => {
        if (!vivo) return;
        blob.current = b;
        setPronto(true);
      })
      .catch(() => vivo && toast('Não foi possível gerar a imagem.'));
    return () => {
      vivo = false;
    };
    // `fundo` muda de identidade a cada render; as dependências reais são as abaixo.
  }, [dados, modelo, tipoFundo, imgTreino, imgGaleria, recursos, toast]);

  const opcoesFundo: OpcaoSegmentado<TipoFundo>[] = [
    ...(urlTreino ? [{ valor: 'treino' as const, rotulo: 'Treino' }] : []),
    { valor: 'galeria', rotulo: 'Minha foto' },
    { valor: 'marca', rotulo: 'Vermelho' },
    { valor: 'adesivo', rotulo: 'Adesivo' },
  ];

  const compartilhar = () => {
    const b = blob.current;
    if (!b) return;
    void compartilharImagem(b, nomeArquivoStory(dados, modelo)).then((r) => {
      setResultado(r);
      if (r === 'baixado')
        toast('Imagem salva. Abra o Instagram e poste nos Stories.', { duracao: 4000 });
    });
  };

  const carregando = !pronto;

  return (
    <div className="flex flex-col gap-3.5">
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const arquivo = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (!arquivo) return;
          imagemDeArquivo(arquivo)
            .then((img) => {
              setImgGaleria(img);
              setTipoFundo('galeria');
            })
            .catch(() => toast('Não deu para abrir essa foto. Tente outra.'));
        }}
      />

      <div
        className={`relative mx-auto aspect-[9/16] h-[min(48dvh,480px)] overflow-hidden rounded-2xl ${tipoFundo === 'adesivo' ? 'bg-[repeating-conic-gradient(#3a3a3a_0_25%,#2a2a2a_0_50%)] bg-[length:24px_24px]' : 'bg-superficie-2'}`}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Prévia do story: ${ROTULO_MODELO[modelo]}, dia ${dados.numeroDia}`}
          className={`size-full transition-opacity duration-200 ${carregando ? 'opacity-60' : ''}`}
        />
        {!fundo && (
          <p className="absolute inset-0 grid place-items-center text-sm font-semibold text-white">
            Carregando foto…
          </p>
        )}
      </div>

      <Segmentado
        rotulo="Modelo do story"
        opcoes={OPCOES_MODELO}
        valor={modelo}
        aoMudar={setModelo}
      />
      <Segmentado
        rotulo="Fundo do story"
        opcoes={opcoesFundo}
        valor={tipoFundo}
        aoMudar={(v) => {
          // "Minha foto" sem foto escolhida abre a galeria (ainda dentro do clique).
          if (v === 'galeria' && !imgGaleria) entrada.current?.click();
          else setTipoFundo(v);
        }}
      />
      {tipoFundo === 'galeria' && imgGaleria && (
        <button
          type="button"
          className="self-center text-[13px] font-semibold text-vermelho-texto underline"
          onClick={() => entrada.current?.click()}
        >
          Trocar foto
        </button>
      )}
      {tipoFundo === 'adesivo' && (
        <p className="text-center text-[13px] text-texto-2">
          Fundo transparente: no Instagram, cole por cima da sua foto.
        </p>
      )}

      <Botao
        larguraTotal
        carregando={carregando}
        icone={<Share2 className="size-5" aria-hidden />}
        onClick={compartilhar}
      >
        Compartilhar no Instagram
      </Botao>
      {marcacao && (
        <Botao
          variante="secundario"
          larguraTotal
          icone={<Copy className="size-4" aria-hidden />}
          onClick={() =>
            void copiarTexto(marcacao).then((ok) =>
              toast(ok ? 'Copiado! Cole no story.' : `Copie à mão: ${marcacao}`, {
                duracao: ok ? 2400 : 6000,
              }),
            )
          }
        >
          Copiar {marcacao}
        </Botao>
      )}
      <p className="text-center text-[12px] text-texto-2">
        No menu, escolha <b>Instagram › Stories</b>. Para valer no desafio, marque o perfil com a
        figurinha de menção.
      </p>

      {resultado && resultado !== 'cancelado' && podeMarcar && (
        <div className="flex items-center gap-3 rounded-2xl bg-superficie-2 p-3.5">
          {resultado === 'baixado' ? (
            <Download className="size-5 shrink-0 text-vermelho-texto" aria-hidden />
          ) : (
            <Check className="size-5 shrink-0 text-vermelho-texto" aria-hidden />
          )}
          <p className="flex-1 text-sm font-semibold">
            {storyPostado ? 'Story de hoje marcado.' : 'Postou? Marque o story de hoje.'}
          </p>
          {!storyPostado && (
            <Botao tamanho="sm" onClick={aoMarcarPostado}>
              Marcar
            </Botao>
          )}
        </div>
      )}
    </div>
  );
}
