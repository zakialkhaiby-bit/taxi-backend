import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AppType } from '@ridy/database';

@ObjectType('OrderVolumeByApp')
export class OrderVolumeTimeSeries {
  @Field(() => AppType)
  app: AppType;

  @Field(() => [OrderVolumeBucket])
  buckets: OrderVolumeBucket[];
}

@ObjectType()
export class OrderVolumeBucket {
  @Field(() => String)
  date: string;

  @Field(() => Int)
  orderCount: number;
}
