import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('OrderCancelReason')
export class OrderCancelReasonDTO {
  @Field(() => ID)
  id!: number;
  @Field()
  title!: string;
}
