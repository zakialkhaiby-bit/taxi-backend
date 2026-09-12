import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  DriverEntity,
  DriverServicesServiceEntity,
  DriverStatus,
  DriverToDriverDocumentEntity,
  MediaEntity,
  ServiceEntity,
  VerifyHash,
} from '@ridy/database';

import { SMSService } from '@ridy/database';
import { AuthRedisService } from '@ridy/database';
import { ForbiddenError } from '@nestjs/apollo';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverService } from '../driver/driver.service';
import { CompleteRegistrationInput } from './dto/complete-registration.input';
import { DriverDTO } from '../core/dtos/driver.dto';

@Injectable()
export class AuthService {
  constructor(
    private driverService: DriverService,
    private jwtService: JwtService,
    private smsService: SMSService,
    private authRedisService: AuthRedisService,
    @InjectRepository(DriverEntity)
    public driverRepository: Repository<DriverEntity>,
    @InjectRepository(ServiceEntity)
    public serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(MediaEntity)
    public mediaRepository: Repository<MediaEntity>,
    @InjectRepository(DriverServicesServiceEntity)
    public driverServiceRepository: Repository<DriverServicesServiceEntity>,
    @InjectRepository(DriverToDriverDocumentEntity)
    public driverToDocumentRepository: Repository<DriverToDriverDocumentEntity>,
  ) {}

  async loginUser(user: DriverEntity): Promise<TokenObject> {
    const payload = { id: user.id };
    return {
      token: this.jwtService.sign(payload),
    };
  }

  async sendVerificationCode(input: {
    mobileNumber: string;
    countryIso?: string;
  }): Promise<{ hash: string }> {
    const code =
      process.env.DEMO_MODE?.toLowerCase() == 'true'
        ? '123456'
        : await this.smsService.sendVerificationCodeSms(input.mobileNumber);
    const hash = await this.authRedisService.createVerificationCode({
      ...input,
      code,
    });
    return hash;
  }

  async verifyCode(hash: string, code: string): Promise<VerifyHash> {
    const result = await this.authRedisService.isVerificationCodeValid(
      hash,
      code,
    );
    if (!result) {
      throw new ForbiddenError('Invalid verification code');
    }
    await this.authRedisService.deleteVerificationCode(hash);
    return result;
  }

  async completeRegistration(input: {
    userId: number;
    input: CompleteRegistrationInput;
  }): Promise<DriverDTO> {
    let driver = await this.driverRepository.findOneOrFail({
      where: { id: input.userId },
    });
    if (!driver) {
      throw new Error('Driver not found');
    }
    const isDemoMode = process.env.DEMO_MODE?.toLowerCase() == 'true';
    const {
      firstName,
      lastName,
      certificateNumber,
      email,
      carProductionYear,
      carPlate,
      profilePictureId,
      gender,
      address,
      carId,
      carColorId,
      documentPairs,
    } = input.input;
    this.driverRepository.update(input.userId, {
      firstName,
      lastName,
      certificateNumber,
      email,
      carProductionYear,
      carPlate,
      mediaId: profilePictureId,
      gender,
      address: address,
      carId,
      carColorId,
      status: isDemoMode ? DriverStatus.Offline : DriverStatus.PendingApproval,
    });
    if (isDemoMode) {
      const allowedServices = await this.serviceRepository.find();
      const services = [];
      for (const service of allowedServices) {
        services.push(
          this.driverServiceRepository.create({
            driverId: input.userId,
            serviceId: service.id,
            driverEnabled: true,
          }),
        );
      }
      await this.driverServiceRepository.save(services);
    }
    if (input.input.documentPairs) {
      await this.driverToDocumentRepository.delete({ driverId: input.userId });
      await this.driverToDocumentRepository.save(
        documentPairs.map(
          (pair): Partial<DriverToDriverDocumentEntity> => ({
            driverId: input.userId,
            driverDocumentId: pair.documentId,
            mediaId: pair.mediaId,
          }),
        ),
      );
    }
    if (input.input.legacyDocumentIds) {
      // No need to do anything as assignment automatically happen on upload
      // const legacyIds = input.input.legacyDocumentIds;
      // const medias = await this.mediaRepository
      //   .createQueryBuilder('media')
      //   .where('media.id IN (:...ids)', { ids: legacyIds })
      //   .getMany();
      // if (medias.length) {
      //   for (const media of medias) {
      //     (media as MediaEntity).driverDocumentId = input.userId;
      //   }
      //   await this.mediaRepository.save(medias);
      // }
    }
    driver = await this.driverRepository.findOneOrFail({
      where: { id: input.userId },
      relations: {
        wallet: true,
        enabledServices: true,
      },
    });
    return this.driverService.createDTOFromEntity(driver);
  }
}

export type TokenObject = { token: string };
