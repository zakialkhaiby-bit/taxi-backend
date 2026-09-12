import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import {
  OrderStatus,
  PaymentMethodBase,
  Point,
  RideOptionDTO,
  TaxiOrderType,
  WaypointBase,
} from '@ridy/database';
import { ChatMessageDTO } from '@ridy/database';

@ObjectType('ActiveOrderRider')
export class ActiveOrderRiderDTO {
  @Field(() => String, { nullable: true })
  fullName?: string | null;
  @Field(() => ID, { nullable: true })
  profileImageUrl?: string | null;
  @Field(() => String, { nullable: true })
  mobileNumber!: string | null;
}

@ObjectType('ActiveOrder')
export class ActiveOrderDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => TaxiOrderType)
  type!: TaxiOrderType;
  @Field(() => Int, { nullable: true })
  waitMinutes?: number;
  @Field(() => String)
  currency!: string;
  @Field(() => ActiveOrderRiderDTO, { nullable: true })
  rider?: ActiveOrderRiderDTO;
  @Field(() => GraphQLISODateTime, { nullable: false })
  createdAt!: Date;
  @Field(() => Int, { description: 'Estimated distance in meters' })
  estimatedDistance!: number;
  @Field(() => Int, { description: 'Estimated duration in seconds' })
  estimatedDuration!: number;
  @Field(() => GraphQLISODateTime, { nullable: true })
  scheduledAt?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  pickupEta?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  dropoffEta?: Date;
  @Field(() => OrderStatus)
  status!: OrderStatus;
  @Field(() => String, { nullable: false })
  serviceName!: string;
  @Field(() => String, { nullable: false })
  serviceImageAddress!: string;
  @Field(() => [ChatMessageDTO])
  chatMessages!: ChatMessageDTO[];
  @Field(() => [RideOptionDTO])
  options!: RideOptionDTO[];
  @Field(() => [WaypointBase])
  waypoints!: WaypointBase[];
  @Field(() => Float, { nullable: false })
  totalCost!: number;
  @Field(() => PaymentMethodBase)
  paymentMethod!: PaymentMethodBase;
  @Field(() => Float, { nullable: true })
  couponDiscount?: number;
  @Field(() => [Point], { defaultValue: [] })
  directions!: Point[];
  @Field(() => Int, { defaultValue: 0 })
  unreadMessagesCount!: number;
  @Field(() => WaypointBase, { nullable: true })
  nextDestination?: WaypointBase;
}
