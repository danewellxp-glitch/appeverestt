import {
  CABECALHO_PARTICIPANTES,
  celulaCsv,
  csvParticipantes,
  formatarData,
  formatarDataHora,
  formatarWhatsapp,
  montarCsv,
  nomeArquivoCsv,
  type LinhaParticipanteCsv,
} from './csv';

const TZ = 'America/Sao_Paulo';

const LINHA: LinhaParticipanteCsv = {
  vagaNumero: 3,
  nome: 'Maria Souza Lima',
  email: 'maria@exemplo.com',
  instagram: 'maria.lima',
  whatsapp: '11987654321',
  dataNascimento: new Date('1995-04-12T00:00:00Z'),
  bairro: 'Pinheiros',
  cidade: 'São Paulo',
  uf: 'SP',
  dataInscricao: new Date('2026-10-20T15:05:00Z'),
  pagamentoStatus: 'CONFIRMADO',
  pagamentoInformadoEm: new Date('2026-10-20T15:10:00Z'),
  pagamentoConfirmadoEm: new Date('2026-10-21T01:30:00Z'),
  diasConcluidos: 4,
  diasInvalidados: 1,
  aceitouMarketing: true,
  notaFeedback: 5,
  autorizaDivulgacao: false,
  contaExcluida: false,
};

describe('celulaCsv', () => {
  it('vazio, números, booleanos e texto simples', () => {
    expect(celulaCsv(null)).toBe('');
    expect(celulaCsv(undefined)).toBe('');
    expect(celulaCsv(12)).toBe('12');
    expect(celulaCsv(true)).toBe('sim');
    expect(celulaCsv(false)).toBe('não');
    expect(celulaCsv('São Paulo')).toBe('São Paulo');
  });

  it('aspas, separador e quebras de linha vão entre aspas com "" dobradas', () => {
    expect(celulaCsv('Ana "Aninha"')).toBe('"Ana ""Aninha"""');
    expect(celulaCsv('a;b')).toBe('"a;b"');
    expect(celulaCsv('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"');
  });

  it('protege contra injeção de fórmula (= + - @ TAB CR)', () => {
    expect(celulaCsv('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(celulaCsv('+5511')).toBe("'+5511");
    expect(celulaCsv('-2')).toBe("'-2");
    expect(celulaCsv('@SOMA(A1)')).toBe("'@SOMA(A1)");
    expect(celulaCsv('\tx')).toBe("'\tx");
    expect(celulaCsv('\rx')).toBe('"\'\rx"');
  });
});

describe('formatos', () => {
  it('WhatsApp com DDD (celular e fixo)', () => {
    expect(formatarWhatsapp('11987654321')).toBe('(11) 98765-4321');
    expect(formatarWhatsapp('1187654321')).toBe('(11) 8765-4321');
    expect(formatarWhatsapp('123')).toBe('123');
    expect(formatarWhatsapp(null)).toBeNull();
  });

  it('datas dd/mm/aaaa e dd/mm/aaaa HH:mm no fuso do desafio', () => {
    expect(formatarData(new Date('1995-04-12T00:00:00Z'))).toBe('12/04/1995');
    // 01:30 UTC = 22:30 do dia anterior em São Paulo (UTC−3)
    expect(formatarDataHora(new Date('2026-10-21T01:30:00Z'), TZ)).toBe('20/10/2026 22:30');
    expect(formatarDataHora(null, TZ)).toBeNull();
  });

  it('nome do arquivo sem caracteres perigosos', () => {
    expect(nomeArquivoCsv('desafio-30-everest')).toBe('participantes-desafio-30-everest.csv');
    expect(nomeArquivoCsv('a"b\r\n/../c')).toBe('participantes-abc.csv');
    expect(nomeArquivoCsv('"')).toBe('participantes-desafio.csv');
  });
});

describe('csvParticipantes', () => {
  it('BOM, cabeçalho, separador ";" e CRLF', () => {
    const csv = csvParticipantes([LINHA], TZ);
    expect(csv.startsWith('﻿')).toBe(true);
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas).toHaveLength(3); // cabeçalho, 1 linha, vazio depois do último CRLF
    expect(linhas[2]).toBe('');
    expect(linhas[0]).toBe(CABECALHO_PARTICIPANTES.join(';'));
    expect(linhas[1]).toBe(
      '3;Maria Souza Lima;maria@exemplo.com;maria.lima;(11) 98765-4321;12/04/1995;Pinheiros;São Paulo;SP;' +
        '20/10/2026 12:05;confirmado;20/10/2026 12:10;20/10/2026 22:30;4;1;sim;5;não;não',
    );
  });

  it('conta excluída: sem e-mail, campos vazios e "sim" na última coluna', () => {
    const csv = csvParticipantes(
      [
        {
          ...LINHA,
          nome: 'Participante removido',
          email: 'removido+x@everest.invalid',
          instagram: null,
          whatsapp: null,
          dataNascimento: null,
          bairro: null,
          cidade: null,
          uf: null,
          aceitouMarketing: false,
          notaFeedback: null,
          autorizaDivulgacao: null,
          pagamentoStatus: 'PENDENTE',
          pagamentoInformadoEm: null,
          pagamentoConfirmadoEm: null,
          contaExcluida: true,
        },
      ],
      TZ,
    );
    expect(csv.split('\r\n')[1]).toBe(
      '3;Participante removido;;;;;;;;20/10/2026 12:05;pendente;;;4;1;não;;;sim',
    );
  });

  it('montarCsv sem linhas = só BOM + cabeçalho', () => {
    expect(montarCsv(['a', 'b'], [])).toBe('﻿a;b\r\n');
  });
});
