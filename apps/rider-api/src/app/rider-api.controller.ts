import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Logger,
  Query,
  UploadedFile,
} from '@nestjs/common';
import {
  ActiveOrderCommonRedisService,
  DriverEventType,
  PubSubService,
  RiderOrderUpdateType,
  RiderRechargeTransactionType,
  UploadImageInterceptor,
} from '@ridy/database';
import { TransactionAction } from '@ridy/database';
import { TransactionStatus } from '@ridy/database';
import { Response, Request } from 'express';

import { RestJwtAuthGuard } from './auth/rest-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerEntity } from '@ridy/database';
import { Repository } from 'typeorm';
import { MediaEntity } from '@ridy/database';
import { CryptoService } from '@ridy/database';
import { SharedOrderService } from '@ridy/database';
import { OrderStatus } from '@ridy/database';
import { PaymentEntity } from '@ridy/database';
import { SharedCustomerWalletService } from '@ridy/database';
import urlJoin from 'proper-url-join';
import { version } from '../../../../package.json';

@Controller()
export class RiderAPIController {
  constructor(
    private readonly sharedCustomerWalletService: SharedCustomerWalletService,
    private sharedOrderService: SharedOrderService,
    private activeOrderRedisService: ActiveOrderCommonRedisService,
    private cryptoService: CryptoService,
    private readonly pubsub: PubSubService,
    @InjectRepository(CustomerEntity)
    private riderRepository: Repository<CustomerEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(MediaEntity)
    private mediaRepository: Repository<MediaEntity>,
  ) {}

  @Get()
  async defaultPath(@Res() res: Response) {
    res.send(`✅ Rider API microservice running.\nVersion: ${version}`);
  }

  @Get('payment_result')
  async verifyPayment(
    @Query() query: { token: string; redirect: '1' | '0' },
    @Res() res: Response,
  ): Promise<void> {
    const token = query.token;
    const decrypted = await this.cryptoService.decrypt(token);
    Logger.log('Payment:' + JSON.stringify(decrypted));

    if (decrypted.userType == 'client' || decrypted.userType == 'rider') {
      if (decrypted.status == 'success') {
        await this.sharedCustomerWalletService.rechargeWallet({
          riderId: decrypted.userId,
          amount: decrypted.amount,
          currency: decrypted.currency,
          refrenceNumber: decrypted.transactionNumber,
          action: TransactionAction.Recharge,
          rechargeType: RiderRechargeTransactionType.InAppPayment,
          paymentGatewayId: decrypted.gatewayId,
          status: TransactionStatus.Done,
        });
        await this.paymentRepository.delete({
          transactionNumber: decrypted.transactionNumber,
        });
        const order =
          decrypted.orderId == null
            ? null
            : await this.activeOrderRedisService.getActiveOrder(
                decrypted.orderId!,
              );
        if (order?.status == OrderStatus.WaitingForPostPay) {
          await this.sharedOrderService.finish(order.id, 0, true);
          this.publishOrderStatusUpdate({
            orderId: order!.id,
            riderId: order!.riderId,
            driverId: order!.driverId!,
            status: order!.status,
          });
        } else if (order?.status == OrderStatus.WaitingForPrePay) {
          await this.sharedOrderService.processPrePay(order.id);
          this.publishOrderStatusUpdate({
            orderId: order.id,
            riderId: order.riderId,
            driverId: order.driverId!,
            status: order.status,
          });
        }
        if (query.redirect == null || query.redirect == '1')
          res.redirect(
            301,
            `${
              process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'
            }://`,
          );
        res.send(
          'Transaction successful. Close this page and go back to the app.',
        );
      } else if (decrypted.status == 'authorized') {
        const order =
          decrypted.orderId == null
            ? null
            : await this.activeOrderRedisService.getActiveOrder(
                decrypted.orderId!,
              );
        if (!order) {
          res.status(404).send('Order not found');
        }
        await this.sharedOrderService.processPrePay(
          order!.id,
          decrypted.amount,
        );
        this.publishOrderStatusUpdate({
          orderId: order!.id,
          riderId: order!.riderId,
          driverId: order!.driverId!,
          status: order!.status,
        });
        res.redirect(
          301,
          `${
            process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'
          }://`,
        );
      } else {
        res.redirect(
          301,
          `${
            process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'
          }://`,
        );
      }
    }
  }

