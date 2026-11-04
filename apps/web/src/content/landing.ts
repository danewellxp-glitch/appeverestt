// Textos da landing "/" (página de vendas do desafio) e da tela "Fiquem ligados" (/desafio antes
// do início). Números (dias, vagas, valor, datas, @ e hashtag) vêm do desafio atual (API): aqui só
// ficam os textos e as funções que montam as frases.
//
// O conteúdo que o TT ainda precisa enviar tem o marcador de decisão pendente "(LANDING)" logo acima
// do campo (`node scripts/check-placeholders.mjs` lista todos). Enquanto isso a landing usa textos
// neutros e placeholders desenhados (nunca uma imagem quebrada).

/** Foto servida pelo próprio app: arquivo em apps/web/public/landing/ (ex.: '/landing/tt.jpg'). */
export interface FotoLanding {
  src: string;
  /** Descrição da foto para leitores de tela (obrigatória). */
  alt: string;
}

export interface Pergunta {
  pergunta: string;
  resposta: string;
}

export interface Passo {
  titulo: string;
  texto: string;
}

const numero = new Intl.NumberFormat('pt-BR');

function dias(n: number): string {
  return n === 1 ? '1 dia' : `${numero.format(n)} dias`;
}

// ---------------------------------------------------------------------------------------------
// O TT (embaixador)
// ---------------------------------------------------------------------------------------------

/**
 * Quem é o TT. `apelido` é como o app chama o embaixador nas telas do participante
 * ("o TT confere o Pix", "Quem é o TT").
 */
export const tt: {
  apelido: string;
  nome: string;
  papel: string;
  bio: string[];
  /** @ do Instagram, sem "@". Vazio = sem o link "Seguir no Instagram". */
  instagram: string;
  /** Retrato (4:5, ~1000 px de largura) em public/landing/. null = placeholder desenhado. */
  foto: FotoLanding | null;
} = {
  apelido: 'TT',
  // TODO_DECISAO(LANDING): nome como deve aparecer, papel (1 linha) e bio (2 ou 3 parágrafos curtos).
  nome: 'TT',
  papel: 'Embaixador do Desafio 30 Dias Everest',
  bio: [
    'O TT é o embaixador do Desafio 30 Dias Everest. É ele quem acompanha a turma de perto, confere as provas de cada dia e confirma as inscrições.',
    'E ele não só organiza: faz o desafio junto com você, com as mesmas regras e no mesmo ranking.',
  ],
  // TODO_DECISAO(LANDING): @ do Instagram do TT (sem "@").
  instagram: '',
  // TODO_DECISAO(LANDING): foto do TT, ex.: { src: '/landing/tt.jpg', alt: 'TT sorrindo depois de um treino' }.
  foto: null,
};

// ---------------------------------------------------------------------------------------------
// Fotos (galeria)
// ---------------------------------------------------------------------------------------------

/**
 * Galeria da landing (treinos, turma, bastidores). Arquivos em public/landing/, ~1200 px no lado
 * maior (.webp ou .jpg). A 1ª foto sai grande (paisagem); as outras em retrato 3:4.
 * Vazio = placeholders com os temas abaixo.
 * TODO_DECISAO(LANDING): fotos reais, ex.: [{ src: '/landing/turma.webp', alt: 'Turma reunida no fim do treino' }].
 */
export const galeria: FotoLanding[] = [];

/** Placeholders da galeria vazia (um por tema). */
export const galeriaVazia = {
  temas: ['A turma', 'Treino', 'Leitura', 'Água'],
  aviso: 'As fotos das turmas chegam aqui em breve.',
} as const;

// ---------------------------------------------------------------------------------------------
// Contatos
// ---------------------------------------------------------------------------------------------

/** Links do WhatsApp. Vazio = o botão correspondente não aparece. Só links https://. */
export const whatsapp = {
  // TODO_DECISAO(LANDING): convite do grupo dos participantes confirmados (https://chat.whatsapp.com/...).
  /** Botão "Entrar no grupo do WhatsApp" da tela "Fiquem ligados" (só para pagamento confirmado). */
  grupoParticipantes: '',
  // TODO_DECISAO(LANDING): canal ou lista pública de avisos de novas turmas (opcional).
  /** Para visitantes quando não há desafio aberto ("Receber o aviso no WhatsApp"). */
  avisos: '',
};

