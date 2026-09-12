import { IDField } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Media')
export class MediaDTO {
  @IDField(() => ID)
  id!: number;
  @Field(() => String)
  address!: string;
  @Field(() => String, { nullable: true })
  base64?: string;
}
