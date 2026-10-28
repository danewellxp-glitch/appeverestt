// Texto da política de privacidade exibido em /privacidade.
// Rascunho no espírito da LGPD (Lei 13.709/2018), baseado no que o app realmente faz.

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
  titulo: 'Política de privacidade',
  resumo:
    'Coletamos só o necessário para você participar do Desafio 30 Dias Everest. Seus dados não são vendidos nem usados para publicidade.',
  pendencia: 'TODO_DECISAO(Q8): texto final a ser aprovado pelo Anderson',
  avisoProvisorio: 'Versão provisória — o texto final ainda será aprovado pela organização do desafio.',
  secoes: [
    {
      titulo: 'Quem cuida dos seus dados',
      paragrafos: [
        'O Desafio 30 Dias Everest é organizado pelo embaixador do desafio, que é o responsável (controlador) pelos dados tratados neste app.',
      ],
    },
    {
      titulo: 'Quais dados coletamos',
      itens: [
        'Nome: para identificar você no desafio e no ranking.',
        'E-mail: para o seu login.',
        'Senha: guardada apenas como hash criptográfico (argon2). Ninguém, nem o embaixador, consegue ver a sua senha.',
        'Registros diários: água (ml), exercício, páginas lidas e se o story foi postado.',
        'Fotos de prova: uma foto de água, uma de exercício e uma de leitura por dia.',
      ],
      paragrafos: ['Não pedimos telefone, CPF, endereço nem dados de pagamento.'],
    },
    {
      titulo: 'Fotos de prova',
      itens: [
        'Ao processar cada foto, removemos os metadados (EXIF), inclusive a localização (GPS) que o celular grava.',
        'As fotos ficam em um armazenamento privado e só são abertas por links temporários, que expiram em minutos.',
        'Só você e o embaixador do desafio (para conferir as provas) podem ver as suas fotos. Elas não aparecem no ranking nem para outros participantes.',
      ],
    },
    {
      titulo: 'O que os outros participantes veem',
      paragrafos: [
        'No ranking aparece apenas o seu primeiro nome e a inicial do sobrenome (por exemplo, "Maria S."), junto com os dias concluídos e as sequências. Seu e-mail nunca é exibido.',
      ],
    },
    {
      titulo: 'Para que usamos os dados',
      itens: [
        'Permitir o seu login e manter a sua sessão.',
        'Registrar o seu progresso diário e calcular o ranking e a premiação.',
        'Permitir que o embaixador confira as provas e invalide dias irregulares.',
      ],
      paragrafos: [
        'A base legal é a execução da sua participação no desafio, que você solicita ao se inscrever, e o seu consentimento, dado ao aceitar esta política.',
      ],
    },
    {
      titulo: 'Cookies',
      paragrafos: [
        'Usamos um único cookie de sessão, do tipo httpOnly (inacessível a scripts), que mantém você conectado por até 30 dias. Não usamos cookies de publicidade nem de rastreamento de terceiros.',
      ],
    },
    {
      titulo: 'Compartilhamento',
      paragrafos: [
        'Não vendemos, alugamos nem compartilhamos os seus dados com anunciantes. Eles ficam em provedores de infraestrutura (servidor, banco de dados e armazenamento de arquivos) contratados apenas para operar o app.',
      ],
    },
    {
      titulo: 'Por quanto tempo guardamos',
      paragrafos: [
        'Os dados ficam guardados enquanto durar o desafio e pelo tempo necessário para apurar e divulgar o resultado. Depois disso, você pode pedir a exclusão a qualquer momento.',
      ],
    },
    {
      titulo: 'Seus direitos',
      paragrafos: [
        'Pela LGPD, você pode pedir acesso, correção ou exclusão dos seus dados, além de revogar o seu consentimento. Para isso, fale com o embaixador do desafio pelos canais oficiais (como o Instagram do desafio). Ao excluir a conta, os seus registros e fotos são apagados e você sai do ranking.',
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
