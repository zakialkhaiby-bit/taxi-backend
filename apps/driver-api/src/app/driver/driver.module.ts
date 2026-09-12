import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverEntity, TaxiOrderEntity } from '@ridy/database';
import { DriverService } from './driver.service';
import { RedisHelpersModule } from '@ridy/database';
import { UploadModule } from '../upload/upload.module';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { DriverResolver } from './driver.resolver';
import { CronJobService } from './cron-job.service';

@Module({
  imports: [
    RedisHelpersModule,
    UploadModule,
    TimesheetModule,
    TypeOrmModule.forFeature([DriverEntity, TaxiOrderEntity]),
  ],
  providers: [DriverService, DriverResolver, CronJobService],
  exports: [DriverService],
})
export class DriverModule {}
