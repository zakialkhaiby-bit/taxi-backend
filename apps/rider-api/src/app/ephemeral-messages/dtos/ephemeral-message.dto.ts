import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { RiderEphemeralMessageType } from '@ridy/database';

registerEnumType(RiderEphemeralMessageType, {
  name: 'EphemeralMessageType',
});

@ObjectType('EphemeralMessage')
export class EphemeralMessageDTO {
  @Field(() => RiderEphemeralMessageType)
  type!: RiderEphemeralMessageType;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;

  @Field(() => ID)
  orderId!: number;

  @Field(() => String, { nullable: true })
  driverFullName!: string | null;

  @Field(() => String, { nullable: true })
  driverProfileUrl!: string | null;

  @Field(() => String, { nullable: true })
  serviceName!: string | null;

  @Field(() => String, { nullable: true })
  serviceImageUrl!: string | null;

  @Field(() => String, { nullable: true })
  vehicleName!: string | null;
}
