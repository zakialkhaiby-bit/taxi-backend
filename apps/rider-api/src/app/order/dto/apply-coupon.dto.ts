import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType('ApplyCouponResponse')
export class ApplyCouponResponseDTO {
  @Field(() => Float)
  couponDiscount?: number;

  @Field(() => Float)
  totalCost!: number;
}
