import { ApiError } from '../../lib/api';

/**
 * PUT direto no storage (URL assinada) via XMLHttpRequest, para ter progresso de upload.
 * Envia exatamente os headers devolvidos pela API (o Content-Type faz parte da assinatura).
 */
export function enviarArquivo(
  url: string,
  headers: Record<string, string>,
  corpo: Blob,
  aoProgresso: (porcentagem: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    // Origem diferente (storage): sem cookies.
    xhr.withCredentials = false;
    for (const [nome, valor] of Object.entries(headers)) xhr.setRequestHeader(nome, valor);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) aoProgresso(Math.min(100, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        aoProgresso(100);
        resolve();
        return;
      }
      reject(
        new ApiError(
          'ERRO_INTERNO',
          xhr.status === 403
            ? 'O link de envio expirou. Tente enviar a foto de novo.'
            : 'O envio da foto falhou. Tente de novo.',
          xhr.status,
        ),
      );
    };
    xhr.onerror = () => reject(new ApiError('REDE', 'Falha de conexão ao enviar a foto. Tente de novo.', 0));
    xhr.ontimeout = xhr.onerror;
    xhr.send(corpo);
  });
}
