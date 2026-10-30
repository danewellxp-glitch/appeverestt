// Texto da política de privacidade exibido em /privacidade.
// Rascunho no espírito da LGPD (Lei 13.709/2018), baseado no que o app realmente faz
// (docs/FRONTEND.md §4.4 e §9.10). Precisa de aprovação do Anderson (Q8).

export interface SecaoPrivacidade {
  titulo: string;
  paragrafos?: string[];
  itens?: string[];
}

export interface ConteudoPrivacidade {
  titulo: string;
  resumo: string;
  /** Marcador de decisão pendente (o check de lançamento procura por ele). */
  pendencia: string;
  avisoProvisorio: string;
  secoes: SecaoPrivacidade[];
}

export const privacidade: ConteudoPrivacidade = {
  titulo: 'Privacidade',
  resumo:
    'Coletamos o necessário para você participar do Desafio 30 Dias Everest. Seus dados não são vendidos, e só usamos para marketing se você autorizar.',
  pendencia: 'TODO_DECISAO(Q8): texto final a ser aprovado pelo Anderson',
  avisoProvisorio: 'Rascunho. Aguardando o texto oficial do Anderson (Q8).',
  secoes: [
    {
      titulo: 'Quem cuida dos seus dados',
      paragrafos: [
        'O Desafio 30 Dias Everest é organizado pelo embaixador do desafio, que é o responsável (controlador) pelos dados tratados neste app.',
      ],
    },
    {
      titulo: 'O que coletamos',
      itens: [
        'Cadastro: nome completo, e-mail, @ do Instagram, data de nascimento, WhatsApp, bairro, cidade e estado.',
        'Foto do perfil do Google, se você entrar com Google.',
        'Seus check-ins diários: água, exercício, páginas lidas e se o story foi postado.',
        'As 3 fotos de prova de cada dia (água, treino e leitura).',
        'Seu feedback, se você enviar: a nota, os dois textos e se autoriza a divulgação.',
      ],
      paragrafos: [
        'O login é feito pelo Google Firebase: a sua senha fica com o Firebase e o app nunca a vê. A inscrição é paga por Pix direto para o embaixador; não guardamos dados bancários, só a data em que você avisou e a confirmação. O desafio é só para maiores de 18 anos.',
      ],
    },
    {
      titulo: 'Para que usamos',
      itens: [
        'Cadastro: identificar você, conferir a participação e falar com você sobre o desafio.',
        'Check-ins e fotos: calcular o seu progresso, o ranking e a premiação.',
        'Feedback: o embaixador lê para melhorar o desafio. O depoimento só é publicado (com o seu @) se você marcar a autorização.',
        'Marketing (novidades e ofertas da Everest por e-mail, WhatsApp e Instagram): só se você marcar a autorização. Você pode desligar quando quiser em Perfil.',
      ],
    },
    {
      titulo: 'Fotos de prova',
      paragrafos: [
        'Servem só para conferir os requisitos do desafio. Elas não aparecem para outros participantes nem são publicadas. Removemos a localização e outros dados escondidos da imagem quando ela chega, e ela fica num armazenamento privado, aberto só por links que expiram em minutos.',
      ],
    },
    {
      titulo: 'Quem vê',
      itens: [
        'Você vê tudo o que enviou.',
        'O embaixador vê suas fotos e seus dados de cadastro para a conferência.',
        'Os outros participantes veem só seu nome curto (como "Maria S."), sua foto do Google e seus números no ranking. E-mail, WhatsApp e endereço nunca aparecem para eles.',
      ],
    },
    {
      titulo: 'Cookies',
      paragrafos: [
        'Usamos um único cookie de sessão, inacessível a scripts, que mantém você conectado por até 30 dias. Não usamos cookies de publicidade nem de rastreamento de terceiros.',
      ],
    },
    {
      titulo: 'Compartilhamento',
      paragrafos: [
        'Não vendemos nem alugamos seus dados. Eles ficam em provedores de infraestrutura (login, servidor, banco de dados e armazenamento de arquivos) contratados apenas para operar o app.',
      ],
    },
    {
      titulo: 'Por quanto tempo',
      paragrafos: [
        'Enquanto o desafio durar e por mais 90 dias depois do fim, para resolver dúvidas sobre o resultado. Os dados de marketing ficam enquanto a sua autorização estiver ativa.',
      ],
    },
    {
      titulo: 'Seus direitos',
      paragrafos: [
        'Pela LGPD, você pode pedir acesso, correção ou exclusão dos seus dados e revogar autorizações a qualquer momento. Para corrigir, use Perfil, depois Meus dados. Para apagar tudo, use Perfil, depois Excluir minha conta: suas fotos e dados pessoais são apagados, e no ranking você passa a aparecer como "Participante removido".',
      ],
    },
    {
      titulo: 'Mudanças nesta política',
      paragrafos: [
        'Se esta política mudar, a nova versão será publicada nesta página e, se a mudança for relevante, avisaremos os participantes.',
      ],
    },
  ],
};
