import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { DriverService } from '../driver/driver.service';
import { REDIS } from '@ridy/database';
import { RedisClientType } from 'redis';

@Injectable()
export class CronJobService {
  constructor(
    private driverService: DriverService,
    @Inject(REDIS) readonly redisService: RedisClientType,
  ) {}

  @Interval(600_000)
  async cronTask() {
    const logger = new Logger(CronJobService.name);
    const ts = Date.now();
    // Driver Locations Expire Time If Not Updated, 10 Minutes By Default
    const tsDriverMaxTime = ts - 10 * 60_000;
    const expiredDrivers: number[] = (
      await this.redisService.zRangeByScore(
        'driver:lastSeen',
        0,
        tsDriverMaxTime,
      )
    ).map((str) => parseInt(str));
    Logger.debug(`Found ${expiredDrivers.length} expired drivers`);
    // Expiring drivers locations with outdated location
    if (
      expiredDrivers.length > 0 &&
      process.env.DRIVERS_ALWAYS_ON?.toLowerCase() != 'true'
    ) {
      logger.debug(
        `Expiring ${expiredDrivers.length} drivers with outdated locations`,
      );
      this.driverService.expireDriverStatus(expiredDrivers);
    }
  }
}
