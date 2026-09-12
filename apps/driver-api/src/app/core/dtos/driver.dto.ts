import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { IDField } from '@ptc-org/nestjs-query-graphql';
import { DriverStatus } from '@ridy/database';

@ObjectType('Driver')
export class DriverDTO {
  @IDField(() => ID)
  id!: number;
  @Field(() => String)
  firstName!: string;
  @Field(() => String)
  lastName!: string;
  @Field(() => String)
  profileImageUrl!: string;
  @Field(() => String)
  mobileNumber!: string;
  @Field(() => DriverStatus)
  status!: DriverStatus;
  @Field(() => Float, { nullable: true })
  walletCredit!: number;
  @Field(() => String)
  currency!: string;
  @Field(() => Int, { nullable: true })
  searchDistance!: number | null;
}
