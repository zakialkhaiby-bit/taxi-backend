import { Inject, Logger, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Mutation, Resolver, ID, Query } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserContext } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/access-token.guard';
import {
  IntentResultToTopUpWalletStatus,
  TopUpWalletInput,
  TopUpWalletResponse,
} from './dto/top-up-wallet.input';
import {
  ActiveOrderCommonRedisService,
  CryptoService,
  OrderStatus,
  PaymentMethodBase,
  PaymentMode,
} from '@ridy/database';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WalletService } from './wallet.service';
import {
  IntentResult,
  SetupSavedPaymentMethodDecryptedBody,
} from '@ridy/database';
import { SetupPaymentMethodDto } from './dto/setup_payment_method.dto';
import { GiftCardDTO } from './dto/gift-card.dto';
import { CommonGiftCardService } from '@ridy/database';
import { CustomerEntity } from '@ridy/database';
import { RiderWalletDTO } from './dto/rider-wallet.dto';
import { RiderTransactionDTO } from './dto/rider-transaction.dto';

@UseGuards(GqlAuthGuard)
@Resolver()
export class WalletResolver {
  constructor(
    @InjectRepository(CustomerEntity)
    private customerRepo: Repository<CustomerEntity>,
    private orderRedisService: ActiveOrderCommonRedisService,
    private cryptoService: CryptoService,
    private commongGiftCardService: CommonGiftCardService,
    @Inject(CONTEXT) private context: UserContext,
    private httpService: HttpService,
    private walletService: WalletService,
  ) {}

  @Mutation(() => TopUpWalletResponse)
  async topUpWallet(
    @Args('input', { type: () => TopUpWalletInput }) input: TopUpWalletInput,
    @Args('shouldPreauth', { type: () => Boolean, nullable: true })
    shouldPreauth: boolean,
  ): Promise<TopUpWalletResponse> {
    let shouldPreauthValue = shouldPreauth ?? false;
    if (input.orderNumber) {
      const existingOrder = await this.orderRedisService.getActiveOrder(
        input.orderNumber,
      );
      if (existingOrder.status == OrderStatus.WaitingForPrePay) {
        shouldPreauthValue = true;
      } else {
        shouldPreauthValue = false;
      }
      if (
        existingOrder.paymentMethod.mode != input.paymentMode ||
        (existingOrder.paymentMethod.mode == PaymentMode.PaymentGateway &&
          existingOrder.paymentMethod.id != input.gatewayId) ||
        (existingOrder.paymentMethod.mode == PaymentMode.SavedPaymentMethod &&
          existingOrder.paymentMethod.id != input.gatewayId)
      ) {
        await this.orderRedisService.updateOrderStatus(existingOrder.id, {
          paymentMethod: {
            id: input.gatewayId,
            mode: input.paymentMode,
          },
        });
      }
    }
    const paymentLink = await this.walletService.getPaymentLink({
      paymentMode: input.paymentMode,
      gatewayId: input.gatewayId,
      userId: this.context.req.user.id,
      amount: input.amount,
      payoutData: null,
      currency: input.currency,
      orderNumber: input.orderNumber,
      shouldPreauth: shouldPreauthValue,
    });
    return {
      status: IntentResultToTopUpWalletStatus(paymentLink.status),
      url: paymentLink.url,
    };
  }

  @Query(() => [PaymentMethodBase])
  async paymentMethods(): Promise<PaymentMethodBase[]> {
    const savedMethods = await this.walletService.getPaymentMethodsForClient({
      userId: this.context.req.user.id,
    });
    return savedMethods;
  }

  @Mutation(() => SetupPaymentMethodDto)
  async setupPaymentMethod(
    @Args('gatewayId', { type: () => ID }) gatewayId: number,
  ): Promise<SetupPaymentMethodDto> {
    const user = await this.customerRepo.findOneOrFail({
      where: { id: this.context.req.user.id },
      relations: {
        wallets: true,
      },
    });
    const walletsLargestBalance =
      user.wallets!.length > 0
        ? user.wallets!.reduce((prev, current) => {
            return prev.balance > current.balance ? prev : current;
          })
        : { balance: 0, currency: 'USD' };
    const obj: SetupSavedPaymentMethodDecryptedBody = {
      gatewayId: gatewayId.toString(),
      userType: 'rider',
      currency: walletsLargestBalance.currency ?? 'USD',
      userId: this.context.req.user.id.toString(),
      returnUrl: `${
        process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'
      }://`,
    };
    const encrypted = await this.cryptoService.encrypt(JSON.stringify(obj));
    const result = await firstValueFrom(
      this.httpService.post<IntentResult>(
        `${process.env.GATEWAY_SERVER_URL}/setup_saved_payment_method`,
        {
          token: encrypted,
        },
      ),
    );
    Logger.log(JSON.stringify(result.data), 'setupPaymentMethod');
    return result.data;
  }

  @Mutation(() => GiftCardDTO)
  async redeemGiftCard(
    @Args('code', { type: () => String }) code: string,
  ): Promise<GiftCardDTO> {
    const result = await this.commongGiftCardService.redeemGiftCard({
      code,
      userId: this.context.req.user.id,
      userType: 'rider',
    });
    return result;
  }

  @Mutation(() => [PaymentMethodBase])
  async markPaymentMethodAsDefault(
    @Args('id', { type: () => ID }) savedPaymentMethodId: number,
  ): Promise<PaymentMethodBase[]> {
    return this.walletService.markPaymentMethodAsDefault({
      userId: this.context.req.user.id,
      savedPaymentMethodId,
    });
  }

  @Mutation(() => Boolean)
  async deleteSavedPaymentMethod(
    @Args('id', { type: () => ID }) savedPaymentMethodId: number,
  ): Promise<boolean> {
    await this.walletService.deletePaymentMethod({
      userId: this.context.req.user.id,
      savedPaymentMethodId,
    });
    return true;
  }

  @Query(() => [RiderWalletDTO])
  async riderWallets(): Promise<RiderWalletDTO[]> {
    return this.walletService.getRiderWallets(this.context.req.user.id);
  }

  @Query(() => [RiderTransactionDTO])
  async riderTransactions(): Promise<RiderTransactionDTO[]> {
    return this.walletService.getRiderTransactions(this.context.req.user.id);
  }
}
