import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverTimesheetEntity } from '@ridy/database';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class TimesheetService {
  constructor(
    @InjectRepository(DriverTimesheetEntity)
    private timesheetRepository: Repository<DriverTimesheetEntity>,
  ) {}

  async goOnline(driverId: number): Promise<DriverTimesheetEntity> {
    const timesheet = this.timesheetRepository.create({
      driverId,
      startTime: new Date(),
    });
    return this.timesheetRepository.save(timesheet);
  }

  async goOffline(driverId: number): Promise<DriverTimesheetEntity | null> {
    const timesheet = await this.timesheetRepository.findOne({
      where: { driverId: driverId, endTime: IsNull() },
      order: { startTime: 'DESC' },
    });
    if (!timesheet) {
      return null;
    }
    timesheet.endTime = new Date();
    return this.timesheetRepository.save(timesheet);
  }
}
