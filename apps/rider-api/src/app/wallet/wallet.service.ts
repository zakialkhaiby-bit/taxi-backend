import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OnlinePaymentMethod,
  PaymentMethodBase,
  PaymentMode,
  PaymentPayoutData,
  RiderTransactionEntity,
  RiderWalletEntity,
  SavedAccount,
} from '@ridy/database';
import { PaymentGatewayEntity } from '@ridy/database';
import { SavedPaymentMethodEntity } from '@ridy/database';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ChargeSavedPaymentMethodBody,
  GetPaymentLinkBody,
  IntentResult,
} from '@ridy/database';
import { CustomerEntity } from '@ridy/database';
import { ForbiddenError } from '@nestjs/apollo';
import { RiderWalletDTO } from './dto/rider-wallet.dto';
import { RiderTransactionDTO } from './dto/rider-transaction.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(PaymentGatewayEntity)
    public gatewayRepo: Repository<PaymentGatewayEntity>,
    @InjectRepository(SavedPaymentMethodEntity)
    public savedPaymentMethodRepo: Repository<SavedPaymentMethodEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(RiderWalletEntity)
    private walletRepo: Repository<RiderWalletEntity>,
    @InjectRepository(RiderTransactionEntity)
    private transactionRepo: Repository<RiderTransactionEntity>,
    private httpService: HttpService,
  ) {}

  async getPaymentLink(input: GetLinkInput): Promise<IntentResult> {
    Logger.log(input, 'WalletService.getPaymentLink.input');
    if (input.paymentMode === PaymentMode.PaymentGateway) {
      const link = await this.getLinkForPaymentGateway(input);
      return link;
    } else if (input.paymentMode == PaymentMode.SavedPaymentMethod) {
      const link = await this.chargeSavedPaymentMethod(input);
      return link;
    } else {
      throw new ForbiddenError('Unacceptable Payment Mode for Link generation');
    }
  }

  async getPaymentMethodsForClient(input: {
    userId: number;
  }): Promise<PaymentMethodBase[]> {
    const paymentGateways = await this.gatewayRepo.find({
      where: { enabled: true },
      relations: {
        media: true,
      },
    });
    const customer = await this.customerRepository.findOne({
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
          isDefault: customer?.defaultSavedPaymentMethodId === method.id,
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

  private async getLinkForPaymentGateway(
    input: GetLinkInput,
  ): Promise<IntentResult> {
    await this.gatewayRepo.findOneByOrFail({
      id: input.gatewayId,
    });
    const body: GetPaymentLinkBody = {
      userId: input.userId.toString(),
      userType: 'rider',
      paymentGatewayId: input.gatewayId,
      amount: input.amount.toString(),
      currency: input.currency,
      payoutData: input.payoutData,
      orderNumber: input.orderNumber,
      shouldPreauth: input.shouldPreauth == true ? '1' : '0',
      returnUrl: `${process.env.RIDER_SERVER_URL}/payment_result`,
    };
    const result = await firstValueFrom(
      this.httpService.post<IntentResult>(
        `${process.env.GATEWAY_SERVER_URL}/create_payment_link`,
        body,
      ),
    );

    return {
      status: result.data.status,
      url: result.data.url,
    };
  }

  private async chargeSavedPaymentMethod(
    input: GetLinkInput,
  ): Promise<IntentResult> {
    const savedPaymentMethod =
      await this.savedPaymentMethodRepo.findOneByOrFail({
        id: input.gatewayId,
      });
    const body: ChargeSavedPaymentMethodBody = {
      userId: input.userId.toString(),
      userType: 'rider',
      savedPaymentMethodId: savedPaymentMethod.id.toString(),
      amount: input.amount,
      currency: input.currency,
      orderNumber: input.orderNumber,
      payoutData: input.payoutData,
      captureImmediately:
        input.shouldPreauth != null ? !input.shouldPreauth : false,
      returnUrl: `${process.env.RIDER_SERVER_URL}/saved_payment_method_charged`,
    };
    const result = await firstValueFrom(
      this.httpService.post<IntentResult>(
        `${process.env.GATEWAY_SERVER_URL}/charge_saved_payment_method`,
        body,
      ),
    );
    return result.data;
  }

  async markPaymentMethodAsDefault(input: {
    userId: number;
    savedPaymentMethodId: number;
  }): Promise<PaymentMethodBase[]> {
    await this.savedPaymentMethodRepo.findOneByOrFail({
      id: input.savedPaymentMethodId,
      riderId: input.userId,
    });
    await this.customerRepository.update(
      { id: input.userId },
      { defaultSavedPaymentMethodId: input.savedPaymentMethodId },
    );
    return this.getPaymentMethodsForClient({ userId: input.userId });
  }

  deletePaymentMethod(input: { userId: number; savedPaymentMethodId: number }) {
    return this.savedPaymentMethodRepo.delete({
      id: input.savedPaymentMethodId,
      riderId: input.userId,
    });
  }

  getRiderWallets(id: number): Promise<RiderWalletDTO[]> {
    return this.walletRepo.find({
      where: { riderId: id },
      relations: {},
    });
  }

  getRiderTransactions(id: number): Promise<RiderTransactionDTO[]> {
    return this.transactionRepo.find({
      where: { riderId: id },
      relations: {},
    });
  }
}

interface GetLinkInput {
  paymentMode: PaymentMode;
  gatewayId: number;
  userId: number;
  amount: number;
  payoutData: PaymentPayoutData | null;
  currency: string;
  orderNumber?: string;
  shouldPreauth?: boolean;
}
