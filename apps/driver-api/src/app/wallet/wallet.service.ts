import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OnlinePaymentMethod,
  PaymentGatewayEntity,
  PaymentMethodBase,
  PaymentMode,
  SavedAccount,
} from '@ridy/database';
import { Repository } from 'typeorm';
import { SavedPaymentMethodEntity } from '@ridy/database';
import { DriverEntity } from '@ridy/database';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(PaymentGatewayEntity)
    private gatewayRepo: Repository<PaymentGatewayEntity>,
    @InjectRepository(SavedPaymentMethodEntity)
    private savedPaymentMethodRepo: Repository<SavedPaymentMethodEntity>,
    @InjectRepository(DriverEntity)
    private driverRepository: Repository<DriverEntity>,
  ) {}

  async getPaymentMethodsForDriver(input: {
    userId: number;
  }): Promise<PaymentMethodBase[]> {
    const paymentGateways = await this.gatewayRepo.find({
      where: { enabled: true },
      relations: {
        media: true,
      },
    });
    const driver = await this.driverRepository.findOne({
      where: { id: input.userId },
    });
    const savedPaymentMethods = await this.savedPaymentMethodRepo.find({
      where: {
        riderId: input.userId,
        isEnabled: true,
      },
      order: {
        isDefault: 'DESC',
      },
    });
    return [
      ...paymentGateways.map(
        (gateway): OnlinePaymentMethod => ({
          id: gateway.id,
          name: gateway.title,
          imageUrl: gateway.media?.address,
          mode: PaymentMode.PaymentGateway,
          linkMethod: gateway.linkMethod(),
        }),
      ),
      ...savedPaymentMethods.map(
        (method): SavedAccount => ({
          id: method.id,
          isDefault: driver?.defaultSavedPaymentMethodId === method.id,
          mode: PaymentMode.SavedPaymentMethod,
          name:
            method.lastFour != null
              ? method.lastFour.length == 4
                ? '*** **** **** ' + method.lastFour
                : method.lastFour
              : method.title.length == 4
                ? '*** **** **** ' + method.title
                : method.title,
          providerBrand: method.providerBrand,
        }),
      ),
    ];
  }

  async markPaymentMethodAsDefault(input: {
    userId: number;
    savedPaymentMethodId: number;
  }): Promise<PaymentMethodBase[]> {
    await this.driverRepository.update(
      { id: input.userId },
      { defaultSavedPaymentMethodId: input.savedPaymentMethodId },
    );
    return this.getPaymentMethodsForDriver({ userId: input.userId });
  }

  deletePaymentMethod(input: { userId: number; savedPaymentMethodId: number }) {
    return this.savedPaymentMethodRepo.delete({
      id: input.savedPaymentMethodId,
      riderId: input.userId,
    });
  }
}
