import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { OriginMiddleware } from './common/middleware/origin.middleware';
import { AppConfig } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { DesafiosModule } from './modules/desafios/desafios.module';
import { DiasModule } from './modules/dias/dias.module';
import { FotosModule } from './modules/fotos/fotos.module';
import { HealthModule } from './modules/health/health.module';
import { InscricoesModule } from './modules/inscricoes/inscricoes.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.service';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        skipIf: () => !config.get('THROTTLE_ATIVO'),
      }),
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuthModule,
    DesafiosModule,
    InscricoesModule,
    DiasModule,
    FotosModule,
    RankingModule,
    AdminModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(OriginMiddleware).forRoutes('*path');
  }
}
