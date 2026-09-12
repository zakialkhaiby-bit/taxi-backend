import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('RiderStatistics')
export class RiderStatisticsDTO {
  @Field(() => Int)
  totalRides!: number;

  @Field(() => Int)
  completedRides!: number;

  @Field(() => Int)
  canceledRides!: number;

  @Field(() => Int)
  favoriteDriversCount!: number;

  @Field(() => Int, {
    description: 'Total distance traveled by the rider in meters',
  })
  distanceTraveled!: number;
}
