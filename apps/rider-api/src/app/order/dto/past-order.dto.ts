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
import { PastOrderDriverDTO } from '../../core/dtos/past-order-driver.dto';

@ObjectType('PastOrder')
export class PastOrderDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => TaxiOrderType)
  type!: TaxiOrderType;
  @Field(() => Int, { nullable: true })
  waitMinutes?: number;
  @Field(() => String)
  currency!: string;
  @Field(() => PastOrderDriverDTO, { nullable: true })
  driver?: PastOrderDriverDTO | null;
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
  @Field(() => [RideOptionDTO])
  options!: RideOptionDTO[];
  @Field(() => [WaypointBase])
  waypoints!: WaypointBase[];
  @Field(() => Float, { nullable: false })
  totalCost!: number;
  @Field(() => PaymentMethodBase, { nullable: false })
  paymentMethod!: PaymentMethodBase;
  @Field(() => Float, { nullable: true })
  couponDiscount!: number | null;
  @Field(() => [Point], { defaultValue: [] })
  directions!: Point[];
}
