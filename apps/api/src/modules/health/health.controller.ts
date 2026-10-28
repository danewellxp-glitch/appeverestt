import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/redis.module';

type Estado = 'ok' | 'erro';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  @ApiOkResponse({ schema: { example: { db: 'ok', redis: 'ok' } } })
  async verificar(@Res({ passthrough: true }) res: Response): Promise<{ db: Estado; redis: Estado }> {
    const db: Estado = await this.prisma
      .$queryRaw`SELECT 1`.then((): Estado => 'ok')
      .catch((): Estado => 'erro');
    const redis: Estado = (await this.cache.ping()) ? 'ok' : 'erro';
    if (db !== 'ok' || redis !== 'ok') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { db, redis };
  }
}
