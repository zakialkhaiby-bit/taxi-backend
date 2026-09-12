import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('DriverPerformance')
export class DriverPerformanceDTO {
  @Field(() => Int, { nullable: true })
  rating?: number;

  @Field(() => Int, {
    description:
      "A number between 0 and 100 representing the driver's acceptance rate.",
  })
  acceptanceRate!: number;

  @Field(() => Int)
  totalRides!: number;

  @Field(() => Int)
  distanceTraveled!: number;
}
