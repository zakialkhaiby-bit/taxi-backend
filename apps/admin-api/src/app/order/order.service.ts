import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActiveOrderCommonRedisService,
  ActiveOrderRedisSnapshot,
  DriverEventPayload,
  DriverEventSubscriptionName,
  DriverEventType,
  DriverRedisService,
  OrderStatus,
  PUBSUB,
  PubSubPort,
  RideOfferRedisSnapshot,
  RideOfferUpdatedName,
  RideOfferUpdatedPayload,
  RideOfferUpdateType,
  RiderActiveOrderUpdateDTO,
  RiderActiveOrderUpdateName,
  RiderOrderUpdateType,
  RiderRedisService,
  TaxiServiceRedisService,
} from '@ridy/database';
import { RequestActivityType } from '@ridy/database';
import { RequestActivityEntity } from '@ridy/database';
import { TaxiOrderEntity } from '@ridy/database';
import { RideOfferRedisService } from '@ridy/database';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { TaxiOrderNoteDTO } from './dto/taxi-order-note.dto';
import { TaxiOrderNoteEntity } from '@ridy/database';
import { TaxiOrderConnectionDTO, TaxiOrderDTOV2 } from './dto/taxi-order.dto';
import { PaginationInput } from '../core/dtos/pagination.input';
import {
  TaxiOrderFilterInput,
  TaxiOrderStatus,
} from './inputs/taxi-order-filter.input';
import { TaxiOrderSortInput } from './inputs/taxi-order-sort.input';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(TaxiOrderEntity)
    private orderRepository: Repository<TaxiOrderEntity>,
    @InjectRepository(RequestActivityEntity)
    private activityRepository: Repository<RequestActivityEntity>,
    @InjectRepository(TaxiOrderNoteEntity)
    private orderNoteRepository: Repository<TaxiOrderNoteEntity>,
    private rideOfferRedisService: RideOfferRedisService,
    private activeOrderRedisService: ActiveOrderCommonRedisService,
    private riderRedisService: RiderRedisService,
    private driverRedisService: DriverRedisService,
    private serviceService: TaxiServiceRedisService,
    @Inject(PUBSUB)
    private readonly pubSub: PubSubPort,
  ) {}

  async cancelOrder(orderId: number): Promise<TaxiOrderEntity> {
    const rideOffer = await this.rideOfferRedisService.getRideOfferMetadata(
      orderId.toString(),
    );
    if (rideOffer) {
      this.activityRepository.insert({
        requestId: parseInt(rideOffer.id),
        type: RequestActivityType.CanceledByOperator,
      });
      await this.orderRepository.update(orderId, {
        status: OrderStatus.Expired,
        finishTimestamp: new Date(),
        costAfterCoupon: 0,
      });
      const order = await this.orderRepository.findOneByOrFail({ id: orderId });
      this.rideOfferRedisService.flushOrders([order.id.toString()]);
      for (const driverId of rideOffer.offeredToDriverIds) {
        this.pubSub.publish<RideOfferUpdatedPayload>(RideOfferUpdatedName, {
          type: RideOfferUpdateType.Revoked,
          orderId: order.id.toString(),
          driverId: driverId,
        });
      }
      return order;
    }

    const activeOrder = await this.activeOrderRedisService.getActiveOrder(
      orderId.toString(),
    );
    if (activeOrder) {
      this.activityRepository.insert({
        requestId: orderId,
        type: RequestActivityType.CanceledByOperator,
      });
      await this.orderRepository.update(orderId, {
        status: OrderStatus.Expired,
        finishTimestamp: new Date(),
        costAfterCoupon: 0,
      });
      this.activeOrderRedisService.deleteOrder(orderId.toString());
      this.pubSub.publish<RiderActiveOrderUpdateDTO>(
        RiderActiveOrderUpdateName,
        {
          type: RiderOrderUpdateType.DriverCancelled,
          orderId: orderId,
          riderId: parseInt(activeOrder.riderId),
        },
      );
      this.pubSub.publish<DriverEventPayload>(DriverEventSubscriptionName, {
        type: DriverEventType.ActiveOrderCompleted,
        orderId: orderId,
        driverId: parseInt(activeOrder.driverId),
      });
    }
    return await this.orderRepository.findOneByOrFail({ id: orderId });
  }

  createTaxiOrderNote(input: {
    staffId: number;
    orderId: number;
    note: string;
  }): Promise<TaxiOrderNoteDTO> {
    this.orderNoteRepository.insert({
      orderId: input.orderId,
      note: input.note,
      staffId: input.staffId,
    });
    return this.orderNoteRepository.findOneOrFail({
      where: { orderId: input.orderId },
      relations: { staff: true },
    });
  }

  async getTaxiOrderSuccessRate(input: {
    startTime?: Date;
    endTime?: Date;
  }): Promise<number | null> {
    const countSuccess = await this.orderRepository.count({
      where: {
        expectedTimestamp:
          input.startTime || input.endTime == null
            ? null
            : Between(input.startTime, input.endTime),
        status: OrderStatus.Finished,
      },
    });
    const countAllOrders = await this.orderRepository.count({
      where: {
        expectedTimestamp:
          input.startTime || input.endTime == null
            ? undefined
            : Between(input.startTime, input.endTime),
      },
    });
    if (countAllOrders == 0) return null;
    return (countSuccess / countAllOrders) * 100;
  }

  async getTaxiOrders(input: {
    paging: PaginationInput; // { first?: number; after?: number }
    filter: TaxiOrderFilterInput & {
      // extend to allow array
      status?: TaxiOrderStatus[];
    };
    sorting: TaxiOrderSortInput;
  }): Promise<TaxiOrderConnectionDTO> {
    const take = (input.paging?.first ?? 10) + 1;
    const skip = input.paging?.after ?? 0;

    // --- Build base where ---
    const where: FindOptionsWhere<TaxiOrderEntity> = {};
    if (input.filter.driverId) where.driverId = input.filter.driverId;
    if (input.filter.riderId) where.riderId = input.filter.riderId;
    if ((input.filter.orderType?.length ?? 0) > 0)
      where.type = In(input.filter.orderType);
    if ((input.filter.fleetId?.length ?? 0) > 0)
      where.fleetId = In(input.filter.fleetId);
    if ((input.filter.serviceId?.length ?? 0) > 0)
      where.serviceId = In(input.filter.serviceId);

    // --- Normalize statuses to an array (or null => all) ---
    const requested: TaxiOrderStatus[] | null =
      input.filter.status == null || input.filter.status.length === 0
        ? null
        : input.filter.status;

    // Map TaxiOrderStatus -> DB OrderStatus (array per item)
    const mapStatusToDb: Record<TaxiOrderStatus, OrderStatus[] | null> = {
      [TaxiOrderStatus.Expired]: [OrderStatus.Expired],
      [TaxiOrderStatus.Canceled]: [
        OrderStatus.RiderCanceled,
        OrderStatus.DriverCanceled,
      ],
      [TaxiOrderStatus.Completed]: [OrderStatus.Finished],
      [TaxiOrderStatus.SearchingForDriver]: [OrderStatus.Requested],
      [TaxiOrderStatus.Scheduled]: [OrderStatus.Booked],
      [TaxiOrderStatus.OnTrip]: [
        OrderStatus.Arrived,
        OrderStatus.Started,
        OrderStatus.DriverAccepted,
        OrderStatus.WaitingForPostPay,
        OrderStatus.WaitingForReview,
      ],
    };

    // If specific statuses were requested, compute DB status set
    if (requested !== null) {
      const dbStatuses = new Set<OrderStatus>();
      for (const s of requested) {
        const mapped = mapStatusToDb[s];
        if (mapped) mapped.forEach((x) => dbStatuses.add(x));
      }

      if (dbStatuses.size === 0) {
        // Caller asked for only live/redis statuses → DB has none ⇒ empty result
        return {
          pageInfo: { hasNextPage: false, hasPreviousPage: skip > 0 },
          totalCount: 0,
          edges: [],
        };
      }

      where.status = In([...dbStatuses]);
    }
    // else: no status filter → all DB rows match other filters

    // --- Query count + page ---
    const [count, rows] = await Promise.all([
      this.orderRepository.count({ where }),
      this.orderRepository.find({
        where,
        order: { id: 'DESC' },
        take,
        skip,
        relations: {
          options: true,
          fleet: true,
          driver: true,
          rider: true,
          service: true,
          savedPaymentMethod: true,
          paymentGateway: true,
        },
      }),
    ]);

    const hasNextPage = rows.length > take - 1;
    const pageRows = hasNextPage ? rows.slice(0, take - 1) : rows;

    return {
      pageInfo: {
        hasNextPage,
        hasPreviousPage: skip > 0,
      },
      totalCount: count,
      edges: await this.mapDbRowsToDTOs(pageRows),
    };
  }

  private async mapRideOffer(
    rideOffer: RideOfferRedisSnapshot,
  ): Promise<TaxiOrderDTOV2> {
    const rider = await this.riderRedisService.getOnlineRider(
      rideOffer.riderId,
    );
    const service = await this.serviceService.getTaxiServiceById(
      rideOffer.serviceId,
    );
    return {
      id: parseInt(rideOffer.id),
      status: OrderStatus.Requested,
      ...rideOffer,
      rider: {
        id: parseInt(rider.id),
        fullName:
          rider.firstName == null && rider.lastName == null
            ? null
            : [rider.firstName, rider.lastName].filter(Boolean).join(' '),
        imageUrl: rider.profileImageUrl,
        mobileNumber: rider.mobileNumber,
      },
      activities: [],
      service: {
        id: service.id,
        name: service.name,
        imageUrl: service.imageAddress,
      },
      fleet: null,
      chatMessages: [],
      driversSentTo: rideOffer.offeredToDriverIds.length,
      waitMinutes: rideOffer.waitMinutes,
      directions: rideOffer.tripDirections,
      totalCost: rideOffer.costEstimateForRider,
    };
  }

  private async mapDbRowsToDTOs(
    orderEntities: TaxiOrderEntity[],
  ): Promise<TaxiOrderDTOV2[]> {
    return Promise.all(orderEntities.map((oe) => this.mapDbRowToDTO(oe)));
  }

  private mapDbRowToDTO(orderEntity: TaxiOrderEntity): TaxiOrderDTOV2 {
    return {
      ...orderEntity,
      createdAt: orderEntity.createdOn,
      paymentMethod: orderEntity.paymentMethod(),
      waypoints: orderEntity.waypoints(),
      driversSentTo: 0,
      activities: orderEntity.activities || [],
      options: orderEntity.options,
      fleet:
        orderEntity.fleet == null
          ? null
          : {
              id: orderEntity.fleet.id,
              name: orderEntity.fleet?.name || 'N/A',
              imageUrl: orderEntity.fleet?.profilePicture.address || 'N/A',
              rating: null,
            },
      rider: {
        id: orderEntity.rider.id,
        fullName:
          orderEntity.rider.firstName == null &&
          orderEntity.rider.lastName == null
            ? null
            : [orderEntity.rider.firstName, orderEntity.rider.lastName]
                .filter(Boolean)
                .join(' '),
        imageUrl: orderEntity.rider.media?.address,
        mobileNumber: orderEntity.rider.mobileNumber,
      },
      driver:
        orderEntity.driver != null
          ? {
              id: orderEntity.driver.id,
              fullName:
                orderEntity.driver.firstName == null &&
                orderEntity.driver.lastName == null
                  ? null
                  : [orderEntity.driver.firstName, orderEntity.driver.lastName]
                      .filter(Boolean)
                      .join(' '),
              imageUrl: orderEntity.driver.media?.address,
              mobileNumber: orderEntity.driver.mobileNumber,
              rating: orderEntity.driver.rating,
              location: null,
              vehicleColor: orderEntity.driver?.carColor?.name,
              vehicleModel: orderEntity.driver?.car?.name,
              vehiclePlate: orderEntity.driver?.carPlate,
            }
          : undefined,
      service: {
        id: orderEntity.service.id,
        name: orderEntity.service.name,
        imageUrl: orderEntity.service.media.address,
      },
      chatMessages: [],
      directions: orderEntity.directions || [],
      totalCost: orderEntity.costAfterCoupon,
    };
  }

  async mapRideOffers(
    rideOffers: RideOfferRedisSnapshot[],
  ): Promise<TaxiOrderDTOV2[]> {
    return Promise.all(rideOffers.map((ro) => this.mapRideOffer(ro)));
  }

  private async mapActiveOrder(
    activeOrder: ActiveOrderRedisSnapshot,
  ): Promise<TaxiOrderDTOV2> {
    const rider = await this.riderRedisService.getOnlineRider(
      activeOrder.riderId,
    );
    const service = await this.serviceService.getTaxiServiceById(
      activeOrder.serviceId,
    );
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      activeOrder.driverId,
    );
    return {
      id: parseInt(activeOrder.id),
      status: OrderStatus.Requested,
      ...activeOrder,
      rider: {
        id: parseInt(rider.id),
        fullName:
          rider.firstName == null && rider.lastName == null
            ? null
            : [rider.firstName, rider.lastName].filter(Boolean).join(' '),
        imageUrl: rider.profileImageUrl,
        mobileNumber: rider.mobileNumber,
      },
      fleet: null,
      waitMinutes: activeOrder.waitMinutes,
      activities: [],
      driver: {
        id: parseInt(driver.id),
        fullName:
          driver.firstName == null && driver.lastName == null
            ? null
            : [driver.firstName, driver.lastName].filter(Boolean).join(' '),
        imageUrl: driver.avatarImageAddress,
        mobileNumber: driver.mobileNumber,
        rating: driver.rating,
        location: driver.location,
        vehicleColor: driver.vehicleColor,
        vehicleModel: driver.vehicleName,
        vehiclePlate: driver.vehiclePlate,
      },
      driversSentTo: 0,
      service: {
        id: service.id,
        name: service.name,
        imageUrl: service.imageAddress,
      },
      chatMessages: [],
      directions: activeOrder.tripDirections,
      totalCost: activeOrder.costEstimateForRider,
    };
  }

  async mapActiveOrders(
    activeOrders: ActiveOrderRedisSnapshot[],
  ): Promise<TaxiOrderDTOV2[]> {
    return Promise.all(activeOrders.map((ao) => this.mapActiveOrder(ao)));
  }

  async getTaxiOrder(id: string): Promise<TaxiOrderDTOV2> {
    const orderId = Number(id);
    const rideOffer = await this.rideOfferRedisService.getRideOfferMetadata(
      orderId.toString(),
    );
    if (rideOffer) return this.mapRideOffer(rideOffer);

    const activeOrder = await this.activeOrderRedisService.getActiveOrder(
      orderId.toString(),
    );
    if (activeOrder) return this.mapActiveOrder(activeOrder);

    const completedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        options: true,
        fleet: true,

        rider: { media: true },
        driver: { media: true, car: true, carColor: true },
        service: { media: true },
      },
    });
    if (completedOrder) return this.mapDbRowToDTO(completedOrder);

    throw new Error('Order not found');
  }
}
