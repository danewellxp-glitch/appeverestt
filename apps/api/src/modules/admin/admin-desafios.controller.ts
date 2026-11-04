import { Body, Controller, Get, Header, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  atualizarDesafioSchema,
  criarDesafioSchema,
  type AdminDesafioConfig,
  type AdminDesafiosResposta,
  type AdminMetricas,
  type AtualizarDesafioInput,
  type CriarDesafioInput,
} from '@everest/shared';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import { AdminDesafiosService } from './desafios-admin.service';
import { MetricasService } from './metricas.service';

const EXEMPLO_DESAFIO = {
  id: 'ckx3',
  slug: 'desafio-30-everest',
  nome: 'Desafio 30 Dias Everest',
  dataInicio: '2026-11-01',
  dataFim: '2026-11-30',
  totalDias: 30,
  totalVagas: 50,
  instagramHandle: 'everest',
  hashtag: 'DESAFIO30EVEREST',
  timezone: 'America/Sao_Paulo',
  inscricoesAbertas: true,
  embaixadorOcupaVaga: true,
  ativo: true,
  status: 'NAO_INICIADO',
  diaAtual: null,
  vagasOcupadas: 12,
  totalInscritos: 12,
  temCheckins: false,
  criadoEm: '2026-10-28T00:46:14.000Z',
} satisfies AdminDesafioConfig;

const EXEMPLO_METRICAS = {
  geradoEm: '2026-11-04T21:10:00.000Z',
  desafio: {
    slug: 'desafio-30-everest',
    nome: 'Desafio 30 Dias Everest',
    dataInicio: '2026-11-01',
    dataFim: '2026-11-30',
    totalDias: 30,
    diaAtual: 4,
    status: 'EM_ANDAMENTO',
    totalVagas: 50,
    valorInscricaoCentavos: 5000,
  },
  funil: { contas: 80, cadastrosCompletos: 52, inscritos: 40, informaram: 35, confirmados: 33 },
  vagas: { total: 50, ocupadas: 40, livres: 10 },
  receita: { confirmadaCentavos: 160000, aguardandoConferenciaCentavos: 10000, pendenteCentavos: 25000 },
  pagamentos: { aguardandoConferencia: 2, horasMediasAteConfirmar: 5.3, horasEsperaMaisAntiga: 20.5 },
  inscricoesPorData: [{ data: '2026-10-20', inscricoes: 9, confirmacoes: 4 }],
  adesaoPorDia: [{ dia: 1, data: '2026-11-01', ativos: 33, comCheckin: 31, concluidos: 28, invalidados: 1 }],
  requisitos: [{ requisito: 'AGUA', cumpridos: 25, total: 30 }],
  invictosPorDia: [{ dia: 1, participantes: 28 }],
  distribuicaoDiasConcluidos: [{ dias: 0, participantes: 2 }],
  checkinsPorHora: [{ hora: 21, checkins: 14 }],
  conferencia: { concluidos: 90, conferidos: 70, aguardando: 20, invalidados: 2 },
  emRisco: [
    {
      participanteId: 'ckx1',
      nome: 'Maria Souza Lima',
      whatsapp: '11987654321',
      diasSemConcluir: 2,
      diasConcluidos: 1,
      ultimoDiaConcluido: 1,
    },
  ],
  perfil: {
    total: 40,
    faixasEtarias: [{ faixa: '25–34', participantes: 18 }],
    cidades: [{ cidade: 'São Paulo', uf: 'SP', participantes: 22 }],
    aceitaramMarketing: 15,
  },
  totais: { aguaLitros: 312.5, paginasLidas: 1450, treinos: 95, stories: 90, fotos: 270, diasConcluidos: 90 },
  feedback: { respostas: 0, notaMedia: null, distribuicao: [{ nota: 5, respostas: 0 }], autorizamDivulgacao: 0 },
} satisfies AdminMetricas;

/** Painel do admin: configuração dos desafios e indicadores. */
@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/desafios')
export class AdminDesafiosController {
  constructor(
    private readonly desafios: AdminDesafiosService,
    private readonly metricasService: MetricasService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Todos os desafios: o ativo primeiro, depois do mais novo (data de início) ao mais antigo.',
    schema: { example: { desafios: [EXEMPLO_DESAFIO] } satisfies AdminDesafiosResposta },
  })
  listar(): Promise<AdminDesafiosResposta> {
    return this.desafios.listar();
  }

  @Post()
  @ApiZodBody(criarDesafioSchema, {
    slug: 'desafio-30-everest-2027',
    nome: 'Desafio 30 Dias Everest 2027',
    dataInicio: '2027-01-04',
    instagramHandle: 'everest',
    totalVagas: 50,
    ativar: false,
  })
  @ApiCreatedResponse({
    description: 'Desafio criado. `ativar: true` desativa os outros (só um desafio ativo por vez); o padrão é false.',
    schema: { example: { ...EXEMPLO_DESAFIO, vagasOcupadas: 0, totalInscritos: 0 } satisfies AdminDesafioConfig },
  })
  @ApiConflictResponse({ description: 'DESAFIO_JA_EXISTE: já há um desafio com esse slug.' })
  criar(@Body(new ZodValidationPipe(criarDesafioSchema)) body: CriarDesafioInput): Promise<AdminDesafioConfig> {
    return this.desafios.criar(body);
  }

  @Get(':slug')
  @ApiOkResponse({ schema: { example: EXEMPLO_DESAFIO } })
  @ApiNotFoundResponse({ description: 'NAO_ENCONTRADO.' })
  obter(@Param('slug') slug: string): Promise<AdminDesafioConfig> {
    return this.desafios.obter(slug);
  }

  @Patch(':slug')
  @ApiZodBody(atualizarDesafioSchema, { inscricoesAbertas: false })
  @ApiOkResponse({
    description:
      'Muda qualquer campo (pelo menos um). Valores iguais aos atuais são aceitos. `ativo: true` desativa os ' +
      'outros desafios; `ativo: false` deixa o app sem desafio ativo.',
    schema: { example: { ...EXEMPLO_DESAFIO, inscricoesAbertas: false } },
  })
  @ApiConflictResponse({
    description:
      'DESAFIO_NAO_EDITAVEL: data de início ou total de dias com check-ins, ou total de vagas abaixo da ' +
      'maior vaga ocupada (`campos` aponta o campo).',
  })
  @ApiNotFoundResponse({ description: 'NAO_ENCONTRADO.' })
  atualizar(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(atualizarDesafioSchema)) body: AtualizarDesafioInput,
  ): Promise<AdminDesafioConfig> {
    return this.desafios.atualizar(slug, body);
  }

  @Get(':slug/metricas')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({
    description:
      'Indicadores do painel (datas e horas no fuso do desafio). Ativos = pagamento confirmado e conta não ' +
      'excluída. As listas do exemplo estão encurtadas.',
    schema: { example: EXEMPLO_METRICAS },
  })
  @ApiNotFoundResponse({ description: 'NAO_ENCONTRADO.' })
  metricas(@Param('slug') slug: string): Promise<AdminMetricas> {
    return this.metricasService.metricas(slug);
  }
}
