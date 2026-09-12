import { Injectable, Logger } from '@nestjs/common';
import {
  ActiveOrderCommonRedisService,
  DriverEntity,
  DriverRedisSnapshot,
  OrderStatus,
  Point,
  PubSubService,
  RiderOrderUpdateType,
  TaxiOrderEntity,
} from '@ridy/database';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverStatus } from '@ridy/database';
import { DriverRedisService } from '@ridy/database';
import { TimesheetService } from '../timesheet/timesheet.service';
import { DriverPerformanceDTO } from './dto/driver-performance.dto';

import { DriverDTO } from '../core/dtos/driver.dto';
import { UpdateDriverOfferFilterInput } from './inputs/update-driver-offer-filter.input';
import { ServiceDTO } from '../core/dtos/service.dto';
import { TaxiServiceRedisService } from '@ridy/database';
import { ForbiddenError } from '@nestjs/apollo';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(DriverEntity)
    public driverRepository: Repository<DriverEntity>,
    @InjectRepository(TaxiOrderEntity)
    private taxiOrderRepository: Repository<TaxiOrderEntity>,
    private activeOrderRedisService: ActiveOrderCommonRedisService,
    private driverRedisService: DriverRedisService,
    private serviceRedisService: TaxiServiceRedisService,
    private timesheetService: TimesheetService,
    private readonly pubsub: PubSubService,
  ) {}

  async findWithDeleted(
    input: FindOptionsWhere<DriverEntity>,
  ): Promise<DriverEntity | null> {
    return this.driverRepository.findOne({ where: input, withDeleted: true });
  }

  async findOrCreateUserWithMobileNumber(input: {
    mobileNumber: string;
    countryIso?: string;
  }): Promise<DriverEntity> {
    const findResult = await this.findWithDeleted({
      mobileNumber: input.mobileNumber,
    });
    if (findResult?.deletedAt != null) {
      await this.driverRepository.restore(findResult.id);
    }
    if (findResult == null) {
      const driver = this.driverRepository.create(input);
      return await this.driverRepository.save(driver);
    }
    const user = await this.driverRepository.findOneOrFail({
      where: { mobileNumber: input.mobileNumber },
      withDeleted: true,
      relations: {
        documents: true,
        media: true,
      },
    });
    return user;
  }

  async findByIds(ids: number[]): Promise<DriverEntity[]> {
    return this.driverRepository.find({
      where: { id: In(ids) },
      withDeleted: true,
    });
  }

  async setPassword(input: {
    driverId: number;
    password: string;
  }): Promise<DriverEntity> {
    await this.driverRepository.update(input.driverId, {
      password: input.password,
    });
    return this.driverRepository.findOneByOrFail({ id: input.driverId });
  }

  async expireDriverStatus(driverIds: number[]) {
    if (driverIds.length < 1) {
      return;
    }
    for (const driverId of driverIds) {
      const onlineDriver =
        await this.driverRedisService.getOnlineDriverMetaData(
          driverId.toString(),
        );
      await this.driverRepository.update(driverIds, {
        status: DriverStatus.Offline,
        lastSeenTimestamp: onlineDriver?.locationTime ?? new Date(),
        acceptedOrdersCount: onlineDriver?.acceptedOrdersCount ?? 0,
        rejectedOrdersCount: onlineDriver?.rejectedOrdersCount ?? 0,
      });
      await this.timesheetService.goOffline(driverId);
    }
    await this.driverRedisService.expire(driverIds);
  }

  restore(id: number) {
    return this.driverRepository.restore(id);
  }

  async goOnline(id: number, location: Point): Promise<boolean> {
    await this.driverRepository.update(id, { status: DriverStatus.Online });
    const driver = await this.driverRepository.findOneOrFail({
      where: { id },
      relations: {
        enabledServices: true,
        car: true,
        carColor: true,
        media: true,
        wallet: true,
      },
    });
    const primaryWallet = driver.wallet?.sort((a, b) => a.id - b.id)[0] ?? {
      currency: process.env.DEFAULT_CURRENCY ?? 'USD',
      balance: 0,
    };
    const currency = primaryWallet.currency;
    await this.driverRedisService.makeDriverOnline({
      id: driver.id.toString(),
      firstName: driver.firstName ?? '-',
      lastName: driver.lastName ?? '-',
      mobileNumber: driver.mobileNumber ?? '0',
      vehicleColor: driver.carColor?.name ?? '-',
      vehicleName: driver.car?.name ?? '-',
      vehiclePlate: driver.carPlate ?? '-',
      currency: currency,
      walletCredit: primaryWallet.balance ?? 0,
      avatarImageAddress: driver.media?.address ?? '',
      location: location,
      fleetId: driver.fleetId?.toString(),
      heading: location.heading ?? 0,
      searchDistance: driver.searchDistance,
      acceptedOrdersCount: driver.acceptedOrdersCount,
      rejectedOrdersCount: driver.rejectedOrdersCount,
      serviceIds:
        driver.enabledServices?.map((s) => s.serviceId.toString()) ?? [],
      fcmTokens:
        driver.notificationPlayerId != null
          ? [driver.notificationPlayerId!]
          : [],
      rating: driver.rating,
    });
    return true;
  }

  async goOffline(id: number): Promise<boolean> {
    const onlineDriver = await this.driverRedisService.getOnlineDriverMetaData(
      id.toString(),
    );
    if ((onlineDriver?.activeOrderIds?.length ?? 0) > 0) {
      throw new ForbiddenError('Driver is currently active in an order');
    }
    await this.driverRepository.update(id, {
      status: DriverStatus.Offline,
      lastSeenTimestamp: new Date(),
      ...(onlineDriver && {
        acceptedOrdersCount: onlineDriver.acceptedOrdersCount ?? 0,
        rejectedOrdersCount: onlineDriver.rejectedOrdersCount ?? 0,
      }),
    });
    this.driverRedisService.expire([id]);
    return true;
  }

  async getPerformance(id: number): Promise<DriverPerformanceDTO> {
    const driver = await this.driverRepository.findOne({ where: { id } });
    if (!driver) {
      throw new Error('Driver not found');
    }
    const driverOrders = await this.taxiOrderRepository.count({
      where: { driverId: id },
    });
    const distanceTraveled = await this.taxiOrderRepository.sum(
      'distanceBest',
      {
        driverId: id,
        status: OrderStatus.Finished,
      },
    );
    return {
      rating: driver.rating,
      acceptanceRate:
        (driver.acceptedOrdersCount /
          (driver.acceptedOrdersCount + driver.rejectedOrdersCount) || 0) * 100,
      totalRides: driverOrders,
      distanceTraveled: distanceTraveled || 0,
    };
  }

  // Converts a DriverEntity to a DTO. NOTE: Ensure enabledServices & wallet relations are loaded when calling this method.
  createDTOFromEntity(entity: DriverEntity): DriverDTO {
    const primaryWallet = entity.wallet?.sort((a, b) => a.id - b.id)[0] ?? {
      currency: process.env.DEFAULT_CURRENCY ?? 'USD',
      balance: 0,
    };
    const currency = primaryWallet.currency;
    const dto: Required<DriverDTO> = {
      id: entity.id,
      firstName: entity.firstName ?? '',
      lastName: entity.lastName ?? '',
      mobileNumber: entity.mobileNumber,
      profileImageUrl: entity.media?.address ?? '',
      status:
        entity.status == DriverStatus.Online ||
        entity.status == DriverStatus.InService
          ? DriverStatus.Offline
          : entity.status, // If the user is not found in the redis database it should be treated as offline
      searchDistance: entity.searchDistance ?? null,
      currency: currency,
      walletCredit: primaryWallet.balance,
    };
    return dto;
  }

  createDTOFromSnapshot(snapshot: DriverRedisSnapshot): DriverDTO {
    const dto: Required<DriverDTO> = {
      id: parseInt(snapshot.id),
      firstName: snapshot.firstName ?? '',
      lastName: snapshot.lastName ?? '',
      mobileNumber: snapshot.mobileNumber,
      profileImageUrl: snapshot.avatarImageAddress,
      walletCredit: snapshot.walletCredit ?? 0,
      currency: snapshot.currency,
      status:
        (snapshot.activeOrderIds?.length ?? 0) > 0
          ? DriverStatus.InService
          : DriverStatus.Online,
      searchDistance: snapshot.searchDistance ?? null,
    };
    return dto;
  }

  async updateDriverOfferFilter(
    driverId: number,
    input: UpdateDriverOfferFilterInput,
  ): Promise<DriverDTO> {
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      driverId.toString(),
    );
    if (driver) {
      await this.driverRedisService.updateDriverOfferFilters(driverId, {
        searchDistance: input.searchDistance,
        serviceIds: input.serviceIds,
      });
      return this.createDTOFromSnapshot(driver);
    } else {
      let entity = await this.driverRepository.findOneOrFail({
        where: { id: driverId },
        relations: { enabledServices: true },
      });
      this.driverRepository.update(entity.id, {
        searchDistance: input.searchDistance,
        enabledServices:
          input.serviceIds == null
            ? entity.enabledServices
            : entity.enabledServices!.map((s) => ({
                driverEnabled: input.serviceIds!.includes(s.serviceId),
                serviceId: s.serviceId,
              })),
      });
      entity = await this.driverRepository.findOneOrFail({
        where: { id: driverId },
        relations: { enabledServices: true },
      });
      return this.createDTOFromEntity(entity);
    }
  }

  async getDriver(id: number): Promise<DriverDTO> {
    const driverMetaData =
      await this.driverRedisService.getOnlineDriverMetaData(id.toString());
    if (driverMetaData) {
      return this.createDTOFromSnapshot(driverMetaData);
    } else {
      const entity = await this.driverRepository.findOne({
        where: { id },
      });
      if (entity == null) {
        throw new ForbiddenError(
          `Driver's profile was not found. You can login again.`,
        );
      }
      if (entity.status == DriverStatus.SoftReject) {
        throw new ForbiddenError(
          'Your submission has been rejected due to below reason. You can try again after fixing the issue: ' +
            entity.softRejectionNote,
        );
      }
      if (entity.status == DriverStatus.Blocked) {
        throw new ForbiddenError(
          'Your account has been blocked. Please contact support for more information.',
        );
      }
      if (entity.status == DriverStatus.HardReject) {
        throw new ForbiddenError(
          'Your application does not meet our platform requirements. Please contact support for more information.',
        );
      }
      return this.createDTOFromEntity(entity);
    }
  }

  async updateDriverLocation(driverId: number, point: Point): Promise<void> {
    const onlineDriver = await this.driverRedisService.setLocation(
      driverId.toString(),
      point,
    );
    if (onlineDriver == null) {
      Logger.warn(
        `Driver ${driverId} is not online but location update was attempted.`,
      );
      return;
    }
    this.pubsub.publish(
      'admin.driver-location.updated',
      {
        operatorId: 0,
      },
      {
        location: onlineDriver.location,
        driverId: parseInt(onlineDriver.id),
      },
    );
    const activeOrders = await this.activeOrderRedisService.getActiveOrders(
      onlineDriver.activeOrderIds,
    );
    for (const order of activeOrders) {
      this.pubsub.publish(
        'rider.order.updated',
        {
          riderId: parseInt(order.riderId),
        },
        {
          type: RiderOrderUpdateType.DriverLocationUpdated,
          driverLocation: point,
          orderId: parseInt(order.id),
          riderId: parseInt(order.riderId),
        },
      );
    }
  }

  async getActiveServices(driverId: number): Promise<ServiceDTO[]> {
    const driverMetaData =
      await this.driverRedisService.getOnlineDriverMetaData(
        driverId.toString(),
      );
    if (driverMetaData) {
      const allServices = await this.serviceRedisService.getTaxiServicesByIds(
        driverMetaData.serviceIds,
      );
      return allServices.map((service) => ({
        id: service.id,
        name: service.name,
        imageUrl: service.imageAddress,
      }));
    } else {
      const entity = await this.driverRepository.findOneOrFail({
        where: { id: driverId },
        relations: {
          enabledServices: {
            service: true,
          },
        },
      });
      return entity.enabledServices!.map((service) => ({
        id: service!.service!.id!,
        name: service!.service!.name!,
        imageUrl: service!.service!.media!.address!,
      }));
    }
  }
}
