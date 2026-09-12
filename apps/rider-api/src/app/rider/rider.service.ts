import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CustomerEntity,
  OrderStatus,
  RiderRedisService,
  RiderStatus,
  TaxiOrderEntity,
} from '@ridy/database';
import { Repository } from 'typeorm';
import { RiderStatisticsDTO } from './dto/rider-statistics.dto';
import { RiderDTO } from './dto/rider.dto';
import { UpdateRiderInput } from './dto/update-rider.input';
import { ForbiddenError } from '@nestjs/apollo';
import { RiderRedisSnapshot } from '@ridy/database';

@Injectable()
export class RiderService {
  constructor(
    @InjectRepository(TaxiOrderEntity)
    private readonly taxiOrderRepository: Repository<TaxiOrderEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    private readonly riderRedisService: RiderRedisService,
  ) {}

  async getRiderStatistics(id: number): Promise<RiderStatisticsDTO> {
    const totalRides = await this.taxiOrderRepository.count({
      where: { riderId: id },
    });
    const completedRides = await this.taxiOrderRepository.count({
      where: { riderId: id, status: OrderStatus.Finished },
    });
    const canceledRides = await this.taxiOrderRepository.count({
      where: { riderId: id, status: OrderStatus.RiderCanceled },
    });
    const customer = await this.customerRepository.findOneOrFail({
      where: { id: id },
      relations: { favoriteDrivers: true },
    });
    const distanceTraveled = await this.taxiOrderRepository.sum(
      'distanceBest',
      {
        riderId: id,
        status: OrderStatus.Finished,
      },
    );
    return {
      totalRides: totalRides,
      completedRides: completedRides,
      canceledRides: canceledRides,
      favoriteDriversCount: customer.favoriteDrivers?.length ?? 0,
      distanceTraveled: distanceTraveled || 0,
    };
  }

  async getRiderProfile(riderId: number): Promise<RiderDTO> {
    const redisSnapshot = await this.riderRedisService.getOnlineRider(riderId);
    if (redisSnapshot != null) {
      return this.snapshotToDTO(redisSnapshot);
    }
    const riderEntity = await this.customerRepository.findOne({
      where: { id: riderId },
      relations: {
        media: true,
        wallets: true,
      },
    });
    if (riderEntity == null) {
      throw new ForbiddenError(
        `The profile was not found. Try logging in again.`,
      );
    }
    if (riderEntity.status == RiderStatus.Disabled) {
      throw new ForbiddenError(
        `Rider account is disabled. Please contact support.`,
      );
    }
    return this.entityToDTO(riderEntity!);
  }

  async updateRiderProfile(
    id: number,
    input: UpdateRiderInput,
  ): Promise<RiderDTO> {
    const redisSnapshot = await this.riderRedisService.getOnlineRider(id);
    if (redisSnapshot != null) {
      const updatedRider = { ...redisSnapshot, ...input };
      await this.riderRedisService.updateOnlineRider(id, updatedRider);
      return this.snapshotToDTO(updatedRider);
    }
    const riderEntity = await this.customerRepository.findOneOrFail({
      where: { id: id },
      relations: {
        media: true,
        wallets: true,
      },
    });
    const updatedRider = { ...riderEntity, ...input };
    const rider = await this.customerRepository.save(updatedRider);
    return this.entityToDTO(rider);
  }

  private snapshotToDTO(redisSnapshot: RiderRedisSnapshot): RiderDTO {
    return {
      id: redisSnapshot.id,
      firstName: redisSnapshot.firstName ?? null,
      lastName: redisSnapshot.lastName ?? null,
      mobileNumber: redisSnapshot.mobileNumber,
      email: redisSnapshot.email,
      gender: redisSnapshot.gender,
      profileImageUrl: redisSnapshot.profileImageUrl,
      walletCredit: redisSnapshot.walletCredit,
      currency: redisSnapshot.currency,
    };
  }

  private entityToDTO(riderEntity: CustomerEntity): RiderDTO {
    return {
      id: riderEntity.id,
      firstName: riderEntity.firstName ?? null,
      lastName: riderEntity.lastName ?? null,
      mobileNumber: riderEntity.mobileNumber,
      email: riderEntity.email ?? null,
      gender: riderEntity.gender ?? null,
      profileImageUrl: riderEntity.media?.address ?? null,
      walletCredit: riderEntity.wallets?.[0]?.balance ?? 0,
      currency:
        riderEntity.wallets?.[0]?.currency ??
        process.env.DEFAULT_CURRENCY ??
        'USD',
    };
  }
}
