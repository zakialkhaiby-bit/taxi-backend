import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('PastOrderDriver')
export class PastOrderDriverDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => String, { nullable: true })
  fullName?: string | null;
  @Field(() => ID, { nullable: true })
  profileImageUrl?: string;
  @Field(() => Int, {
    nullable: true,
    description: 'Driver Rating. Between 0 to 100',
  })
  rating?: number;
  @Field(() => String, { nullable: true })
  mobileNumber!: string;
  @Field(() => String, { nullable: true })
  vehicleName?: string;
  @Field(() => String, { nullable: true })
  vehicleColor?: string;
  @Field(() => String, { nullable: true })
  vehiclePlate?: string;
}
