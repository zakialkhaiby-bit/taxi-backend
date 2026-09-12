import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PageInformation')
export class PageInfoDTO {
  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Boolean)
  hasPreviousPage: boolean;
}
