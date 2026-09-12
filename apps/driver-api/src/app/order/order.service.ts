import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActiveOrderCommonRedisService,
  ActiveOrderRedisSnapshot,
  AnnouncementUserType,
  ChatMessageRedisSnapshot,
  DriverEventType,
  DriverRedisService,
  GoogleServicesService,
  OrderCancelReasonEntity,
  PaymentMode,
  PubSubService,
  RequestActivityType,
  RiderEphemeralMessageType,
  RiderNotificationService,
  RiderOrderUpdateType,
  RiderRedisService,
  SharedOrderService,
  WaypointBase,
} from '@ridy/database';
import { OrderStatus } from '@ridy/database';
import { PaymentStatus } from '@ridy/database';
import { PaymentEntity } from '@ridy/database';
import { RequestActivityEntity } from '@ridy/database';
import { TaxiOrderEntity } from '@ridy/database';
import { RideOfferRedisService } from '@ridy/database';
import { ForbiddenError } from '@nestjs/apollo';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { DriverEntity } from '@ridy/database';
import { RiderReviewInput } from './dto/rider-review.input';
import { RiderReviewEntity } from '@ridy/database';
import { CustomerEntity } from '@ridy/database';
import { ActiveOrderDTO } from './dto/active-order.dto';
import { UpdateStatusDTO } from './dto/update-status.dto';
import { PastOrderDTO } from './dto/past-order.dto';
import { OrderCancelReasonDTO } from './dto/cancel-reason.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(TaxiOrderEntity)
    public orderRepository: Repository<TaxiOrderEntity>,
    @InjectRepository(RequestActivityEntity)
    public activityRepository: Repository<RequestActivityEntity>,
    @InjectRepository(PaymentEntity)
    public paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(RiderReviewEntity)
    public reviewRepository: Repository<RiderReviewEntity>,
    @InjectRepository(DriverEntity)
    public driverRepository: Repository<DriverEntity>,
    @InjectRepository(CustomerEntity)
    public riderRepository: Repository<CustomerEntity>,
    @InjectRepository(OrderCancelReasonEntity)
    public cancelReasonRepository: Repository<OrderCancelReasonEntity>,
    private googleServices: GoogleServicesService,
    private sharedOrderService: SharedOrderService,
    private rideOfferRedisService: RideOfferRedisService,
    private activeOrderRedisService: ActiveOrderCommonRedisService,
    private readonly driverRedisService: DriverRedisService,
    private riderRedisService: RiderRedisService,
    private readonly pubsub: PubSubService,
    private httpService: HttpService,
    private riderNotificationService: RiderNotificationService,
  ) {}

  async submitReview(
    input: RiderReviewInput & { driverId: number },
  ): Promise<void> {
    const order = await this.orderRepository.findOneBy({
      id: input.orderId,
      driverId: input.driverId,
    });
    if (order == null) {
      throw new ForbiddenError('ORDER_NOT_FOUND');
    }
    if (order.status != OrderStatus.Finished) {
      throw new ForbiddenError('ORDER_NOT_FINISHED');
    }
    const review = await this.reviewRepository.findOneBy({
      orderId: order.id,
    });
    if (review != null) {
      throw new ForbiddenError('ALREADY_REVIEWED');
    }
    const rider = await this.riderRepository.findOneBy({
      id: order.riderId,
    });
    if (rider == null) {
      throw new ForbiddenError('RIDER_NOT_FOUND');
    }
    const newReview = this.reviewRepository.create({
      orderId: order.id,
      riderId: rider.id,
      driverId: order.driverId,
      score: input.score,
      description: input.description,
    });
    await this.reviewRepository.save(newReview);
  }

  async acceptRideOffer(input: {
    orderId: number;
    driverId: number;
  }): Promise<ActiveOrderDTO> {
    const orderMetadata = await this.rideOfferRedisService.getRideOfferMetadata(
      input.orderId.toString(),
    );
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      input.driverId.toString(),
    );
    if (driver == null) {
      throw new ForbiddenError(`Driver with ID ${input.driverId} not found`);
    }
    const rider = await this.riderRedisService.getOnlineRider(
      orderMetadata!.riderId,
    );
    if (!orderMetadata) {
      throw new ForbiddenError(`Order with ID ${input.orderId} not found`);
    }
    const driverTravelMetrics =
      driver?.location != null
        ? await this.googleServices.getSumDistanceAndDuration([
            driver.location,
            orderMetadata.waypoints[0].location,
          ])
        : { distance: 0, duration: 0, directions: [] };
    const tripTravelMetrics =
      await this.googleServices.getSumDistanceAndDuration(
        orderMetadata.waypoints.map((w) => w.location),
      );
    const pickupEta = new Date(
      new Date().getTime() + driverTravelMetrics.duration * 1000,
    );
    const dropoffEta = new Date(
      pickupEta.getTime() + tripTravelMetrics.duration * 1000,
    );
    await this.rideOfferRedisService.acceptOfferByDriver({
      orderId: input.orderId.toString(),
      driverId: input.driverId.toString(),
      pickupEta,
      dropoffEta,
      driverDirections: driverTravelMetrics.directions,
    });
    this.orderRepository.update(input.orderId, {
      status: OrderStatus.DriverAccepted,
      driverId: input.driverId,
    });
    for (const driverId of orderMetadata.offeredToDriverIds) {
      this.pubsub.publish(
        'driver.event',
        {
          driverId: parseInt(driverId),
        },
        {
          type: DriverEventType.RideOfferRevoked,
          orderId: input.orderId,
          driverId: parseInt(driverId),
        },
      );
    }
    if (rider?.fcmTokens?.[0]) {
      this.riderNotificationService.accepted(rider?.fcmTokens?.[0]);
    }
    this.pubsub.publish(
      'rider.order.updated',
      {
        riderId: parseInt(rider!.id),
      },
      {
        type: RiderOrderUpdateType.DriverAssigned,
        driver: {
          ...driver,
          mobileNumber: driver!.mobileNumber,
          fullName:
            driver!.firstName == null && driver!.lastName == null
              ? null
              : [driver!.firstName, driver!.lastName].filter(Boolean).join(' '),
          profileImageUrl: driver!.avatarImageAddress,
          vehicleName: driver!.vehicleName,
          vehicleColor: driver!.vehicleColor,
          vehiclePlate: driver!.vehiclePlate,
          location: driver!.location,
        },
        orderId: input.orderId,
        status: OrderStatus.DriverAccepted,
        driverLocation: driver.location,
        pickupEta: pickupEta,
        directions: tripTravelMetrics.directions,

        riderId: parseInt(rider!.id),
      },
    );
    const activeOrder = await this.activeOrderRedisService.getActiveOrder(
      input.orderId.toString(),
    );
    const dto = this.convertToActiveOrderDTO(activeOrder, rider);
    return dto;
  }

  async rejectRideOffer(input: {
    orderId: number;
    driverId: number;
  }): Promise<boolean> {
    await this.rideOfferRedisService.rideOfferRejected({
      orderId: input.orderId.toString(),
      driverId: input.driverId.toString(),
    });
    return true;
  }

  async arrivedToPickup(input: {
    orderId: number;
    driverId: number;
  }): Promise<UpdateStatusDTO> {
    const order = await this.activeOrderRedisService.getActiveOrder(
      input.orderId.toString(),
    );
    await this.activeOrderRedisService.updateOrderStatus(
      input.orderId.toString(),
      {
        status: OrderStatus.Arrived,
      },
    );
    this.activityRepository.insert({
      requestId: parseInt(order.id),
      type: RequestActivityType.ArrivedToPickupPoint,
    });
    this.orderRepository.update(order.id, { status: OrderStatus.Arrived });

    const rider = await this.riderRedisService.getOnlineRider(order.riderId);
    this.pubsub.publish(
      'rider.order.updated',
      {
        riderId: parseInt(order.riderId),
      },
      {
        type: RiderOrderUpdateType.StatusUpdated,
        orderId: input.orderId,
        riderId: parseInt(order.riderId),
        status: OrderStatus.Arrived,
      },
    );
    this.riderNotificationService.arrived(rider?.fcmTokens?.[0]);
    return {
      orderId: input.orderId,
      status: OrderStatus.Arrived,
    };
  }

  async initiateRide(input: {
    orderId: number;
    driverId: number;
  }): Promise<UpdateStatusDTO> {
    const order = await this.activeOrderRedisService.getActiveOrder(
      input.orderId.toString(),
    );
    order.currentLegIndex = 1;
    const rider = await this.riderRedisService.getOnlineRider(order.riderId);
    this.orderRepository.update(order.id, { status: OrderStatus.Started });
    await this.activeOrderRedisService.updateOrderStatus(
      input.orderId.toString(),
      {
        status: OrderStatus.Started,
        currentLegIndex: 1,
      },
    );
    this.pubsub.publish(
      'rider.order.updated',
      {
        riderId: parseInt(order.riderId),
      },
      {
        type: RiderOrderUpdateType.StatusUpdated,
        orderId: input.orderId,
        riderId: parseInt(order.riderId),
        status: OrderStatus.Started,
        directions: order.tripDirections,
      },
    );
    this.riderNotificationService.started(rider?.fcmTokens?.[0]);
    return {
      orderId: input.orderId,
      status: OrderStatus.Started,
      directions: order.tripDirections,
      nextDestination:
        this.createNextDestination(order.waypoints, order.currentLegIndex) ??
        undefined,
    };
  }

  async arrivedToDestination(input: {
    orderId: number;
    driverId: number;
  }): Promise<UpdateStatusDTO> {
    Logger.debug(
      `Driver ${input.driverId} arrived to destination for order ${input.orderId}`,
      'OrderService.arrivedToDestination',
    );

    let order = await this.activeOrderRedisService.getActiveOrder(
      input.orderId.toString(),
    );
    if (order.driverId !== input.driverId.toString()) {
      throw new Error('Driver is not authorized to update this order');
    }
    const nextDestination = this.createNextDestination(
      order.waypoints,
      order.currentLegIndex,
    );
    const isLastArrivalLeg =
      order.currentLegIndex >= order.waypoints.length - 1;

    Logger.debug(
      `Order ${input.orderId}: isLastArrivalLeg=${isLastArrivalLeg}, currentLegIndex=${order.currentLegIndex}, waypoints=${order.waypoints.length}`,
      'OrderService.arrivedToDestination',
    );

    if (isLastArrivalLeg) {
      this.activityRepository.insert({
        requestId: parseInt(order.id),
        type: RequestActivityType.ArrivedToDestination,
      });
      const finishResult = await this.sharedOrderService.finish(
        parseInt(order.id),
        0,
        false,
      );
      if (finishResult == null) {
        this.askRiderForReview(order);
      }
      this.pubsub.publish(
        'rider.order.updated',
        {
          riderId: parseInt(order.riderId),
        },
        {
          type: RiderOrderUpdateType.StatusUpdated,
          orderId: parseInt(order.id),
          riderId: parseInt(order.riderId),
          status: OrderStatus.WaitingForPostPay,
        },
      );
      return {
        orderId: input.orderId,
        totalCost: finishResult == null ? null : order.costEstimateForRider,
        status:
          finishResult == null
            ? OrderStatus.Finished
            : OrderStatus.WaitingForPostPay,
        nextDestination:
          finishResult == null ? null : (nextDestination ?? undefined),
      };
    } else {
      this.pubsub.publish(
        'rider.order.updated',
        {
          riderId: parseInt(order.riderId),
        },
        {
          type: RiderOrderUpdateType.StatusUpdated,
          orderId: input.orderId,
          riderId: parseInt(order.riderId),
          status: OrderStatus.Started,
          nextDestination: nextDestination ?? undefined,
        },
      );
      Logger.debug(
        `Order ${input.orderId} continuing to next leg ${order.currentLegIndex + 1}`,
        'OrderService.arrivedToDestination',
      );

      await this.activeOrderRedisService.updateOrderStatus(
        input.orderId.toString(),
        {
          currentLegIndex: order.currentLegIndex + 1,
        },
      );
      return {
        orderId: input.orderId,
        status: OrderStatus.Started,
        nextDestination: nextDestination ?? undefined,
      };
    }
  }

  private async askRiderForReview(order: ActiveOrderRedisSnapshot) {
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      order.driverId,
    );
    await this.riderRedisService.createEphemeralMessage(order.riderId, {
      type: RiderEphemeralMessageType.RateDriver,
      orderId: parseInt(order.id),
      serviceImageUrl: order!.serviceImageAddress,
      serviceName: order.serviceName,
      vehicleName: driver?.vehicleName ?? null,
      driverFullName:
        driver?.firstName == null && driver?.lastName == null
          ? null
          : [driver?.firstName, driver?.lastName].filter(Boolean).join(' '),
      driverProfileUrl: driver?.avatarImageAddress ?? null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    });
  }

  private createNextDestination(
    waypoints: WaypointBase[],
    currentLegIndex: number,
  ): WaypointBase | null {
    if (!waypoints || waypoints.length === 0) {
      return null;
    }
    const nextPlace =
      waypoints[currentLegIndex] ?? waypoints[waypoints.length - 1] ?? null;
    return nextPlace;
  }

  async getActiveOrders(driverId: number): Promise<ActiveOrderDTO[]> {
    const driverMeta = await this.driverRedisService.getOnlineDriverMetaData(
      driverId.toString(),
    );
    Logger.debug(driverMeta);
    if (
      !driverMeta ||
      !Array.isArray(driverMeta.activeOrderIds) ||
      driverMeta.activeOrderIds.length === 0
    ) {
      return [];
    }
    const orders = await this.activeOrderRedisService.getActiveOrders(
      driverMeta.activeOrderIds,
    );

    return Promise.all(
      orders.map(async (order) => {
        const rider = await this.riderRedisService.getOnlineRider(
          order.riderId.toString(),
        );
        return this.convertToActiveOrderDTO(order, rider);
      }),
    );
  }

  private convertToActiveOrderDTO(
    order: ActiveOrderRedisSnapshot,
    rider: any,
  ): ActiveOrderDTO {
    const chatMessages = Array.isArray(order?.chatMessages)
      ? order.chatMessages
      : [];
    const waypoints = Array.isArray(order?.waypoints) ? order.waypoints : [];
    const currentLegIndex = Math.max(
      0,
      Math.min(
        Number(order?.currentLegIndex ?? 0),
        Math.max(0, waypoints.length - 1),
      ),
    );

    // Choose directions based on status with fallbacks
    const status = order?.status;
    const driverDirections = Array.isArray(order?.driverDirections)
      ? order.driverDirections
      : [];
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
    const nextDestination = this.createNextDestination(
      waypoints,
      currentLegIndex,
    );
    const unreadMessagesCount = chatMessages.filter(
      (msg: any) => !msg.isFromDriver && msg.seenByDriverAt == null,
    ).length;

    return {
      id: parseInt(order.id),
      type: order.type,
      waitMinutes: order.waitMinutes,
      currency: order.currency,
      rider: rider
        ? {
            fullName:
              rider.firstName == null && rider.lastName == null
                ? null
                : [rider.firstName, rider.lastName].filter(Boolean).join(' '),
            mobileNumber: rider.mobileNumber,
            profileImageUrl: rider.avatarImageAddress,
          }
        : undefined,
      createdAt: order.createdAt,
      estimatedDistance: order.estimatedDistance,
      estimatedDuration: order.estimatedDuration,
      scheduledAt: order.scheduledAt,
      pickupEta: order.pickupEta,
      dropoffEta: order.dropoffEta,
      status: order.status,
      serviceName: order.serviceName,
      serviceImageAddress: order.serviceImageAddress,
      chatMessages: chatMessages.map((msg: ChatMessageRedisSnapshot) => ({
        message: msg.content,
        createdAt: msg.createdAt != null ? new Date(msg.createdAt) : new Date(),
        isFromMe: msg.isFromDriver,
      })),
      options: order.options ?? [],
      waypoints: waypoints,
      totalCost: order.costEstimateForDriver ?? 0,
      paymentMethod: order.paymentMethod,
      couponDiscount: order.couponDiscount,
      directions: directions ?? [],
      unreadMessagesCount,
      nextDestination: nextDestination ?? undefined,
    };
  }

  async cancelRide(input: {
    orderId: number;
    driverId: number;
    reasonId: number;
    reasonNote: string | null;
  }): Promise<UpdateStatusDTO> {
    const order = await this.activeOrderRedisService.getActiveOrder(
      input.orderId.toString(),
    );
    if (!order) {
      throw new Error(`Order with ID ${input.orderId} not found`);
    }
    if (order.driverId !== input.driverId.toString()) {
      throw new Error(
        `Driver with ID ${input.driverId} is not assigned to order ${input.orderId}`,
      );
    }
    await this.orderRepository.update(order.id, {
      status: OrderStatus.DriverCanceled,
      finishTimestamp: new Date(),
      costAfterCoupon: 0,
    });
    const payments = await this.paymentRepository.find({
      where: {
        userType: 'rider',
        userId: order.riderId.toString(),
        status: PaymentStatus.Authorized,
        orderNumber: order.id.toString(),
      },
      order: { id: 'DESC' },
    });
    for (const payment of payments) {
      await firstValueFrom(
        this.httpService.get<{ status: 'OK' | 'FAILED' }>(
          `${process.env.GATEWAY_SERVER_URL}/cancel_preauth?id=${payment.transactionNumber}`,
        ),
      );
    }
    this.closeOrder(order, OrderStatus.DriverCanceled);
    return {
      orderId: input.orderId,
      status: OrderStatus.DriverCanceled,
    };
  }

  async getPastOrders(
    driverId: number,
    page: number | undefined,
    limit: number | undefined,
  ): Promise<PastOrderDTO[]> {
    const orders = await this.orderRepository.find({
      where: { driverId },
      order: { id: 'DESC' },
      take: limit,
      skip: page ? page * (limit ?? 0) : 0,
      relations: {
        service: true,
        options: true,
        rider: {
          media: true,
        },
      },
    });
    return orders.map((order) => {
      return {
        id: order.id,
        type: order.type,
        waitMinutes: order.waitMinutes,
        currency: order.currency,
        createdAt: order.createdOn,
        rider: {
          firstName: order.rider?.firstName,
          profileImageUrl: order.rider?.media?.address,
        },
        estimatedDistance: order.distanceBest,
        estimatedDuration: order.durationBest,
        scheduledAt: order.expectedTimestamp,
        pickupEta: order.pickupEta,
        dropoffEta: order.dropOffEta,
        status: order.status,
        serviceName: order.service?.name ?? '-',
        serviceImageAddress: order.service?.media.address ?? '',
        options: order.options ?? [],
        waypoints:
          order.points.map((point) => ({
            point: point,
            address: order.addresses[order.points.indexOf(point)],
          })) ?? [],
        totalCost: order.costAfterCoupon - (order.providerShare ?? 0),
        paymentMode: order.paymentMode ?? PaymentMode.Cash,
        directions: order.directions ?? [],
      };
    });
  }

  async getCancelReasons(): Promise<OrderCancelReasonDTO[]> {
    const cancelReasons = await this.cancelReasonRepository.find({
      where: { isEnabled: true, userType: AnnouncementUserType.Driver },
    });
    return cancelReasons.map((reason) => ({
      id: reason.id,
      title: reason.title,
    }));
  }

  private async closeOrder(
    order: ActiveOrderRedisSnapshot,
    status: OrderStatus,
  ) {
    this.sharedOrderService.saveActiveOrderToDisk({
      ...order,
      status,
    });
    this.pubsub.publish(
      'rider.order.updated',
      {
        riderId: parseInt(order.riderId),
      },
      {
        type:
          status === OrderStatus.Finished
            ? RiderOrderUpdateType.OrderCompleted
            : status === OrderStatus.DriverCanceled
              ? RiderOrderUpdateType.DriverCancelled
              : RiderOrderUpdateType.OrderCompleted,
        orderId: parseInt(order.id),
        riderId: parseInt(order.riderId),
        status: status,
      },
    );
    if (status === OrderStatus.Finished) {
      this.askRiderForReview(order);
    }
    if (status === OrderStatus.DriverCanceled) {
      await this.riderRedisService.createEphemeralMessage(order.riderId, {
        type: RiderEphemeralMessageType.DriverCanceled,
        orderId: parseInt(order.id),
        serviceImageUrl: order!.serviceImageAddress,
        serviceName: order.serviceName,
        vehicleName: null,
        driverFullName: null,
        driverProfileUrl: null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      });
    }
    await this.activeOrderRedisService.deleteOrder(order.id);
  }

  async riderPaidInCash(input: {
    orderId: number;
    driverId: number;
  }): Promise<UpdateStatusDTO> {
    let order = await this.activeOrderRedisService.getActiveOrder(
      input.orderId.toString(),
    );
    if (!order) {
      throw new Error(`Order with ID ${input.orderId} not found`);
    }
    if (order.driverId !== input.driverId.toString()) {
      throw new Error(
        `Driver with ID ${input.driverId} is not assigned to order ${input.orderId}`,
      );
    }
    this.activeOrderRedisService.updateOrderStatus(input.orderId.toString(), {
      paymentMethod: {
        mode: PaymentMode.Cash,
      },
    });
    this.closeOrder(order, OrderStatus.Finished);
    return {
      status: OrderStatus.Finished,
      orderId: input.orderId,
    };
  }
}
