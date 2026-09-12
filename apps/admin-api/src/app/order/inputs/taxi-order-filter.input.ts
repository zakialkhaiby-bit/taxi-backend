import { Field, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { TaxiOrderType } from '@ridy/database';

export enum TaxiOrderStatus {
  SearchingForDriver = 'searching_for_driver',
  OnTrip = 'on_trip',
  Scheduled = 'scheduled',
  Completed = 'completed',
  Canceled = 'canceled',
  Expired = 'expired',
}
registerEnumType(TaxiOrderStatus, {
  name: 'TaxiOrderStatus',
});

@InputType()
export class TaxiOrderFilterInput {
  @Field(() => [TaxiOrderStatus], { nullable: true })
  status?: TaxiOrderStatus[];

  @Field(() => ID, { nullable: true })
  driverId?: number;

  @Field(() => ID, { nullable: true })
  riderId?: number;

  @Field(() => [TaxiOrderType], { nullable: true })
  orderType?: TaxiOrderType[];

  @Field(() => [ID], { nullable: true })
  fleetId?: number[];

  @Field(() => [ID], { nullable: true })
  serviceId?: number[];
}
