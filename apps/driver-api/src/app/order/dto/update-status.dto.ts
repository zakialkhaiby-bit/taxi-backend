import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { OrderStatus, WaypointBase, Point } from '@ridy/database';

@ObjectType('UpdateStatus')
export class UpdateStatusDTO {
  @Field(() => ID)
  orderId!: number;
  @Field(() => OrderStatus)
  status!: OrderStatus;

  @Field(() => WaypointBase, { nullable: true })
  nextDestination?: WaypointBase | null;

  @Field(() => [Point], { nullable: true })
  directions?: Point[] | null;

  @Field(() => Float, { nullable: true })
  totalCost?: number | null;
}
