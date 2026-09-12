import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('UpdateOrderWaitTimeResponse')
export class UpdateOrderWaitTimeResponseDTO {
  @Field(() => Int, { nullable: true })
  waitTime?: number;

  @Field(() => Float)
  totalCost!: number;
}
