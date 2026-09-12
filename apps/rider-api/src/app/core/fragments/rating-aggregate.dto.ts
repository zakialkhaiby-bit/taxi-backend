import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('RatingAggregate')
@InputType('RatingAggregateInput')
export class RatingAggregateDTO {
  @Field(() => Int, { nullable: true })
  rating?: number;
  @Field(() => Int)
  reviewCount!: number;
}
