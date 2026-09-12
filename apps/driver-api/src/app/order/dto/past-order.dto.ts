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
  PaymentMode,
  PlaceDTO,
  Point,
  RideOptionDTO,
  TaxiOrderType,
} from '@ridy/database';

@ObjectType('PastOrderRider')
export class PastOrderRiderDTO {
  @Field(() => String, { nullable: true })
  firstName?: string;
  @Field(() => String, { nullable: true })
  profileImageUrl?: string;
}

@ObjectType('PastOrder')
export class PastOrderDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => TaxiOrderType)
  type!: TaxiOrderType;
  @Field(() => PastOrderRiderDTO)
  rider!: PastOrderRiderDTO;
  @Field(() => Int, { nullable: true })
  waitMinutes?: number;
  @Field(() => String)
  currency!: string;
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
  @Field(() => [PlaceDTO])
  waypoints!: PlaceDTO[];
  @Field(() => Float, { nullable: false })
  totalCost!: number;
  @Field(() => PaymentMode, { nullable: false })
  paymentMode!: PaymentMode;
  @Field(() => [Point], { defaultValue: [] })
  directions!: Point[];
}
