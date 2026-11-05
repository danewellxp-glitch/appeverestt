import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { CutucadaService } from './cutucada.service';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { TreinosService } from './treinos.service';
import { TurmaController } from './turma.controller';
import { TurmaService } from './turma.service';

@Module({
  // Cutucada (R23) envia push; o PushModule não depende do ranking (sem import circular).
  imports: [PushModule],
  controllers: [RankingController, FeedController, TurmaController],
  providers: [RankingService, FeedService, TurmaService, CutucadaService, TreinosService],
  exports: [RankingService, FeedService],
})
export class RankingModule {}
