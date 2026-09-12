import { ID, ObjectType, Field, GraphQLISODateTime } from '@nestjs/graphql';
import { MessageStatus } from '@ridy/database';

@ObjectType('OrderMessage')
export class OrderMessageDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => GraphQLISODateTime, { nullable: false })
  sentAt!: Date;
  @Field(() => MessageStatus, { nullable: false })
  status!: MessageStatus;
  @Field(() => String, { nullable: false })
  content!: string;
  @Field(() => Boolean, { nullable: false })
  sentByDriver!: boolean;
  @Field(() => ID)
  requestId!: number;
}
