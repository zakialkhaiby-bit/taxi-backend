import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { IDField } from '@ptc-org/nestjs-query-graphql';
import {
  ChatMessageDTO,
  OrderStatus,
  PaymentMethodBase,
  Point,
  RideOptionDTO,
  TaxiOrderType,
  WaypointBase,
} from '@ridy/database';
import { PageInfoDTO } from '../../core/dtos/page-info.dto';
import { RequestActivityDTO } from './request-activity.dto';

@ObjectType('TaxiOrderService')
export class TaxiOrderServiceDTO {
  @Field(() => ID)
  id: number;
  @Field(() => String)
  name: string;
  @Field(() => String)
  imageUrl: string;
}

@ObjectType('ActiveTaxiOrderRider')
export class TaxiOrderRiderDTO {
  @Field(() => ID)
  id: number;
  @Field(() => String)
  fullName: string;
  @Field(() => String, { nullable: true })
  imageUrl: string;
  @Field(() => Int, { nullable: true })
  rating?: number;
  @Field(() => String)
  mobileNumber: string;
}

@ObjectType('ActiveTaxiOrderFleet')
export class TaxiOrderFleetDTO {
  @Field(() => ID)
  id: number;
  @Field(() => String)
  name: string;
  @Field(() => String, { nullable: true })
  imageUrl: string;
  @Field(() => Int, { nullable: true })
  rating!: number | null;
}

@ObjectType('TaxiOrderDriver')
export class TaxiOrderDriverDTO {
  @Field(() => ID)
  id: number;
  @Field(() => String)
  fullName: string;
  @Field(() => Int, { nullable: true })
  rating!: number | null;
  @Field(() => String, { nullable: true })
  imageUrl?: string;
  @Field(() => Point, { nullable: true })
  location: Point | null;
  @Field(() => String)
  mobileNumber: string;

  @Field(() => String, { nullable: true })
  vehicleModel: string | null;

  @Field(() => String, { nullable: true })
  vehicleColor: string | null;

  @Field(() => String, { nullable: true })
  vehiclePlate: string | null;
}

@ObjectType('TaxiOrder')
export class TaxiOrderDTOV2 {
  @IDField(() => ID)
  id: number;
  @Field(() => TaxiOrderDriverDTO, { nullable: true })
  driver?: TaxiOrderDriverDTO;
  @Field(() => TaxiOrderRiderDTO)
  rider: TaxiOrderRiderDTO;
  @Field(() => TaxiOrderServiceDTO)
  service: TaxiOrderServiceDTO;
  @Field(() => GraphQLISODateTime)
  createdAt: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  scheduledAt?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  pickupEta?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  dropoffEta?: Date;
  @Field(() => OrderStatus)
  status: OrderStatus;
  @Field(() => String)
  currency: string;
  @Field(() => TaxiOrderType)
  type: TaxiOrderType;
  @Field(() => Float, { nullable: true })
  couponDiscount?: number;
  @Field(() => [Point])
  directions: Point[];
  @Field(() => PaymentMethodBase)
  paymentMethod: PaymentMethodBase;
  @Field(() => Float)
  totalCost: number;
  @Field(() => Int, { nullable: true })
  waitMinutes!: number | null;
  @Field(() => TaxiOrderFleetDTO, { nullable: true })
  fleet!: TaxiOrderFleetDTO | null;
  @Field(() => [WaypointBase])
  waypoints: WaypointBase[];
  @Field(() => [RideOptionDTO])
  options: RideOptionDTO[];
  @Field(() => [ChatMessageDTO])
  chatMessages: ChatMessageDTO[];
  @Field(() => [RequestActivityDTO])
  activities: RequestActivityDTO[];
  @Field(() => Int)
  driversSentTo: number;
}

@ObjectType('ActiveOrderConnection')
export class TaxiOrderConnectionDTO {
  @Field(() => [TaxiOrderDTOV2])
  edges: TaxiOrderDTOV2[];

  @Field(() => PageInfoDTO)
  pageInfo: PageInfoDTO;

  @Field(() => Int)
  totalCount: number;
}
