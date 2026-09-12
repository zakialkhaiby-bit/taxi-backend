import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { DriverEphemeralMessageType } from '@ridy/database';

registerEnumType(DriverEphemeralMessageType, {
  name: 'EphemeralMessageType',
});

@ObjectType('EphemeralMessage')
export class EphemeralMessageDTO {
  @Field(() => DriverEphemeralMessageType)
  type!: DriverEphemeralMessageType;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;

  @Field(() => ID)
  orderId!: number;

  @Field(() => String, { nullable: true })
  riderFullName!: string | null;

  @Field(() => String, { nullable: true })
  riderProfileUrl!: string | null;

  @Field(() => String, { nullable: true })
  serviceName!: string | null;

  @Field(() => String, { nullable: true })
  serviceImageUrl!: string | null;
}