/**
 * @ do Instagram do Everest (sem "@") usado quando não há desafio ativo. Com desafio, vale o @
 * configurado nele no painel.
 * TODO_DECISAO(LANDING): confirmar o @ oficial.
 */
export const instagramPadrao = '';

// ---------------------------------------------------------------------------------------------
// Seções da landing
// ---------------------------------------------------------------------------------------------

export const hero = {
  /** Linhas do título; a última sai em vermelho. */
  titulo: ['A sua', 'melhor', 'versão'] as [string, string, string],
  subtitulo: (totalDias: number) =>
    `Construindo a sua melhor versão para 2027. Água, treino, leitura, prova do dia e story, todos os dias, por ${dias(totalDias)}.`,
  saibaMais: 'Conheça o desafio',
  /** Selo acima do botão para quem já tem vaga. */
  seloVaga: (vaga: number, confirmada: boolean) =>
    confirmada ? `Você está dentro · vaga nº ${vaga}` : `Vaga nº ${vaga} reservada para você`,
};

export const secaoDesafio = {
  eyebrow: 'O desafio',
  titulo: '5 hábitos. Todo dia.',
  texto: (totalDias: number) =>
    `Durante ${dias(totalDias)} seguidos você cumpre os mesmos 5 hábitos e registra tudo no app, com foto de prova. O dia só conta com os 5 feitos, e cada dia concluído sobe a sua escalada no ranking.`,
  numeros: (totalDias: number, totalVagas: number) => [
    { valor: numero.format(totalDias), rotulo: totalDias === 1 ? 'dia' : 'dias seguidos' },
    { valor: '5', rotulo: 'hábitos por dia' },
    { valor: numero.format(totalVagas), rotulo: totalVagas === 1 ? 'vaga' : 'vagas' },
  ],
  tituloHabitos: 'Todo dia',
  tituloPremio: 'Prêmio',
  rotuloDesempate: 'Desempate',
  tituloVideo: (apelido: string) => `O ${apelido} explica`,
};

export const secaoTT = {
  eyebrow: 'Quem puxa a fila',
  titulo: (apelido: string) => `Quem é o ${apelido}`,
  seguir: (handle: string) => `Seguir @${handle} no Instagram`,
};

export const secaoFotos = {
  eyebrow: 'Na prática',
  titulo: 'Fotos',
};

export const secaoComoFunciona = {
  eyebrow: 'Passo a passo',
  titulo: 'Como funciona',
};

/**
 * Os passos, do cadastro ao check-in. `valor` = "R$ 50,00" (null quando o Pix não está
 * configurado neste ambiente).
 */
export function passosComoFunciona(p: {
  valor: string | null;
  totalVagas: number;
  totalDias: number;
  apelido: string;
}): Passo[] {
  return [
    { titulo: 'Crie sua conta', texto: 'Com o Google ou com e-mail, e complete seus dados (inclusive o WhatsApp).' },
    // Mesma ordem do app: a vaga é reservada ao completar o cadastro, antes do Pix.
    {
      titulo: 'Vaga reservada',
      texto: `Ao completar o cadastro, seu lugar entre os ${numero.format(p.totalVagas)} desafiados já fica reservado, com número.`,
    },
    {
      titulo: p.valor ? `Faça o Pix de ${p.valor}` : 'Faça o Pix da inscrição',
      texto: 'O QR code e o Pix copia e cola aparecem no app. Pagou? Toque em “Já fiz o pagamento”.',
    },
    {
      titulo: `O ${p.apelido} confirma o pagamento`,
      texto: 'Ele confere o Pix manualmente e libera o seu acesso. Você vê a confirmação no app.',
    },
    {
      titulo: 'Fiquem ligados',
      texto: 'Até o primeiro dia, todos os avisos chegam pelo WhatsApp que você cadastrou.',
    },
    {
      titulo: `${dias(p.totalDias)} de check-in`,
      texto: 'Todo dia você marca os 5 hábitos no app, envia as 3 fotos e sobe no ranking.',
    },
  ];
}

export const secaoPerguntas = {
  eyebrow: 'Dúvidas',
  titulo: 'Perguntas frequentes',
};

