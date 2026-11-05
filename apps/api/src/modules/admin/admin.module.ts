import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { AdminDesafiosController } from './admin-desafios.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDesafiosService } from './desafios-admin.service';
import { MetricasService } from './metricas.service';

@Module({
  imports: [PushModule],
  controllers: [AdminController, AdminDesafiosController],
  providers: [AdminService, AdminDesafiosService, MetricasService],
})
export class AdminModule {}