  @Get('saved_payment_method_charged')
  async savedPaymentMethodCharged(
    @Query() query: { token: string; redirect: '1' | '0' },
    @Res() res: Response,
  ) {
    const token = query.token;
    const decrypted = await this.cryptoService.decrypt(token);
    const payment = await this.paymentRepository.findOneOrFail({
      where: { transactionNumber: decrypted.transactionNumber },
    });
    if (decrypted.status == 'success') {
      await this.sharedCustomerWalletService.rechargeWallet({
        riderId: parseInt(payment.userId),
        amount: payment.amount,
        currency: payment.currency,
        refrenceNumber: payment.transactionNumber,
        action: TransactionAction.Recharge,
        rechargeType: RiderRechargeTransactionType.InAppPayment,
        paymentGatewayId: payment.gatewayId,
        savedPaymentMethodId: payment.savedPaymentMethodId,
        status: TransactionStatus.Done,
      });
      await this.paymentRepository.delete({
        transactionNumber: decrypted.transactionNumber,
      });
      const order =
        decrypted.orderId == null
          ? null
          : await this.activeOrderRedisService.getActiveOrder(
              decrypted.orderId!,
            );
      if (order?.status == OrderStatus.WaitingForPostPay) {
        const updatedOrder = await this.sharedOrderService.finish(
          order.id,
          0,
          true,
        );
        this.publishOrderStatusUpdate({
          orderId: order!.id,
          riderId: order!.riderId,
          driverId: order!.driverId!,
          status: updatedOrder?.status ?? OrderStatus.Finished,
        });
      } else if (order?.status == OrderStatus.WaitingForPrePay) {
        await this.sharedOrderService.processPrePay(order.id);
        this.publishOrderStatusUpdate({
          orderId: order.id,
          riderId: order.riderId,
          driverId: order.driverId!,
          status: OrderStatus.Requested,
        });
      }
    } else if (decrypted.status == 'authorized') {
      const order =
        decrypted.orderId == null
          ? null
          : await this.activeOrderRedisService.getActiveOrder(
              decrypted.orderId!,
            );
      if (!order) {
        res.status(404).send('Order not found');
        return;
      }
      await this.sharedOrderService.processPrePay(order!.id, decrypted.amount);
      this.publishOrderStatusUpdate({
        orderId: order.id,
        riderId: order.riderId,
        driverId: order.driverId!,
        status: order.status,
      });
    }
    if (query.redirect == null || query.redirect == '1') {
      res.redirect(
        301,
        `${process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'}://`,
      );
    } else {
      res.send(
        'Transaction successful. Close this page and go back to the app.',
      );
    }
  }

  @Get('success_attach')
  async successAttach(@Req() req: Request, @Res() res: Response) {
    res.redirect(
      301,
      `${process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'}://`,
    );
  }

  private async publishOrderStatusUpdate(input: {
    orderId: number;
    driverId: number;
    riderId: number;
    status: OrderStatus;
  }) {
    this.pubsub.publish(
      'rider.order.updated',
      {
        riderId: input.riderId,
      },
      {
        type: RiderOrderUpdateType.StatusUpdated,
        orderId: input.orderId,
        riderId: input.riderId,
        status: input.status,
      },
    );
    this.pubsub.publish(
      'driver.event',
      {
        driverId: input.driverId,
      },
      {
        type: DriverEventType.ActiveOrderUpdated,
        orderId: input.orderId,
        driverId: input.driverId,
        status: input.status,
      },
    );
  }

  @Post('upload_profile')
  @UseGuards(RestJwtAuthGuard)
  @UploadImageInterceptor('file')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const fileUrl =
      file.path && file.path.startsWith('http')
        ? file.path
        : urlJoin(process.env.CDN_URL, file.filename);
    const insert = await this.mediaRepository.insert({
      address: fileUrl,
    });
    await this.riderRepository.update((req as unknown as any).user.id, {
      mediaId: insert.raw.insertId,
    });
    res.send({
      __typename: 'Media',
      id: insert.raw.insertId.toString(),
      address: fileUrl,
    });
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
