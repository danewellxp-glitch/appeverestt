import { Download, Link2, Share } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { FolhaInferior } from '../../components/ui/FolhaInferior';
import { Segmentado } from '../../components/ui/Segmentado';
import { useToast } from '../../components/ui/Toast';
import { copiarTexto } from '../desafio/navegacao';
import { ehIOS, useInstallPrompt } from './useInstallPrompt';

function ehLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

/**
 * Link público do app. TODO_DECISAO(Q2): VITE_APP_URL ainda não definido para produção.
 * Se o env apontar para localhost mas o app estiver publicado, usa a origem atual.
 */
export function urlDoApp(): string {
  const origem = window.location.origin;
  const doEnv = import.meta.env.VITE_APP_URL?.trim();
  if (!doEnv) return origem;
  if (ehLocal(doEnv) && !ehLocal(origem)) return origem;
  return doEnv;
}

type Sistema = 'ios' | 'android';

const OPCOES_SISTEMA = [
  { valor: 'ios', rotulo: 'iPhone' },
  { valor: 'android', rotulo: 'Android' },
] as const;

const PASSO =
  'flex items-center gap-3 text-sm before:grid before:size-7 before:shrink-0 before:place-items-center before:rounded-full before:bg-vermelho before:text-[13px] before:font-bold before:text-sobre-vermelho before:content-[counter(passo)] [counter-increment:passo]';

/**
 * Folha "Instalar o app" (docs/FRONTEND.md §10, §12 R10): passo a passo do iPhone (Safari não tem
 * prompt de instalação) e, no Android, o prompt nativo quando o navegador oferece.
 */
export function FolhaInstalar({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const { podeInstalar, instalar } = useInstallPrompt();
  const { toast } = useToast();
  const [sistema, setSistema] = useState<Sistema>(() => (ehIOS() ? 'ios' : 'android'));

  async function instalarAgora() {
    const r = await instalar();
    if (r === 'aceito') {
      aoFechar();
      toast('Instalando o Everest…');
    }
  }

  async function copiarLink() {
    const url = urlDoApp();
    const ok = await copiarTexto(url);
    toast(ok ? 'Link copiado! Abra no navegador do celular.' : `Abra no celular: ${url}`, { duracao: ok ? 2400 : 8000 });
  }

  return (
    <FolhaInferior aberta={aberta} aoFechar={aoFechar} titulo="Instalar o app">
      <p className="text-[13px] text-texto-2">Fica na tela inicial, abre em tela cheia e funciona como um app.</p>
      <Segmentado opcoes={OPCOES_SISTEMA} valor={sistema} aoMudar={setSistema} rotulo="Sistema do celular" />
      {sistema === 'ios' ? (
        <>
          <ol className="grid gap-2.5 [counter-reset:passo]">
            <li className={PASSO}>
              <span>
                No Safari, toque em <Share className="inline size-4 align-[-3px]" aria-hidden /> Compartilhar
              </span>
            </li>
            <li className={PASSO}>Escolha &quot;Adicionar à Tela de Início&quot;</li>
            <li className={PASSO}>Toque em Adicionar</li>
          </ol>
          <Botao variante="secundario" larguraTotal onClick={aoFechar}>
            Entendi
          </Botao>
        </>
      ) : podeInstalar ? (
        <>
          <p className="text-sm">O Chrome pede a instalação direto. É só confirmar.</p>
          <Botao larguraTotal icone={<Download className="size-5" aria-hidden />} onClick={() => void instalarAgora()}>
            Instalar agora
          </Botao>
        </>
      ) : (
        <>
          <ol className="grid gap-2.5 [counter-reset:passo]">
            <li className={PASSO}>No Chrome, abra o menu ⋮</li>
            <li className={PASSO}>Escolha &quot;Instalar app&quot; ou &quot;Adicionar à tela inicial&quot;</li>
            <li className={PASSO}>Confirme</li>
          </ol>
          <Botao variante="secundario" larguraTotal onClick={aoFechar}>
            Entendi
          </Botao>
        </>
      )}
      <button
        type="button"
        onClick={() => void copiarLink()}
        className="mx-auto inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4"
      >
        <Link2 className="size-4" aria-hidden />
        Copiar o link do app
      </button>
    </FolhaInferior>
  );
}
