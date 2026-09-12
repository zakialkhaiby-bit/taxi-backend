import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverTimesheetEntity } from '@ridy/database';
import { TimesheetService } from './timesheet.service';

@Module({
  imports: [TypeOrmModule.forFeature([DriverTimesheetEntity])],
  providers: [TimesheetService],
  exports: [TimesheetService],
})
export class TimesheetModule {}