/** FAQ curto. `valor` = "R$ 50,00" ou null (Pix não configurado). */
export function perguntasFrequentes(p: {
  valor: string | null;
  totalVagas: number;
  apelido: string;
}): Pergunta[] {
  return [
    {
      pergunta: 'Quanto custa?',
      resposta: p.valor
        ? `A inscrição é de ${p.valor}, paga uma única vez via Pix, direto no app.`
        : 'A inscrição é paga uma única vez via Pix, direto no app.',
    },
    {
      pergunta: 'Minha vaga fica garantida antes de o pagamento ser confirmado?',
      resposta: `Sim. Assim que você se inscreve, sua vaga entre as ${numero.format(p.totalVagas)} fica reservada. O ${p.apelido} confere o Pix e libera o acesso; se o pagamento não for feito, a vaga volta para a fila.`,
    },
    {
      pergunta: 'Qualquer exercício vale?',
      resposta: 'Vale. Academia, corrida, caminhada, esporte, aula em casa: o importante é treinar todo dia e mandar a foto.',
    },
    {
      pergunta: 'E se eu perder um dia?',
      resposta: 'Você continua no desafio. O dia perdido só não conta: no ranking vale quem concluir mais dias.',
    },
    {
      pergunta: 'Preciso baixar algum app?',
      resposta: 'Não. O desafio roda neste site, direto no navegador do celular. Se quiser, adicione à tela inicial.',
    },
  ];
}

export const fechamento = {
  eyebrow: 'Vagas limitadas',
  titulo: (restantes: number) => (restantes === 1 ? 'Resta 1 vaga' : `Restam ${numero.format(restantes)} vagas`),
  tituloInscrito: 'Você já está dentro',
  tituloBloqueado: (esgotado: boolean) => (esgotado ? 'Turma completa' : 'Inscrições fechadas'),
  texto: (ocupadas: number, total: number, inicio: string) =>
    `${numero.format(ocupadas)} de ${numero.format(total)} lugares já têm dono. O desafio começa em ${inicio}.`,
  textoInscrito: (vaga: number, inicio: string) =>
    `Sua vaga nº ${vaga} está garantida. O desafio começa em ${inicio}.`,
  tituloSemDesafio: 'O próximo desafio vem aí',
};

export const rodape = {
  regras: 'Regras completas',
  privacidade: 'Política de privacidade',
};

/** Aviso no lugar do "Quero participar" quando não há desafio ativo. */
export const semDesafio = {
  titulo: 'Fiquem ligados!',
  texto: 'As inscrições do próximo desafio ainda não abriram. O aviso sai primeiro no Instagram.',
  textoComWhatsapp: 'As inscrições do próximo desafio ainda não abriram. O aviso sai primeiro no Instagram e no WhatsApp.',
  instagram: (handle: string) => `Seguir @${handle} no Instagram`,
  whatsapp: 'Receber o aviso no WhatsApp',
};

// ---------------------------------------------------------------------------------------------
// "Fiquem ligados" (/desafio com o pagamento confirmado e o desafio ainda não iniciado)
// ---------------------------------------------------------------------------------------------

export const fiqueLigado = {
  eyebrow: (vaga: number | null) => (vaga === null ? 'Inscrição confirmada' : `Vaga nº ${vaga} · inscrição confirmada`),
  titulo: 'Fiquem ligados!',
  rotuloData: 'O desafio começa em',
  /** n = dias até o início. */
  faltam: (n: number) => (n <= 0 ? 'começa hoje' : n === 1 ? 'começa amanhã' : `faltam ${numero.format(n)} dias`),
  tituloWhatsapp: 'Todas as informações serão enviadas pelo WhatsApp',
  textoWhatsapp: 'Grupo, horários e o aviso do primeiro dia chegam por lá. Fique de olho no número cadastrado',
  semWhatsapp: 'Cadastre seu WhatsApp no perfil para receber os avisos do desafio.',
  corrigirWhatsapp: 'Número errado? Atualize no perfil',
  cadastrarWhatsapp: 'Cadastrar meu WhatsApp',
  grupo: 'Entrar no grupo do WhatsApp',
  tituloEnquantoIsso: 'Enquanto isso',
  regras: 'Leia as regras completas',
  regrasTexto: 'O vídeo e os detalhes de cada hábito.',
  preparar: 'Prepare a sua rotina',
  prepararTexto: 'Separe o livro, a garrafa de água e o horário do treino.',
  seguir: (handle: string) => `Siga @${handle}`,
  seguirTexto: 'Os stories do desafio marcam esse perfil.',
};
