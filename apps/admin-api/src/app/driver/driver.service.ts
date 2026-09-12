import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DriverStatus,
  DriverTimesheetEntity,
  Gender,
  Point,
} from '@ridy/database';
import { DriverEntity } from '@ridy/database';
import { DriverRedisService } from '@ridy/database';
import { Between, DeleteResult, Repository } from 'typeorm';
import { OnlineDriver, OnlineDriverWithData } from './dto/driver-location.dto';
import { FeedbackParameterAggregateDto } from './dto/feedback-parameter-aggregate.dto';
import { DriverSessionEntity } from '@ridy/database';
import { SetActiveServicesOnDriverInput } from './input/set-active-services-on-driver.input';
import { DriverServicesServiceEntity } from '@ridy/database';
import { DriverTimesheetFilterInput } from './input/driver-timesheet-filter.input';
import { DriverTimesheetDTO } from './dto/driver-timesheet.dto';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(DriverEntity)
    private driverRepository: Repository<DriverEntity>,
    @InjectRepository(DriverServicesServiceEntity)
    private driverServicesServiceRepository: Repository<DriverServicesServiceEntity>,
    @InjectRepository(DriverSessionEntity)
    private driverSessionRepository: Repository<DriverSessionEntity>,
    @InjectRepository(DriverTimesheetEntity)
    private driverTimesheetRepository: Repository<DriverTimesheetEntity>,
    private driverRedisService: DriverRedisService,
  ) {}

  async getDriversLocation(
    center: Point,
    count: number,
  ): Promise<OnlineDriver[]> {
    const snapshot = await this.driverRedisService.getAllOnline(center, count);
    return snapshot.map((driver) => ({
      ...driver,
      lastUpdatedAt: driver.locationTime,
      driverId: parseInt(driver.id),
    }));
  }

  async getDriversLocationWithData(
    center: Point,
    count: number,
  ): Promise<OnlineDriverWithData[]> {
    const drivers = await this.driverRedisService.getAllOnline(center, count);
    return drivers.map((driver) => {
      Logger.debug(driver, 'DriverService.getDriversLocationWithData');
      const onlineDriverWithData: OnlineDriverWithData = {
        id: parseInt(driver.id),
        location: driver.location,
        lastUpdatedAt: driver.locationTime,
        mobileNumber: driver.mobileNumber,
        status:
          (driver.activeOrderIds?.length ?? 0) > 0
            ? DriverStatus.InService
            : DriverStatus.Online,
        rating: driver.rating,
        firstName: driver.firstName,
        lastName: driver.lastName,
        avatarUrl: driver.avatarImageAddress,
        gender: Gender.Unknown,
        reviewCount: 0,
      };
      return onlineDriverWithData;
    });
  }

  async driverFeedbackParametersSummary(
    driverId: number,
  ): Promise<FeedbackParameterAggregateDto[]> {
    return this.driverRepository.query(
      `
        SELECT 
            review_parameter.title,
            ANY_VALUE(review_parameter.isGood) AS isGood,
            COUNT(review_parameter.id) AS count
        FROM
            review_parameter_feedbacks_request_review
        INNER JOIN review_parameter on review_parameter.id = review_parameter_feedbacks_request_review.reviewParameterId
        INNER JOIN request_review on request_review.id = review_parameter_feedbacks_request_review.requestReviewId
        WHERE
            request_review.driverId = ?
        GROUP BY
            review_parameter.title
        ORDER BY isGood DESC, count DESC`,
      [driverId],
    );
  }

  async terminateLoginSession(sessionId: string): Promise<DeleteResult> {
    return this.driverSessionRepository.softDelete(sessionId);
  }
  async setActivatedServicesOnDriver(input: SetActiveServicesOnDriverInput) {
    Logger.log(
      `set activated services on driver ${JSON.stringify(input)}`,
      'DriverService.setActivatedServicesOnDriver',
    );
    const previousServcies = await this.driverRepository.findOne({
      where: { id: input.driverId },
      relations: {
        enabledServices: {
          service: true,
        },
      },
    });
    const newServiceIds = input.serviceIds.filter(
      (serviceId) =>
        previousServcies.enabledServices.findIndex(
          (service) => service.service.id == serviceId,
        ) == -1,
    );
    const removedServiceIds = previousServcies.enabledServices.filter(
      (service) =>
        input.serviceIds.findIndex(
          (serviceId) => serviceId == service.service.id,
        ) == -1,
    );
    const newServices = newServiceIds.map((serviceId) => ({
      driverId: input.driverId,
      serviceId,
    }));
    const removedServices = removedServiceIds.map((service) => ({
      driverId: input.driverId,
      serviceId: service.service.id,
    }));
    Logger.log(
      `newServices: ${JSON.stringify(newServices)}`,
      'DriverService.setActivatedServicesOnDriver',
    );
    Logger.log(
      `removedServices: ${JSON.stringify(removedServices)}`,
      'DriverService.setActivatedServicesOnDriver',
    );

    if (newServices.length > 0) {
      await this.driverServicesServiceRepository
        .createQueryBuilder()
        .insert()
        .into(DriverServicesServiceEntity)
        .values(newServices)
        .execute();
    }
    if (removedServices.length > 0) {
      await this.driverServicesServiceRepository
        .createQueryBuilder()
        .delete()
        .from(DriverServicesServiceEntity)
        .where('driverId = :driverId', { driverId: input.driverId })
        .andWhere('serviceId IN (:...serviceIds)', {
          serviceIds: removedServices.map((service) => service.serviceId),
        })
        .execute();
    }
    return true;
  }

  async getDriverTimesheets(
    input: DriverTimesheetFilterInput,
  ): Promise<DriverTimesheetDTO[]> {
    const rawTimesheet = await this.driverTimesheetRepository.find({
      where: {
        driverId: input.driverId,
        startTime: Between(input.startDate, input.endDate),
      },
    });
    const timesheetByDate = new Map<string, DriverTimesheetDTO>();
    for (const entry of rawTimesheet) {
      const dateKey = entry.startTime.toISOString().split('T')[0];
      if (!timesheetByDate.has(dateKey)) {
        timesheetByDate.set(dateKey, {
          id: entry.id,
          date: new Date(dateKey),
          timeRanges: [],
        });
      }
      const dto = timesheetByDate.get(dateKey)!;
      dto.timeRanges.push({
        startTime: entry.startTime,
        endTime: entry.endTime,
      });
    }

    return Array.from(timesheetByDate.values());
  }
}
