import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ErroApiFilter } from './common/filters/erro-api.filter';
import { AppConfig } from './config/app-config.service';
import { COOKIE_SESSAO } from './modules/auth/sessao';

/** Configuração HTTP compartilhada entre main.ts e os testes e2e. */
export function configurarApp(app: NestExpressApplication): void {
  const config = app.get(AppConfig);

  app.setGlobalPrefix('api');
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: config.producao ? undefined : false }));
  app.use(cookieParser());
  app.useGlobalFilters(new ErroApiFilter());
  app.enableShutdownHooks();

  if (!config.producao) {
    app.enableCors({ origin: config.get('WEB_ORIGIN'), credentials: true });

    const doc = new DocumentBuilder()
      .setTitle('Everest Desafio API')
      .setDescription('API do Desafio 30 Dias Everest. Erros sempre no formato { codigo, mensagem }.')
      .setVersion('0.1.0')
      .addCookieAuth(COOKIE_SESSAO)
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }
}
