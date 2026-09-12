import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType('RiderWallet')
export class RiderWalletDTO {
  @Field(() => Float, { nullable: false })
  balance!: number;
  @Field(() => String, { nullable: false })
  currency!: string;
}
