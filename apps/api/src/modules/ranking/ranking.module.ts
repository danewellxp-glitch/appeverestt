import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';

@Module({
  controllers: [RankingController, FeedController],
  providers: [RankingService, FeedService],
  exports: [RankingService, FeedService],
})
export class RankingModule {}
