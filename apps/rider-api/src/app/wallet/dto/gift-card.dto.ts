import { ID, ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType('GiftCard')
export class GiftCardDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => Float, { nullable: false })
  amount!: number;
  @Field(() => String, { nullable: false })
  currency!: string;
}
