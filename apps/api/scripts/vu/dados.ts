// Dados FICTÍCIOS dos VUs (determinísticos pelo número do VU).
import type { AtualizarPerfilInput, Uf } from '@everest/shared';
import { chance, criarAleatorio, escolherUm, inteiroEntre } from './aleatorio';
import { emailDoVu, rotuloVu } from './config';

// prettier-ignore
const PRIMEIROS_NOMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João',
  'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olívia', 'Paulo', 'Rafaela', 'Sérgio', 'Tatiana', 'Vinícius',
  'Yasmin', 'Rodrigo', 'Letícia', 'Matheus', 'Camila', 'Gustavo', 'Beatriz', 'Thiago', 'Juliana', 'André',
] as const;

// prettier-ignore
const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida',
  'Nascimento', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Barbosa', 'Rocha', 'Teixeira', 'Moreira',
] as const;

/** Um bairro real por UF (os 27 estados aparecem). */
export const LOCAIS: readonly { bairro: string; cidade: string; uf: Uf }[] = [
  { bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP' },
  { bairro: 'Copacabana', cidade: 'Rio de Janeiro', uf: 'RJ' },
  { bairro: 'Savassi', cidade: 'Belo Horizonte', uf: 'MG' },
  { bairro: 'Batel', cidade: 'Curitiba', uf: 'PR' },
  { bairro: 'Moinhos de Vento', cidade: 'Porto Alegre', uf: 'RS' },
  { bairro: 'Trindade', cidade: 'Florianópolis', uf: 'SC' },
  { bairro: 'Asa Sul', cidade: 'Brasília', uf: 'DF' },
  { bairro: 'Barra', cidade: 'Salvador', uf: 'BA' },
  { bairro: 'Boa Viagem', cidade: 'Recife', uf: 'PE' },
  { bairro: 'Meireles', cidade: 'Fortaleza', uf: 'CE' },
  { bairro: 'Setor Bueno', cidade: 'Goiânia', uf: 'GO' },
  { bairro: 'Umarizal', cidade: 'Belém', uf: 'PA' },
  { bairro: 'Adrianópolis', cidade: 'Manaus', uf: 'AM' },
  { bairro: 'Jardim Camburi', cidade: 'Vitória', uf: 'ES' },
  { bairro: 'Ponta Verde', cidade: 'Maceió', uf: 'AL' },
  { bairro: 'Ponta Negra', cidade: 'Natal', uf: 'RN' },
  { bairro: 'Tambaú', cidade: 'João Pessoa', uf: 'PB' },
  { bairro: 'Calhau', cidade: 'São Luís', uf: 'MA' },
  { bairro: 'Jóquei', cidade: 'Teresina', uf: 'PI' },
  { bairro: 'Atalaia', cidade: 'Aracaju', uf: 'SE' },
  { bairro: 'Jardim dos Estados', cidade: 'Campo Grande', uf: 'MS' },
  { bairro: 'Goiabeiras', cidade: 'Cuiabá', uf: 'MT' },
  { bairro: 'Plano Diretor Sul', cidade: 'Palmas', uf: 'TO' },
  { bairro: 'Trem', cidade: 'Macapá', uf: 'AP' },
  { bairro: 'Paraviana', cidade: 'Boa Vista', uf: 'RR' },
  { bairro: 'Olaria', cidade: 'Porto Velho', uf: 'RO' },
  { bairro: 'Bosque', cidade: 'Rio Branco', uf: 'AC' },
  { bairro: 'Cambuí', cidade: 'Campinas', uf: 'SP' },
  { bairro: 'Centro', cidade: 'Guaratuba', uf: 'PR' },
  { bairro: 'Icaraí', cidade: 'Niterói', uf: 'RJ' },
];

/** DDD de cada UF (o da capital). */
// prettier-ignore
const DDD_POR_UF: Record<Uf, number> = {
  AC: 68, AL: 82, AP: 96, AM: 92, BA: 71, CE: 85, DF: 61, ES: 27, GO: 62, MA: 98, MT: 65, MS: 67, MG: 31,
  PA: 91, PB: 83, PR: 41, PE: 81, PI: 86, RJ: 21, RN: 84, RS: 51, RO: 69, RR: 95, SC: 48, SP: 11, SE: 79,
  TO: 63,
};

export interface DadosVu {
  numero: number;
  email: string;
  /** "VU 07 Ana Souza": o prefixo deixa os VUs fáceis de achar no painel do admin. */
  nome: string;
  perfil: AtualizarPerfilInput;
}

/**
 * Dados de cadastro fictícios e válidos para o PATCH /me. `hoje` = 'YYYY-MM-DD' (Brasília);
 * a idade fica entre 18 e 59 anos.
 */
export function dadosDoVu(numero: number, hoje: string): DadosVu {
  const rng = criarAleatorio(`dados:${numero}`);
  const rotulo = rotuloVu(numero);
  const nome = `VU ${rotulo} ${escolherUm(rng, PRIMEIROS_NOMES)} ${escolherUm(rng, SOBRENOMES)}`;
  const local = LOCAIS[(numero - 1) % LOCAIS.length]!;
  const anoAtual = Number(hoje.slice(0, 4));
  const idade = inteiroEntre(rng, 19, 59);
  const mes = String(inteiroEntre(rng, 1, 12)).padStart(2, '0');
  const dia = String(inteiroEntre(rng, 1, 28)).padStart(2, '0');
  // Celular "9 0000-NNNN": formato válido, faixa que não é distribuída a linhas reais.
  const whatsapp = `${DDD_POR_UF[local.uf]}90000${String(numero).padStart(4, '0')}`;
  return {
    numero,
    email: emailDoVu(numero),
    nome,
    perfil: {
      nome,
      instagram: `vu_${rotulo}`,
      dataNascimento: `${anoAtual - idade}-${mes}-${dia}`,
      whatsapp,
      bairro: local.bairro,
      cidade: local.cidade,
      uf: local.uf,
      aceitouTermos: true,
      aceitouMarketing: chance(rng, 0.6),
    },
  };
}
