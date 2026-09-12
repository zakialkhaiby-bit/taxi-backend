import { ObjectType, Field, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType('Announcement')
export class AnnouncementDTO {
  @Field(() => GraphQLISODateTime, { nullable: true })
  startAt?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  expireAt?: Date;
  @Field(() => String, { nullable: false })
  title!: string;
  @Field(() => String, { nullable: false })
  description!: string;
  @Field(() => String, { nullable: true })
  url?: string;
}
