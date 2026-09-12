import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActiveOrderCommonRedisService,
  ActiveOrderRedisSnapshot,
  DriverDeductTransactionType,
  DriverEventType,
  RideOfferRedisService,
  DriverRedisSnapshot,
  SharedOrderService,
  TaxiServiceRedisService,
  OrderCancelReasonEntity,
  PubSubService,
  AnnouncementUserType,
  PaymentMethodInput,
  PaymentMode,
  FleetEntity,
  PaymentPayoutData,
  DriverRechargeTransactionType,
  ChatMessageRedisSnapshot,
  PlaceDTO,
  RideOfferRedisSnapshot,
} from '@ridy/database';
import { OrderStatus } from '@ridy/database';
import { PaymentStatus } from '@ridy/database';
import { ProviderRechargeTransactionType } from '@ridy/database';
import { RequestActivityType } from '@ridy/database';
import { RiderDeductTransactionType } from '@ridy/database';
import { TransactionAction } from '@ridy/database';
import { TransactionStatus } from '@ridy/database';
import { FeedbackEntity } from '@ridy/database';
import { PaymentEntity } from '@ridy/database';
import { RequestActivityEntity } from '@ridy/database';
import { TaxiOrderEntity } from '@ridy/database';
import { DriverNotificationService } from '@ridy/database';
import { SharedDriverService } from '@ridy/database';
import { SharedProviderService } from '@ridy/database';
import { SharedRiderService } from '@ridy/database';
import { ForbiddenError } from '@nestjs/apollo';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import { SubmitFeedbackInput } from './dto/submit-feedback.input';
import { SharedCustomerWalletService } from '@ridy/database';
import { DriverRedisService } from '@ridy/database';
import { ActiveOrderDTO } from './dto/active-order.dto';
import { RiderRedisService } from '@ridy/database';
import { DispatchService } from '../dispatcher';
import { PastOrderDTO } from './dto/past-order.dto';
import { OrderCancelReasonDTO } from './dto/cancel-reason.dto';
import {
  IntentResultToTopUpWalletStatus,
  TopUpWalletResponse,
  TopUpWalletStatus,
} from '../wallet/dto/top-up-wallet.input';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class RiderOrderService {
  constructor(
    @InjectRepository(TaxiOrderEntity)
    private orderRepository: Repository<TaxiOrderEntity>,
    @InjectRepository(RequestActivityEntity)
    private activityRepository: Repository<RequestActivityEntity>,
    @InjectRepository(FeedbackEntity)
    private feedbackRepository: Repository<FeedbackEntity>,
    @InjectRepository(OrderCancelReasonEntity)
    private cancelReasonRepository: Repository<OrderCancelReasonEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(FleetEntity)
    private fleetRepo: Repository<FleetEntity>,
    private riderService: SharedRiderService,
    private driverService: SharedDriverService,
    private rideOfferRedisService: RideOfferRedisService,
    private activeOrderRedisService: ActiveOrderCommonRedisService,
    private driverRedisService: DriverRedisService,
    private riderRedisService: RiderRedisService,
    private providerService: SharedProviderService,
    private sharedOrderService: SharedOrderService,
    private readonly serviceRedisService: TaxiServiceRedisService,
    private driverNotificationService: DriverNotificationService,
    private readonly pubsub: PubSubService,
    private readonly dispatchService: DispatchService,
    private httpService: HttpService,
    private readonly customerWalletService: SharedCustomerWalletService,
    private walletService: WalletService,
  ) {}

  async cancelOrder(input: {
    orderId: number;
    reasonId?: number;
    reason?: string;
  }): Promise<void> {
    const rideOffer = await this.rideOfferRedisService.getRideOfferMetadata(
      input.orderId.toString(),
    );
    if (rideOffer != null) {
      await this.rideOfferRedisService.rideOfferExpired({
        orderId: input.orderId.toString(),
      });
      this.dispatchService.expireOrder(input.orderId);
      for (const driverId of rideOffer.offeredToDriverIds || []) {
        this.pubsub.publish(
          'driver.event',
          {
            driverId: parseInt(driverId),
          },
          {
            type: DriverEventType.RideOfferRevoked,
            orderId: parseInt(rideOffer.id),
            driverId: parseInt(driverId),
          },
        );
      }
    } else {
      const activeOrder = await this.activeOrderRedisService.getActiveOrder(
        input.orderId.toString(),
      );
      if (activeOrder == null) {
        return;
      }
      const service = await this.serviceRedisService.getTaxiServiceById(
        activeOrder.serviceId,
      );
      const driver = await this.driverRedisService.getOnlineDriverMetaData(
        activeOrder.driverId,
      );
      const payments = await this.paymentRepo.find({
        where: {
          userType: 'rider',
          userId: activeOrder.riderId.toString(),
          status: PaymentStatus.Authorized,
          orderNumber: activeOrder.id.toString(),
        },
        order: { amount: 'DESC' },
      });
      if (service!.cancelationTotalFee > 0) {
        const riderCredit =
          await this.customerWalletService.getRiderCreditInCurrency(
            parseInt(activeOrder.riderId),
            activeOrder.currency,
          );
        if (riderCredit < service!.cancelationTotalFee) {
          await firstValueFrom(
            this.httpService.get<{ status: 'OK' | 'FAILED' }>(
              `${process.env.GATEWAY_SERVER_URL}/capture?id=${payments[0].transactionNumber}&amount=${service!.cancelationTotalFee}`,
            ),
          );
        }
        await Promise.all([
          this.customerWalletService.rechargeWallet({
            action: TransactionAction.Deduct,
            deductType: RiderDeductTransactionType.OrderFee,
            amount: -service!.cancelationTotalFee,
            currency: activeOrder.currency,
            riderId: parseInt(activeOrder.riderId),
            status: TransactionStatus.Done,
          }),
          this.driverService.rechargeWallet({
            action: TransactionAction.Deduct,
            deductType: DriverDeductTransactionType.Commission,
            amount: service!.cancelationFeeDriverShare,
            currency: activeOrder.currency,
            driverId: parseInt(activeOrder.driverId),
            status: TransactionStatus.Done,
          }),
          this.providerService.rechargeWallet({
            action: TransactionAction.Recharge,
            rechargeType: ProviderRechargeTransactionType.Commission,
            amount:
              service!.cancelationTotalFee - service!.cancelationFeeDriverShare,
            currency: activeOrder.currency,
          }),
        ]);
      }
      for (const payment of payments) {
        await firstValueFrom(
          this.httpService.get<{ status: 'OK' | 'FAILED' }>(
            `${process.env.GATEWAY_SERVER_URL}/cancel_preauth?id=${payment.transactionNumber}`,
          ),
        );
      }
      await this.sharedOrderService.saveActiveOrderToDisk(activeOrder, {
        finishTimestamp: new Date(),
        costAfterCoupon: 0,
        cancelReasonId: input.reasonId,
        cancelReasonNote: input.reason,
      });
      await this.activeOrderRedisService.deleteOrder(activeOrder.id);
      this.driverNotificationService.canceled(driver?.fcmTokens?.[0]);
      this.pubsub.publish(
        'driver.event',
        {
          driverId: parseInt(activeOrder.driverId),
        },
        {
          type: DriverEventType.ActiveOrderCompleted,
          driverId: parseInt(activeOrder.driverId),
          orderId: parseInt(activeOrder.id),
        },
      );
      this.activityRepository.insert({
        requestId: parseInt(activeOrder.id),
        type: RequestActivityType.CanceledByRider,
      });
    }
  }

  async submitReview(
    riderId: number,
    review: SubmitFeedbackInput,
  ): Promise<TaxiOrderEntity> {
    let order = await this.orderRepository.findOneByOrFail({
      id: review.requestId,
    });
    if (order.riderId != riderId) {
      throw new ForbiddenError('Not Allowed');
    }
    const previousReview = await this.feedbackRepository.findOne({
      where: { requestId: order.id },
      relations: {
        parameters: true,
      },
    });
    if (previousReview != null) {
      // Remove related parameter associations first to avoid FK constraint errors,
      // then delete the feedback record.
      if (
        Array.isArray(previousReview.parameters) &&
        previousReview.parameters.length > 0
      ) {
        const paramIds = previousReview.parameters.map((p: any) => p.id);
        await this.feedbackRepository
          .createQueryBuilder()
          .relation(FeedbackEntity, 'parameters')
          .of(previousReview.id)
          .remove(paramIds);
      }
      await this.feedbackRepository.delete(previousReview.id);
    }
    review.score = review.score > 5 ? review.score : review.score * 20;
    await this.feedbackRepository.save({
      ...review,
      driverId: order.driverId,
      requestId: order.id,
      parameters: (review.parameterIds ?? []).map((id) => ({ id })),
    });
    this.activityRepository.insert({
      requestId: order.id,
      type: RequestActivityType.Reviewed,
    });
    const reviews = await this.feedbackRepository.find({
      where: { driverId: order.driverId },
    });
    const averageRating = Math.round(
      reviews.reduce((total, next) => total + next.score, 0) / reviews.length,
    );
    await this.driverService.setRating(
      order.driverId!,
      averageRating,
      reviews.length,
    );
    if (review.addToFavorite == true) {
      await this.riderService.addDriverToFavoriteList({
        riderId,
        driverId: order.driverId!,
      });
    }
    await this.orderRepository.update(order.id, {
      status: OrderStatus.Finished,
    });
    order = await this.orderRepository.findOneByOrFail({
      id: review.requestId,
    });
    return order;
  }

  async getActiveOrders(riderId: number): Promise<ActiveOrderDTO[]> {
    Logger.debug(
      `getActiveOrders called for riderId=${riderId}`,
      'RiderOrderService',
    );
    const riderMetaData = await this.riderRedisService.getOnlineRider(
      riderId.toString(),
    );
    Logger.debug(
      `riderMetaData ${riderMetaData ? 'found' : 'not found'} for riderId=${riderId}`,
      'RiderOrderService',
    );

    if (
      !riderMetaData ||
      !Array.isArray(riderMetaData.activeOrderIds) ||
      riderMetaData.activeOrderIds.length === 0
    ) {
      Logger.debug(
        `No activeOrderIds for riderId=${riderId}`,
        'RiderOrderService',
      );
      return [];
    }

    const orderIds = riderMetaData.activeOrderIds;
    Logger.debug(
      `Active orderIds for riderId=${riderId}: ${JSON.stringify(orderIds)}`,
      'RiderOrderService',
    );

    // Fetch both sources
    const [activeOrders, rideOffers] = await Promise.all([
      this.activeOrderRedisService.getActiveOrders(orderIds),
      this.rideOfferRedisService.getRideOffers(
        orderIds.map((id) => id.toString()),
      ),
    ]);
    Logger.debug(
      `Fetched activeOrders=${activeOrders?.length ?? 0}, rideOffers=${rideOffers?.length ?? 0} for riderId=${riderId}`,
      'RiderOrderService',
    );

    // Build quick lookup maps
    const activeById = new Map(activeOrders.map((o) => [o.id, o]));
    const offerById = new Map(rideOffers.map((o) => [o.id, o]));

    // Build results in the rider's order sequence
    const results: ActiveOrderDTO[] = [];
    for (const orderId of orderIds) {
      const activeOrder = activeById.get(orderId);
      const rideOffer = offerById.get(orderId);

      if (!activeOrder && !rideOffer) {
        // Order might have been completed/canceled between reads; skip gracefully
        Logger.debug(
          `Order ${orderId} not found in activeOrders or rideOffers, skipping`,
          'RiderOrderService',
        );
        continue;
      }

      let dto: ActiveOrderDTO;

      if (activeOrder) {
        // Get driver meta if we have a driverId
        const driver =
          activeOrder.driverId != null
            ? await this.driverRedisService.getOnlineDriverMetaData(
                activeOrder.driverId,
              )
            : undefined;

        Logger.debug(
          `Processing activeOrder=${orderId}, driverId=${activeOrder.driverId ?? 'none'}, driverLoaded=${!!driver}`,
          'RiderOrderService',
        );

        dto = this.buildActiveOrderDTO(activeOrder, driver!);
      } else if (rideOffer) {
        Logger.debug(`Processing rideOffer=${orderId}`, 'RiderOrderService');

        dto = this.buildRideOfferDTO(rideOffer);
      }

      results.push(dto!);
    }

    Logger.debug(
      `Returning ${results.length} active orders for riderId=${riderId}`,
      'RiderOrderService',
    );
    return results;
  }

  buildActiveOrderDTO(
    order: ActiveOrderRedisSnapshot,
    driver?: DriverRedisSnapshot,
  ): ActiveOrderDTO {
    const chatMessages = Array.isArray(order?.chatMessages)
      ? order.chatMessages
      : [];
    const waypoints = Array.isArray(order?.waypoints) ? order.waypoints : [];
    const currentLegIndex = order.currentLegIndex ?? 0;

    // Choose directions based on status with fallbacks
    const status = order?.status ?? OrderStatus.Requested;
    const driverDirections = order?.driverDirections ?? [];
    const tripDirections = Array.isArray(order?.tripDirections)
      ? order.tripDirections
      : [];
    const directions = [
      OrderStatus.DriverAccepted,
      OrderStatus.Arrived,
    ].includes(status)
      ? driverDirections.length
        ? driverDirections
        : tripDirections
      : tripDirections.length
        ? tripDirections
        : driverDirections;

    // Compute next destination safely
    const nextPlace =
      waypoints[currentLegIndex] ?? waypoints[waypoints.length - 1] ?? null;

    const unreadMessagesCount = chatMessages.filter(
      (msg: any) => msg?.isFromDriver && msg?.seenByRiderAt == null,
    ).length;

    const fullName =
      driver?.firstName == null && driver?.lastName == null
        ? null
        : [driver?.firstName, driver?.lastName].filter(Boolean).join(' ');

    const dto: ActiveOrderDTO = {
      id: parseInt(order.id),
      driver:
        driver == null
          ? null
          : {
              fullName: fullName,
              rating: driver?.rating ?? 0,
              mobileNumber: driver?.mobileNumber ?? '0',
              location: driver?.location ?? undefined,
              profileImageUrl: driver?.avatarImageAddress ?? '',
              vehicleColor: driver?.vehicleColor ?? undefined,
              vehicleName: driver?.vehicleName ?? undefined,
              vehiclePlate: driver?.vehiclePlate ?? undefined,
            },
      type: order?.type,
      status,
      waitMinutes: order?.waitMinutes ?? 0,
      serviceName: order?.serviceName ?? '',
      serviceImageAddress: order?.serviceImageAddress ?? '',
      chatMessages: chatMessages.map((msg: ChatMessageRedisSnapshot) => ({
        createdAt:
          msg?.createdAt != null ? new Date(msg.createdAt) : new Date(),
        isFromMe: msg?.isFromDriver === false,
        seenAt: msg?.seenByDriverAt,
        message: msg?.content ?? '',
      })),
      estimatedDistance: order?.estimatedDistance ?? 0,
      estimatedDuration: order?.estimatedDuration ?? 0,
      options: Array.isArray(order?.options) ? order.options : [],
      createdAt: order?.createdAt,
      scheduledAt: order?.scheduledAt,
      pickupEta: order?.pickupEta,
      dropoffEta: order?.dropoffEta,
      waypoints,
      paymentMethod: order?.paymentMethod,
      totalCost: order?.costEstimateForRider ?? 0,
      currency: order?.currency ?? '',
      directions,
      nextDestination: nextPlace,
      unreadMessagesCount,
    };

    return dto;
  }

  buildRideOfferDTO(offer: RideOfferRedisSnapshot): ActiveOrderDTO {
    const waypoints = Array.isArray(offer?.waypoints) ? offer.waypoints : [];

    const dto: ActiveOrderDTO = {
      id: parseInt(offer.id),
      driver: undefined, // No driver assigned yet for ride offers
      type: offer?.type,
      status: offer?.status,
      waitMinutes: 0,
      serviceName: offer?.serviceName ?? '',
      serviceImageAddress: offer?.serviceImageAddress ?? '',
      chatMessages: [], // No chat messages for ride offers
      estimatedDistance: offer?.estimatedDistance ?? 0,
      estimatedDuration: offer?.estimatedDuration ?? 0,
      options: Array.isArray(offer?.options) ? offer.options : [],
      createdAt: offer?.createdAt,
      scheduledAt: offer?.scheduledAt,
      pickupEta: undefined,
      dropoffEta: undefined,
      waypoints,
      paymentMethod: offer?.paymentMethod,
      totalCost: offer?.costEstimateForRider ?? 0,
      currency: offer?.currency ?? '',
      directions: Array.isArray(offer?.tripDirections)
        ? offer.tripDirections
        : [],
      nextDestination: waypoints[0] ?? null,
      unreadMessagesCount: 0,
    };

    return dto;
  }

  async updateOrderWaitTime(
    orderId: number,
    waitTime: number,
  ): Promise<ActiveOrderRedisSnapshot> {
    const updatedOrder = await this.activeOrderRedisService.updateOrderWaitTime(
      orderId.toString(),
      waitTime,
    );
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      updatedOrder.driverId,
    );
    this.pubsub.publish(
      'driver.event',
      {
        driverId: parseInt(updatedOrder.driverId!),
      },
      {
        type: DriverEventType.ActiveOrderUpdated,
        orderId: parseInt(updatedOrder.id),
        driverId: parseInt(updatedOrder.driverId!),
        status: updatedOrder.status,
        waitTime: updatedOrder.waitMinutes,
        totalCost: updatedOrder.costEstimateForDriver,
      },
    );
    if (driver?.fcmTokens != null && driver?.fcmTokens?.length > 0) {
      this.driverNotificationService.message(
        driver?.fcmTokens?.[0] ?? '',
        `Wait time updated to ${updatedOrder.waitMinutes} minutes for order #${updatedOrder.id}`,
      );
    }
    return updatedOrder;
  }

  async applyCoupon(
    orderId: number,
    couponCode: string,
  ): Promise<ActiveOrderRedisSnapshot> {
    const orderMetadata = await this.activeOrderRedisService.getActiveOrder(
      orderId.toString(),
    );
    // TODO: Complete the coupon application logic
    return orderMetadata;
  }

  async getPastOrders(riderId: number): Promise<PastOrderDTO[]> {
    const orders = await this.orderRepository.find({
      order: { id: 'DESC' },
      where: { riderId, status: OrderStatus.Finished },
      take: 10,
      relations: {
        service: true,
        savedPaymentMethod: true,
        paymentGateway: true,
        driver: {
          car: true,
          carColor: true,
        },
      },
    });
    return orders.map((order) => {
      const pastOrder: PastOrderDTO = {
        id: order.id,
        driver:
          order.driver == null
            ? null
            : {
                id: order.driver!.id,
                fullName: order.driver?.fullName,
                mobileNumber: order.driver?.mobileNumber || '0',
                vehiclePlate: order.driver?.carPlate || '-',
                vehicleColor: order.driver?.carColor?.name || '-',
                vehicleName: order.driver?.car?.name || '-',
                rating: order.driver?.rating || 0,
              },
        status: order.status,
        waitMinutes: order.waitMinutes,
        serviceName: order.service?.name ?? '-',
        serviceImageAddress: order.service?.media.address ?? '-',
        type: order.type,
        currency: order.currency,
        createdAt: order.createdOn,
        estimatedDistance: order.distanceBest,
        estimatedDuration: order.durationBest,
        options: order.options ?? [],
        waypoints: order.waypoints(),
        totalCost: order.costAfterCoupon,
        couponDiscount: order.costBest - order.costAfterCoupon,
        directions: order.directions ?? [],
        paymentMethod: order.paymentMethod(),
      };
      return pastOrder;
    });
  }

  async getCancelReasons(): Promise<OrderCancelReasonDTO[]> {
    const reasons = await this.cancelReasonRepository.find({
      where: { isEnabled: true, userType: AnnouncementUserType.Rider },
    });
    return reasons.map((reason) => ({
      id: reason.id,
      title: reason.title,
    }));
  }

  async payForRide(input: {
    orderId: number;
    paymentMethod: PaymentMethodInput;
  }): Promise<TopUpWalletResponse> {
    const activeOrder = await this.activeOrderRedisService.getActiveOrder(
      input.orderId.toString(),
    );
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      activeOrder.driverId,
    );
    const rider = await this.riderRedisService.getOnlineRider(
      activeOrder.riderId,
    );
    let amountToApplyRiderWallet = 0;
    /// <summary>
    /// Calculate the total platform shares. Fleet and Provider together.
    /// </summary>
    let totalPlatformShare =
      activeOrder.costEstimateForRider - activeOrder.costEstimateForDriver;
    let amountToTopUpPlatformWallet =
      activeOrder.costEstimateForRider - activeOrder.costEstimateForDriver;
    let amountToTopUpFleetWallet = 0;
    if (activeOrder.fleetId) {
      const fleet = await this.fleetRepo.findOneByOrFail({
        id: parseInt(activeOrder.fleetId),
      });
      amountToTopUpFleetWallet =
        amountToTopUpPlatformWallet * (fleet.commissionSharePercent / 100) +
        fleet.commissionShareFlat;
      amountToTopUpPlatformWallet -= amountToTopUpFleetWallet;
    }
    switch (input.paymentMethod.mode) {
      case PaymentMode.Cash: {
        if ((driver?.walletCredit ?? 0) < totalPlatformShare) {
          throw new ForbiddenError(
            'Driver does not have enough credit to settle the ride with cash payment.',
          );
        }
        await this.driverService.rechargeWallet({
          action: TransactionAction.Deduct,
          deductType: DriverDeductTransactionType.Commission,
          amount: -totalPlatformShare,
          requestId: parseInt(activeOrder.id),
          status: TransactionStatus.Done,
          currency: activeOrder.currency,
          driverId: parseInt(activeOrder.driverId),
        });
        return {
          status: TopUpWalletStatus.OK,
        };
      }
      case PaymentMode.Wallet: {
        amountToApplyRiderWallet =
          activeOrder.costEstimateForRider - activeOrder.totalPaid;
        if ((rider?.walletCredit ?? 0) < amountToApplyRiderWallet) {
          throw new ForbiddenError(
            'Rider does not have enough credit to settle the ride with wallet payment.',
          );
        }
        await this.customerWalletService.rechargeWallet({
          amount: -activeOrder.costEstimateForRider,
          currency: activeOrder.currency,
          riderId: parseInt(activeOrder.riderId),
          action: TransactionAction.Deduct,
          deductType: RiderDeductTransactionType.OrderFee,
          status: TransactionStatus.Done,
        });
        this.driverService.rechargeWallet({
          action: TransactionAction.Recharge,
          rechargeType: DriverRechargeTransactionType.OrderFee,
          amount: activeOrder.costEstimateForDriver,
          requestId: parseInt(activeOrder.id),
          status: TransactionStatus.Done,
          currency: activeOrder.currency,
          driverId: parseInt(activeOrder.driverId),
        });
        return {
          status: TopUpWalletStatus.OK,
        };
        break;
      }
      case PaymentMode.PaymentGateway: {
        const gateway = await this.walletService.gatewayRepo.findOneByOrFail({
          id: input.paymentMethod.id!,
        });
        const driverDefaultPayoutMethod =
          await this.driverService.driverRepo.findOneOrFail({
            where: { id: parseInt(driver!.id) },
            relations: {
              defaultPayoutAccount: {
                payoutMethod: true,
              },
            },
          });
        let payoutData: PaymentPayoutData | null = null;
        if (
          gateway.type.toString() ==
            driverDefaultPayoutMethod.defaultPayoutAccount?.payoutMethod?.type?.toString() &&
          gateway.privateKey ==
            driverDefaultPayoutMethod.defaultPayoutAccount.payoutMethod
              .privateKey &&
          driverDefaultPayoutMethod.defaultPayoutAccount.payoutMethod
            .isInstantPayoutEnabled
        ) {
          payoutData = {
            platformFee: totalPlatformShare,
            destinationAccount:
              driverDefaultPayoutMethod.defaultPayoutAccount.accountNumber!,
          };
        }
        const paymentLink = await this.walletService.getPaymentLink({
          paymentMode: PaymentMode.PaymentGateway,
          gatewayId: input.paymentMethod.id!,
          userId: parseInt(activeOrder.riderId),
          amount: activeOrder.costEstimateForRider - activeOrder.totalPaid,
          currency: activeOrder.currency,
          payoutData: payoutData,
          orderNumber: activeOrder.id.toString(),
          shouldPreauth: activeOrder.status === OrderStatus.WaitingForPrePay,
        });
        return {
          status: IntentResultToTopUpWalletStatus(paymentLink.status),
          url: paymentLink.url,
        };
      }
      case PaymentMode.SavedPaymentMethod: {
        const gateway =
          await this.walletService.savedPaymentMethodRepo.findOneOrFail({
            where: { id: input.paymentMethod.id! },
            relations: {
              paymentGateway: true,
            },
          });
        const driverDefaultPayoutMethod =
          await this.driverService.driverRepo.findOneOrFail({
            where: { id: parseInt(driver!.id) },
            relations: {
              defaultPayoutAccount: {
                payoutMethod: true,
              },
            },
          });
        let payoutData: PaymentPayoutData | null = null;
        if (
          gateway.type.toString() ==
            driverDefaultPayoutMethod.defaultPayoutAccount?.payoutMethod?.type?.toString() &&
          gateway.paymentGateway?.privateKey ==
            driverDefaultPayoutMethod.defaultPayoutAccount.payoutMethod
              .privateKey &&
          driverDefaultPayoutMethod.defaultPayoutAccount.payoutMethod
            .isInstantPayoutEnabled
        ) {
          payoutData = {
            platformFee: totalPlatformShare,
            destinationAccount:
              driverDefaultPayoutMethod.defaultPayoutAccount.accountNumber!,
          };
        }
        const paymentLink = await this.walletService.getPaymentLink({
          paymentMode: PaymentMode.PaymentGateway,
          gatewayId: input.paymentMethod.id!,
          userId: parseInt(activeOrder.riderId),
          amount: activeOrder.costEstimateForRider - activeOrder.totalPaid,
          currency: activeOrder.currency,
          payoutData: payoutData,
          orderNumber: activeOrder.id.toString(),
          shouldPreauth: activeOrder.status === OrderStatus.WaitingForPrePay,
        });
        return {
          status: IntentResultToTopUpWalletStatus(paymentLink.status),
          url: paymentLink.url,
        };
      }
    }
  }

  async getRecentPlaces(riderId: number): Promise<PlaceDTO[]> {
    // Get recent orders destinations and dedup them
    const orders = await this.orderRepository.find({
      where: { riderId },
      order: { id: 'DESC' },
      take: 10,
    });
    const places = orders.map((o) => o.places());
    const flatPlaces = places.flat();
    const dedupedPlaces = flatPlaces.filter(
      (place, index, self) =>
        index === self.findIndex((p) => p.address === place.address) &&
        place.address,
    );
    return dedupedPlaces;
  }
}
