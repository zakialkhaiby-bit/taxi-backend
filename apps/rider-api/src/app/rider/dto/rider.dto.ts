import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { Gender } from '@ridy/database';

@ObjectType('Rider')
export class RiderDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => String, { nullable: true })
  countryIso?: string;
  @Field(() => String, { nullable: false })
  mobileNumber!: string;
  @Field(() => String, { nullable: true })
  firstName!: string | null;
  @Field(() => String, { nullable: true })
  lastName!: string | null;
  @Field(() => String, { nullable: true })
  email!: string | null;
  @Field(() => Gender, { nullable: true })
  gender!: Gender | null;
  @Field(() => String, { nullable: true })
  profileImageUrl!: string | null;
  @Field(() => Float, { nullable: false })
  walletCredit!: number;
  @Field(() => String, { nullable: false })
  currency!: string;
}
