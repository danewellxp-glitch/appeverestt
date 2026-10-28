import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';
import { AppConfig } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configurarApp(app);
  const config = app.get(AppConfig);
  const porta = config.get('PORT');
  await app.listen(porta);
  Logger.log(`API ouvindo em http://localhost:${porta}/api`, 'Bootstrap');
  if (!config.producao) Logger.log(`Swagger em http://localhost:${porta}/api/docs`, 'Bootstrap');
}

void bootstrap();
