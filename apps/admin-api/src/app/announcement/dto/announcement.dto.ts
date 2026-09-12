import {
  Authorize,
  FilterableField,
  IDField,
  Relation,
} from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType, Field, GraphQLISODateTime } from '@nestjs/graphql';
import { AnnouncementUserType } from '@ridy/database';
import { AnnouncementAuthorizer } from './announcement.authorizer';
import { AppType } from '@ridy/database';
import { MediaDTO } from '../../upload/media.dto';

@ObjectType('Announcement')
@Authorize(AnnouncementAuthorizer)
@Relation('media', () => MediaDTO, { nullable: true })
export class AnnouncementDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField()
  title: string;
  @FilterableField()
  description: string;
  @Field(() => String, { nullable: true })
  url?: string;
  @Field(() => [AnnouncementUserType], { nullable: false })
  userType: AnnouncementUserType[];
  @FilterableField(() => AppType, { nullable: true })
  appType?: AppType;
  @Field(() => GraphQLISODateTime, { nullable: false })
  startAt: Date;
  @Field(() => GraphQLISODateTime, { nullable: false })
  expireAt: Date;
  @Field(() => ID, { nullable: true })
  mediaId?: number;
}
