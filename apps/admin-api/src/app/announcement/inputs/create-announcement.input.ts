import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@ridy/database';
import { AppType } from '@ridy/database';

@InputType()
export class CreateAnnouncementInput {
  @Field(() => String)
  title: string;
  @Field(() => String, { nullable: true })
  description?: string;
  @Field(() => String, { nullable: true })
  url?: string;
  @Field(() => AppType, { nullable: true })
  appType?: AppType;
  @Field(() => [AnnouncementUserType], { nullable: true })
  userType?: AnnouncementUserType[];
  @Field(() => GraphQLISODateTime, { nullable: true })
  startAt?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  expireAt?: Date;
  @Field(() => ID, { nullable: true })
  mediaId?: number;
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  pushNotification: boolean;
  @Field(() => String, { nullable: true })
  pushNotificationTitle?: string;
  @Field(() => String, { nullable: true })
  pushNotificationBody?: string;
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  smsNotification: boolean;
  @Field(() => String, { nullable: true })
  smsNotificationBody?: string;
}
