import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerEntity } from '@ridy/database';
import { Repository } from 'typeorm';
import { PastOrderDriverDTO } from '../core/dtos/past-order-driver.dto';

@Injectable()
export class DriverTendencyService {
  constructor(
    @InjectRepository(CustomerEntity)
    private riderRepo: Repository<CustomerEntity>,
  ) {}

  async deleteFavoriteDriver(riderId: number, driverId: number): Promise<void> {
    await this.riderRepo
      .createQueryBuilder()
      .relation(CustomerEntity, 'favoriteDrivers')
      .of(riderId)
      .remove(driverId);
  }

  async getFavoriteDrivers(id: number): Promise<PastOrderDriverDTO[]> {
    const entities = await this.riderRepo.findOneOrFail({
      where: { id },
      relations: {
        favoriteDrivers: {
          car: true,
          carColor: true,
        },
      },
    });
    return (
      entities.favoriteDrivers?.map((entity) => {
        const dto: PastOrderDriverDTO = {
          id: entity.id,
          fullName:
            entity.firstName == null && entity.lastName == null
              ? null
              : [entity.firstName, entity.lastName].filter(Boolean).join(' '),
          profileImageUrl: entity.media?.address,
          rating: entity.rating,
          mobileNumber: entity.mobileNumber,
          vehicleName: entity.car?.name ?? undefined,
          vehicleColor: entity.carColor?.name ?? undefined,
          vehiclePlate: entity.carPlate ?? undefined,
        };
        return dto;
      }) ?? []
    );
  }
}
