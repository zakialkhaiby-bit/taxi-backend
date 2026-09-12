import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Point } from '@ridy/database';
import { PaymentMode } from '@ridy/database';
import { TaxiOrderType } from '@ridy/database';
import { DeliveryContactDTO } from '@ridy/database';

@InputType()
export class WaypointInput {
  @Field(() => Point, { nullable: false })
  point!: Point;
  @Field(() => String, { nullable: false })
  address!: string;
  @Field(() => DeliveryContactDTO, {
    nullable: true,
    description:
      'Contact information. Only applicable to Parcel Delivery Orders',
  })
  deliveryContact?: DeliveryContactDTO;
}

@InputType()
export class CreateOrderInput {
  @Field(() => Int, { nullable: false })
  serviceId!: number;
  @Field(() => TaxiOrderType, { defaultValue: TaxiOrderType.Ride })
  orderType!: TaxiOrderType;
  @Field(() => [WaypointInput], { nullable: false })
  waypoints!: WaypointInput[];
  @Field(() => Int, { nullable: true })
  intervalMinutes!: number;
  @Field(() => Boolean, { nullable: true })
  twoWay?: boolean;
  @Field(() => Int, { nullable: true })
  waitTime?: number;
  @Field(() => [String], { nullable: true })
  optionIds?: string[];
  @Field(() => String, { nullable: true })
  couponCode?: string;
  @Field(() => PaymentMode, { nullable: true })
  paymentMode?: PaymentMode;
  @Field(() => ID, { nullable: true })
  paymentMethodId?: number;
}
