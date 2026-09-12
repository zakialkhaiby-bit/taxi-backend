import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class UpdateDriverOfferFilterInput {
  @Field(() => [ID], { nullable: true })
  serviceIds?: number[];
  @Field(() => Int, { nullable: true })
  searchDistance?: number;
}
