import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RiderAddressEntity } from '@ridy/database';
import { Repository } from 'typeorm';
import { CreateRiderAddressInput } from './dto/create-favorite-location.input';
import { FavoriteLocationDTO } from './dto/favorite-location.dto';

@Injectable()
export class FavoriteLocationService {
  constructor(
    @InjectRepository(RiderAddressEntity)
    private readonly addressRepository: Repository<RiderAddressEntity>,
  ) {}

  async createFavoriteLocation(
    input: CreateRiderAddressInput,
  ): Promise<FavoriteLocationDTO> {
    const address = this.addressRepository.create(input);
    await this.addressRepository.save(address);
    return {
      ...address,
      details: address.details ?? '-',
    };
  }

  async getFavoriteLocations(riderId: number): Promise<FavoriteLocationDTO[]> {
    const addresses = await this.addressRepository.find({
      where: {
        riderId: riderId,
      },
    });
    return addresses.map((address) => {
      return {
        ...address,
        details: address.details ?? '-',
      };
    });
  }

  async updateFavoriteLocation(
    id: number,
    input: CreateRiderAddressInput,
  ): Promise<FavoriteLocationDTO> {
    await this.addressRepository.update(id, input);
    const updatedAddress = await this.addressRepository.findOneByOrFail({ id });
    return {
      ...updatedAddress,
      details: updatedAddress?.details ?? '-',
    };
  }

  async deleteFavoriteLocation({
    id,
    riderId,
  }: {
    id: number;
    riderId: number;
  }): Promise<boolean> {
    const result = await this.addressRepository.delete({ id, riderId });
    return (result.affected ?? 0) > 0;
  }
}
